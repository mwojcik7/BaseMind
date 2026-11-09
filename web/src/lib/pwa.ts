import { create } from 'zustand'

/** Chromium's install event; not in TypeScript's DOM types. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaState {
  /** Set while a new version is waiting. Calling it reloads into that version. */
  applyUpdate: (() => void) | null
  installPrompt: BeforeInstallPromptEvent | null
  showIosInstructions: boolean
}

export const usePwa = create<PwaState>(() => ({
  applyUpdate: null,
  installPrompt: null,
  showIosInstructions: false,
}))

const DISMISSED_KEY = 'basemind.install-dismissed'
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000
const UPDATE_CHECK_EVERY_MS = 60 * 60 * 1000

function wasDismissedRecently(now = Date.now()) {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY))
    return dismissedAt > 0 && now - dismissedAt < DISMISS_FOR_MS
  } catch {
    return false
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  } catch {
    // The banner simply comes back next time.
  }
}

function isInstalled() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

function isIos() {
  // iPads present themselves as Macs, but Macs have no touch screen.
  const { userAgent, maxTouchPoints } = navigator
  return /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1)
}

/** Call once before the first render: browsers can send the install event very early. */
export function startInstallTracking() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // Our own banner replaces the browser's.
    if (!wasDismissedRecently()) {
      usePwa.setState({ installPrompt: event as BeforeInstallPromptEvent })
    }
  })

  window.addEventListener('appinstalled', () => usePwa.setState({ installPrompt: null }))

  // iOS has no install event, so it gets instructions instead.
  if (isIos() && !isInstalled() && !wasDismissedRecently()) {
    usePwa.setState({ showIosInstructions: true })
  }
}

export async function install() {
  const { installPrompt } = usePwa.getState()
  if (!installPrompt) {
    return
  }

  await installPrompt.prompt()
  const { outcome } = await installPrompt.userChoice
  if (outcome === 'dismissed') {
    rememberDismissal()
  }

  // Each event can only be used once.
  usePwa.setState({ installPrompt: null })
}

export function dismissInstall() {
  rememberDismissal()
  usePwa.setState({ installPrompt: null, showIosInstructions: false })
}

export function offerUpdate(applyUpdate: () => void) {
  usePwa.setState({ applyUpdate })
}

/** Only for this visit: a waiting version is offered again the next time the app opens. */
export function dismissUpdate() {
  usePwa.setState({ applyUpdate: null })
}

/**
 * Browsers look for a new version only when a page loads, and an installed app can stay
 * open in the background for days, so also check on returning to it.
 */
export function watchForUpdates(registration: Pick<ServiceWorkerRegistration, 'update'>) {
  let lastCheck = Date.now()

  function check() {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_EVERY_MS) {
      return
    }
    lastCheck = Date.now()
    registration.update().catch(() => {
      // Offline: the next check will try again.
    })
  }

  document.addEventListener('visibilitychange', check)
  // For a tab left open on a computer, which never stops being visible.
  const interval = setInterval(check, UPDATE_CHECK_EVERY_MS)

  return () => {
    document.removeEventListener('visibilitychange', check)
    clearInterval(interval)
  }
}
