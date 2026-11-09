/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { pl } from './i18n/pl'
import { BACKGROUND_SYNC_TAG, pushOutbox, type PostOperations } from './sync/push'

declare const self: ServiceWorkerGlobalScope

// Share target arrives with its step.

// A new version waits until the user chooses to refresh, so nothing reloads mid-typing.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Open every in-app URL offline from the cached shell, but leave server routes alone.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api(\/|$)/, /^\/sanctum(\/|$)/, /^\/s(\/|$)/],
  }),
)

const XSRF_COOKIE = 'XSRF-TOKEN'

// A worker has no document.cookie. Not in TypeScript's lib yet; Chrome on Android has it.
const { cookieStore } = self as unknown as {
  cookieStore?: { get(name: string): Promise<{ value: string } | null> }
}

async function csrfToken(): Promise<string | undefined> {
  if (!(await cookieStore?.get(XSRF_COOKIE))) {
    await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' })
  }
  const cookie = await cookieStore?.get(XSRF_COOKIE)
  return cookie ? decodeURIComponent(cookie.value) : undefined
}

async function post(path: string, body: unknown) {
  const token = await csrfToken()
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': token } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response
}

const postOperations: PostOperations = async (ops) => (await post('/api/sync/push', { ops })).json()

interface PushPayload {
  title: string
  body?: string
  url?: string
  reminder_id?: string
  badge?: number
}

const NOTIFICATION_ICON = '/app-icons/pwa-192x192.png'
const SNOOZE_MINUTES = 60

self.addEventListener('push', (event) => {
  const payload = event.data?.json() as PushPayload | undefined
  if (!payload) {
    return
  }

  const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
    body: payload.body,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    // A repeat of the same reminder replaces the old notification instead of piling up.
    tag: payload.reminder_id,
    data: payload,
    actions: payload.reminder_id
      ? [
          { action: 'done', title: pl.notifications.done },
          { action: 'snooze', title: pl.notifications.snooze },
        ]
      : [],
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, options),
      payload.badge === undefined
        ? undefined
        : navigator.setAppBadge?.(payload.badge).catch(() => {}),
    ]),
  )
})

async function openApp(url: string) {
  const [open] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (open) {
    await open.focus()
    return
  }
  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { reminder_id: reminderId, url } = (event.notification.data ?? {}) as PushPayload
  const answer = reminderId
    ? event.action === 'snooze'
      ? post(`/api/reminders/${reminderId}/snooze`, { minutes: SNOOZE_MINUTES })
      : post(`/api/reminders/${reminderId}/dismiss`, {})
    : Promise.resolve()

  event.waitUntil(
    Promise.all([
      // Offline, the answer is lost and the reminder simply stays unanswered in the app.
      answer.catch(() => {}),
      event.action ? undefined : openApp(url ?? '/'),
    ]),
  )
})

interface BackgroundSyncEvent extends ExtendableEvent {
  readonly tag: string
}

// Only sends: pulling and handling an ended session wait until the app is open again.
self.addEventListener('sync', ((event: BackgroundSyncEvent) => {
  if (event.tag !== BACKGROUND_SYNC_TAG) {
    return
  }

  event.waitUntil(
    pushOutbox(postOperations).catch((error: unknown) => {
      // fetch() throws TypeError when there is no network: rejecting makes the browser retry.
      // Any other failure can't be fixed by retrying here, and the app reports it when opened.
      if (error instanceof TypeError) {
        throw error
      }
    }),
  )
}) as EventListener)
