import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport
  viewport?.addEventListener('resize', onChange)
  viewport?.addEventListener('scroll', onChange)

  return () => {
    viewport?.removeEventListener('resize', onChange)
    viewport?.removeEventListener('scroll', onChange)
  }
}

function measure() {
  const viewport = window.visualViewport
  return viewport
    ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
    : 0
}

/**
 * How many pixels the on-screen keyboard covers at the bottom of the page. Android and iOS
 * draw it over the page, so anything fixed to the bottom ends up underneath without this.
 */
export function useKeyboardInset() {
  return useSyncExternalStore(subscribe, measure)
}

/** Smaller differences come from browser bars showing and hiding, not from a keyboard. */
const KEYBOARD_MIN_HEIGHT = 120

/** The keyboard's height; zooming in also makes the visible part smaller, so scale is taken out. */
function keyboardHeight() {
  const viewport = window.visualViewport
  // Measured without the scroll position: at the very end of the page the browser moves the
  // visible part down to the bottom, and the inset above drops to 0 with the keyboard still open.
  const height = viewport ? Math.round(window.innerHeight - viewport.height * viewport.scale) : 0
  return height > KEYBOARD_MIN_HEIGHT ? height : 0
}

/** Whether the on-screen keyboard is open, wherever the page is scrolled. */
export function useKeyboardOpen() {
  return useSyncExternalStore(subscribe, () => keyboardHeight() > 0)
}

/** How tall the on-screen keyboard is (0 when closed), wherever the page is scrolled. */
export function useKeyboardHeight() {
  return useSyncExternalStore(subscribe, keyboardHeight)
}
