/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { pl } from './i18n/pl'
import { BACKGROUND_SYNC_TAG, pushOutbox, SYNC_NOW_MESSAGE, type PostOperations } from './sync/push'

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

class RequestError extends Error {
  readonly response: Response

  constructor(response: Response) {
    super(`Request failed with status ${response.status}`)
    this.response = response
  }
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
    throw new RequestError(response)
  }
  return response
}

const postOperations: PostOperations = async (ops, deviceId) =>
  (await post('/api/sync/push', { ops, device_id: deviceId })).json()

interface PushPayload {
  title: string
  body?: string
  url?: string
  reminder_id?: string
  /** What the reminder is about, e.g. 'tasks' or 'events'. */
  entity_type?: string | null
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
          // An event can't be done: the same button only notes the reminder.
          {
            action: 'done',
            title: payload.entity_type === 'events' ? pl.notifications.ok : pl.notifications.done,
          },
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

/** Like openApp, but an open window is also taken to `url`. */
async function openAppAt(url: string) {
  const [open] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (open) {
    await open.focus()
    // Fails for a window this worker doesn't control yet; a new one is opened instead.
    if (await open.navigate(url).catch(() => null)) {
      return
    }
  }
  await self.clients.openWindow(url)
}

/**
 * The Done button. A task with open subtasks is left as it is (409): the app opens on it
 * and asks what to do with them, which a notification can't.
 */
async function answerDone(reminderId: string) {
  try {
    await post(`/api/reminders/${reminderId}/dismiss`, { done: true })
  } catch (error) {
    if (error instanceof RequestError && error.response.status === 409) {
      const { task_id: taskId } = (await error.response.json()) as { task_id: string }
      await openAppAt(`/tasks/${encodeURIComponent(taskId)}?complete=1`)
      return
    }
    throw error
  }
}

/** Answering from the notification doesn't touch the app, which would wait for its next sync. */
async function tellOpenAppsToSync() {
  const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  open.forEach((client) => client.postMessage({ type: SYNC_NOW_MESSAGE }))
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { reminder_id: reminderId, url } = (event.notification.data ?? {}) as PushPayload
  const answer = !reminderId
    ? Promise.resolve()
    : event.action === 'snooze'
      ? post(`/api/reminders/${reminderId}/snooze`, { minutes: SNOOZE_MINUTES })
      : event.action === 'done'
        ? answerDone(reminderId)
        : // Tapping the notification itself only answers it; just the button finishes the task.
          post(`/api/reminders/${reminderId}/dismiss`, { done: false })

  event.waitUntil(
    Promise.all([
      // Offline, the answer is lost and the reminder simply stays unanswered in the app.
      answer.then(tellOpenAppsToSync).catch(() => {}),
      // A reminder opens on the thing it is about; anything else just brings the app up.
      event.action ? undefined : url && url !== '/' ? openAppAt(url) : openApp('/'),
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
