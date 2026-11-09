import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  decodeBase64Url,
  disablePush,
  enablePush,
  forgetPushSubscription,
  getPushState,
} from '@/lib/push'

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc'

function fakeSubscription() {
  return {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: vi.fn(async () => true),
  }
}

describe('push notifications', () => {
  const fetchMock = vi.fn<typeof fetch>()
  let existing: ReturnType<typeof fakeSubscription> | null
  let subscribe: ReturnType<typeof vi.fn>
  let permission: NotificationPermission

  function installBrowserApis() {
    const registration = {
      pushManager: { getSubscription: async () => existing, subscribe },
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve(registration), getRegistration: async () => registration },
    })
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', {
      get permission() {
        return permission
      },
      requestPermission: async () => permission,
    })
  }

  const sent = (path: string) => fetchMock.mock.calls.find(([input]) => input === path)

  beforeEach(() => {
    existing = null
    permission = 'default'
    subscribe = vi.fn(async () => fakeSubscription())
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (input) =>
      String(input) === '/api/push/public-key'
        ? new Response(JSON.stringify({ key: 'AQID' }), {
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=token; path=/'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
  })

  it('decodes URL-safe base64 keys', () => {
    expect([...decodeBase64Url('AQID')]).toEqual([1, 2, 3])
    expect([...decodeBase64Url('-_8')]).toEqual([251, 255])
  })

  it('reports browsers without support', async () => {
    expect(await getPushState()).toBe('unsupported')
    await expect(forgetPushSubscription()).resolves.toBeUndefined()
  })

  it('reports the state on this device', async () => {
    installBrowserApis()
    expect(await getPushState()).toBe('off')

    existing = fakeSubscription()
    expect(await getPushState()).toBe('on')

    permission = 'denied'
    expect(await getPushState()).toBe('denied')
  })

  it('subscribes and registers the device with the server', async () => {
    installBrowserApis()
    permission = 'granted'

    expect(await enablePush()).toBe('on')

    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    })
    expect(JSON.parse(String(sent('/api/push/subscriptions')?.[1]?.body))).toMatchObject({
      endpoint: ENDPOINT,
      keys: { p256dh: 'p', auth: 'a' },
    })
  })

  it('registers an existing browser subscription again instead of creating a new one', async () => {
    installBrowserApis()
    permission = 'granted'
    existing = fakeSubscription()

    await enablePush()

    expect(subscribe).not.toHaveBeenCalled()
    expect(sent('/api/push/subscriptions')).toBeDefined()
  })

  it('does nothing further when permission is refused', async () => {
    installBrowserApis()
    permission = 'denied'

    expect(await enablePush()).toBe('denied')

    expect(subscribe).not.toHaveBeenCalled()
    expect(sent('/api/push/subscriptions')).toBeUndefined()
  })

  it('removes the device on both sides when turned off', async () => {
    installBrowserApis()
    const subscription = fakeSubscription()
    existing = subscription

    expect(await disablePush()).toBe('off')

    expect(JSON.parse(String(sent('/api/push/subscriptions')?.[1]?.body))).toEqual({
      endpoint: ENDPOINT,
    })
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
  })

  it('stays subscribed if the server could not be told', async () => {
    installBrowserApis()
    const subscription = fakeSubscription()
    existing = subscription
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(disablePush()).rejects.toThrow()

    expect(subscription.unsubscribe).not.toHaveBeenCalled()
  })

  it('forgets the browser subscription after signing out, without calling the server', async () => {
    installBrowserApis()
    const subscription = fakeSubscription()
    existing = subscription

    await forgetPushSubscription()

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
