export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

// Also read by public/theme-init.js, which applies the theme before the first paint.
const STORAGE_KEY = 'basemind.theme'
const BROWSER_BAR_COLORS = { light: '#ffffff', dark: '#09090b' }

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return THEMES.find((theme) => theme === stored) ?? 'system'
  } catch {
    // Storage can be blocked; the app then simply follows the system.
    return 'system'
  }
}

/** Syncs the page with the theme. CSS follows the system while data-theme is not set. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    delete root.dataset.theme
  } else {
    root.dataset.theme = theme
  }

  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const systemColor = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = BROWSER_BAR_COLORS[theme === 'system' ? systemColor : theme]
  })
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Still applied for this visit, it just won't be remembered.
  }
  applyTheme(theme)
}
