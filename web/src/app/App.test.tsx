import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createAppRouter } from '@/app/router'
import { pl } from '@/i18n/pl'
import { getTheme } from '@/lib/theme'

function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  render(<RouterProvider router={router} />)
}

function heading(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

// Both navigations are in the document: CSS shows one of them, and tests don't load CSS.
function bottomNav() {
  return within(screen.getByRole('navigation', { name: pl.nav.label }))
}

function sidebar() {
  return within(screen.getByRole('navigation', { name: pl.nav.sidebar }))
}

function page() {
  return within(screen.getByRole('main'))
}

describe('app shell', () => {
  it('starts on the today screen with all navigation entries', async () => {
    renderAt('/')

    expect(await heading(pl.nav.today)).toBeInTheDocument()
    for (const name of [pl.nav.today, pl.nav.tasks, pl.nav.calendar, pl.nav.more]) {
      expect(bottomNav().getByRole('link', { name })).toBeInTheDocument()
    }
    expect(bottomNav().getByRole('button', { name: pl.nav.add })).toBeInTheDocument()
  })

  it('lists every module and the settings in the desktop sidebar', async () => {
    renderAt('/')
    await heading(pl.nav.today)

    for (const name of [pl.nav.today, pl.modules.finance, pl.modules.files, pl.settings.title]) {
      expect(sidebar().getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('navigates from the module grid to a module placeholder', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await heading(pl.nav.today)

    await user.click(bottomNav().getByRole('link', { name: pl.nav.more }))
    await user.click(await page().findByRole('link', { name: pl.modules.finance }))

    expect(await heading(pl.modules.finance)).toBeInTheDocument()
    expect(screen.getByText(pl.module.comingSoon(3))).toBeInTheDocument()
  })

  it('opens and closes the quick add sheet', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await heading(pl.nav.today)

    await user.click(bottomNav().getByRole('button', { name: pl.nav.add }))
    expect(screen.getByRole('dialog', { name: pl.quickAdd.title })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: pl.common.close }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('opens the search from the bar and with Ctrl+K', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await heading(pl.nav.today)

    await user.click(screen.getByRole('button', { name: new RegExp(pl.search.placeholder) }))
    expect(screen.getByRole('dialog', { name: pl.search.title })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog', { name: pl.search.title })).toBeInTheDocument()
  })

  it('opens a module directly from its top-level URL', async () => {
    renderAt('/notes')

    expect(await heading(pl.modules.notes)).toBeInTheDocument()
    expect(bottomNav().getByRole('link', { name: pl.nav.more })).toHaveAttribute(
      'data-force-active',
    )
  })

  it('shows the design system preview', async () => {
    renderAt('/design')

    expect(await heading('Design system')).toBeInTheDocument()
  })

  it('shows not found for an unknown module id', async () => {
    renderAt('/nope')
    expect(await heading(pl.notFound.title)).toBeInTheDocument()
  })

  it('shows not found for an unknown nested path', async () => {
    renderAt('/more/finance')
    expect(await heading(pl.notFound.title)).toBeInTheDocument()
  })

  it('changes and remembers the theme from the settings screen', async () => {
    const user = userEvent.setup()
    renderAt('/more')
    await heading(pl.nav.more)

    await user.click(page().getByRole('link', { name: pl.settings.title }))
    const system = await screen.findByRole('radio', { name: pl.settings.themes.system })
    expect(system).toBeChecked()

    await user.click(screen.getByRole('radio', { name: pl.settings.themes.dark }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(getTheme()).toBe('dark')
    expect(screen.getByRole('radio', { name: pl.settings.themes.dark })).toBeChecked()
  })
})
