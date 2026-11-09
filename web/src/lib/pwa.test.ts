import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissInstall,
  dismissUpdate,
  install,
  offerUpdate,
  startInstallTracking,
  usePwa,
  watchForUpdates,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa'

function installEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent
  event.prompt = vi.fn(async () => {})
  event.userChoice = Promise.resolve({ outcome })
  return event
}

function pretendToBe(userAgent: string, maxTouchPoints = 0) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  // Missing from jsdom, so it can't be spied on.
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true })
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1'
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'

describe('pwa', () => {
  beforeEach(() => {
    usePwa.setState({ applyUpdate: null, installPrompt: null, showIosInstructions: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('installing', () => {
    // Listeners stay on the window between tests, and any of them handles the event the same.
    beforeEach(() => startInstallTracking())

    it('holds back the browser prompt and offers its own', () => {
      const event = installEvent()

      window.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(usePwa.getState().installPrompt).toBe(event)
    })

    it('shows the system dialog and uses the event only once', async () => {
      const event = installEvent()
      window.dispatchEvent(event)

      await install()

      expect(event.prompt).toHaveBeenCalledOnce()
      expect(usePwa.getState().installPrompt).toBeNull()
    })

    it('does not offer again for a while after declining in the system dialog', async () => {
      window.dispatchEvent(installEvent('dismissed'))
      await install()

      window.dispatchEvent(installEvent())

      expect(usePwa.getState().installPrompt).toBeNull()
    })

    it('does not offer again for a while after closing the banner', () => {
      window.dispatchEvent(installEvent())
      dismissInstall()

      window.dispatchEvent(installEvent())

      expect(usePwa.getState().installPrompt).toBeNull()
    })

    it('offers again after 30 days', () => {
      localStorage.setItem(
        'basemind.install-dismissed',
        String(Date.now() - 31 * 24 * 60 * 60 * 1000),
      )

      window.dispatchEvent(installEvent())

      expect(usePwa.getState().installPrompt).not.toBeNull()
    })

    it('stops offering once installed', () => {
      window.dispatchEvent(installEvent())

      window.dispatchEvent(new Event('appinstalled'))

      expect(usePwa.getState().installPrompt).toBeNull()
    })
  })

  describe('iOS instructions', () => {
    it('appear on an iPhone', () => {
      pretendToBe(IPHONE)

      startInstallTracking()

      expect(usePwa.getState().showIosInstructions).toBe(true)
    })

    it('recognise an iPad presenting itself as a Mac', () => {
      pretendToBe(IPAD, 5)

      startInstallTracking()

      expect(usePwa.getState().showIosInstructions).toBe(true)
    })

    it('do not appear on a real Mac', () => {
      pretendToBe(IPAD, 0)

      startInstallTracking()

      expect(usePwa.getState().showIosInstructions).toBe(false)
    })

    it('do not appear once the app is installed', () => {
      pretendToBe(IPHONE)
      Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })

      startInstallTracking()

      expect(usePwa.getState().showIosInstructions).toBe(false)
      delete (navigator as Navigator & { standalone?: boolean }).standalone
    })

    it('stay hidden after being closed', () => {
      pretendToBe(IPHONE)
      startInstallTracking()

      dismissInstall()
      startInstallTracking()

      expect(usePwa.getState().showIosInstructions).toBe(false)
    })
  })

  describe('updates', () => {
    it('are offered and can be put off for this visit', () => {
      const apply = vi.fn()

      offerUpdate(apply)
      expect(usePwa.getState().applyUpdate).toBe(apply)

      dismissUpdate()
      expect(usePwa.getState().applyUpdate).toBeNull()
      expect(apply).not.toHaveBeenCalled()
    })

    it('are checked on returning to the app, at most once an hour', () => {
      vi.useFakeTimers()
      const update = vi.fn(async () => undefined as never)
      const stop = watchForUpdates({ update })
      const returnToApp = () => document.dispatchEvent(new Event('visibilitychange'))

      returnToApp()
      expect(update).not.toHaveBeenCalled()

      vi.setSystemTime(Date.now() + 61 * 60 * 1000)
      returnToApp()
      expect(update).toHaveBeenCalledOnce()

      returnToApp()
      expect(update).toHaveBeenCalledOnce()
      stop()
    })

    it('survive a failed check while offline', async () => {
      vi.useFakeTimers()
      const update = vi.fn(() => Promise.reject(new TypeError('offline')))
      const stop = watchForUpdates({ update })

      vi.setSystemTime(Date.now() + 61 * 60 * 1000)
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()

      expect(update).toHaveBeenCalledOnce()
      stop()
    })
  })
})
