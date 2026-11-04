import { beforeEach, describe, expect, it } from 'vitest'
import { getTheme, setTheme } from '@/lib/theme'

function addThemeColorMeta(media: string) {
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.media = media
  document.head.append(meta)
  return meta
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    document.head.replaceChildren()
  })

  it('follows the system by default and ignores invalid stored values', () => {
    expect(getTheme()).toBe('system')

    localStorage.setItem('basemind.theme', 'pink')
    expect(getTheme()).toBe('system')
  })

  it('stores and applies a chosen theme', () => {
    setTheme('dark')

    expect(getTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('removes the override when going back to the system theme', () => {
    setTheme('light')
    setTheme('system')

    expect(getTheme()).toBe('system')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('keeps the browser bar color in sync with the theme', () => {
    const light = addThemeColorMeta('(prefers-color-scheme: light)')
    const dark = addThemeColorMeta('(prefers-color-scheme: dark)')

    setTheme('dark')
    expect([light.content, dark.content]).toEqual(['#09090b', '#09090b'])

    setTheme('system')
    expect([light.content, dark.content]).toEqual(['#ffffff', '#09090b'])
  })
})
