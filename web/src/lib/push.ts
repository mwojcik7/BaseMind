import { api } from '@/lib/api'
import { describeDevice } from '@/lib/device'

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

function isSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription() {
  if (!isSupported()) {
    return null
  }
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** VAPID keys come as URL-safe base64; the browser wants the raw bytes. */
export function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

export async function getPushState(): Promise<PushState> {
  if (!isSupported()) {
    return 'unsupported'
  }
  if (Notification.permission === 'denied') {
    return 'denied'
  }
  return (await currentSubscription()) ? 'on' : 'off'
}

/** Call from a tap: browsers refuse to ask for permission without one. */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return permission === 'denied' ? 'denied' : 'off'
  }

  const { key } = await api.get<{ key: string }>('/api/push/public-key')
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(key),
    }))

  await api.post('/api/push/subscriptions', {
    ...subscription.toJSON(),
    device_name: describeDevice(navigator.userAgent),
  })

  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const subscription = await currentSubscription()
  if (subscription) {
    await api.delete('/api/push/subscriptions', { endpoint: subscription.endpoint })
    await subscription.unsubscribe()
  }
  return 'off'
}

/**
 * After signing out. Only the browser's side: the server already stops sending
 * once the session is gone, and it can't be asked to do anything without one.
 */
export async function forgetPushSubscription() {
  try {
    await (await currentSubscription())?.unsubscribe()
  } catch {
    // The server has stopped sending anyway.
  }
}
