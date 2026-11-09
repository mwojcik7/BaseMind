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
