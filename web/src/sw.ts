/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { BACKGROUND_SYNC_TAG, pushOutbox, type PostOperations } from './sync/push'

declare const self: ServiceWorkerGlobalScope

// Push notifications and share target arrive with their steps.
void self.skipWaiting()
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

const postOperations: PostOperations = async (ops) => {
  const token = await csrfToken()
  const response = await fetch('/api/sync/push', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': token } : {}),
    },
    body: JSON.stringify({ ops }),
  })

  if (!response.ok) {
    throw new Error(`Push failed with status ${response.status}`)
  }
  return response.json()
}

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
