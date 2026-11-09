import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppRouter } from '@/app/router'
import { db } from '@/db/db'
import { pl } from '@/i18n/pl'
import { startAuth, type Account } from '@/lib/auth'
import { usePwa, type BeforeInstallPromptEvent } from '@/lib/pwa'
import { getTheme } from '@/lib/theme'
import { useSyncStatus } from '@/sync/engine'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'Marcin', email: 'm@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

const fetchMock = vi.fn<typeof fetch>()

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function serverAnswers(handler: (path: string) => Response) {
  fetchMock.mockImplementation(async (input) => handler(String(input)))
}

function renderAt(path: string) {
  void startAuth()
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  document.cookie = 'XSRF-TOKEN=token; path=/'
  serverAnswers((path) => (path === '/api/me' ? json(200, ACCOUNT) : json(200)))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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

describe('signing in', () => {
  beforeEach(() => {
    let signedIn = false
    serverAnswers((path) => {
      if (path === '/api/auth/login') {
        signedIn = true
        return json(200)
      }
      if (path === '/api/auth/logout') {
        signedIn = false
        return new Response(null, { status: 204 })
      }
      if (path === '/api/me') {
        return signedIn ? json(200, ACCOUNT) : json(401)
      }
      return json(200)
    })
  })

  it('sends a guest from the app to the login screen, and into the app after signing in', async () => {
    const user = userEvent.setup()
    const router = renderAt('/notes')

    expect(await heading(pl.auth.loginTitle)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')

    await user.type(screen.getByLabelText(pl.auth.email), 'm@example.com')
    await user.type(screen.getByLabelText(pl.auth.password), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: pl.auth.loginAction }))

    expect(await heading(pl.nav.today)).toBeInTheDocument()
  })

  it('validates the form before asking the server', async () => {
    const user = userEvent.setup()
    renderAt('/login')
    await heading(pl.auth.loginTitle)

    await user.type(screen.getByLabelText(pl.auth.email), 'nope')
    await user.click(screen.getByRole('button', { name: pl.auth.loginAction }))

    expect(await screen.findByText(pl.auth.emailInvalid)).toBeInTheDocument()
    expect(screen.getByText(pl.auth.passwordRequired)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/login', expect.anything())
  })

  it('shows the error from the server next to the field', async () => {
    const user = userEvent.setup()
    serverAnswers((path) =>
      path === '/api/auth/login'
        ? json(422, { message: 'x', errors: { email: ['Nieprawidłowy e-mail lub hasło.'] } })
        : json(401),
    )
    renderAt('/login')
    await heading(pl.auth.loginTitle)

    await user.type(screen.getByLabelText(pl.auth.email), 'm@example.com')
    await user.type(screen.getByLabelText(pl.auth.password), 'wrong-password')
    await user.click(screen.getByRole('button', { name: pl.auth.loginAction }))

    expect(await screen.findByText('Nieprawidłowy e-mail lub hasło.')).toBeInTheDocument()
    expect(screen.getByLabelText(pl.auth.email)).toHaveAttribute('aria-invalid', 'true')
  })

  it('explains that signing in needs a connection', async () => {
    const user = userEvent.setup()
    renderAt('/login')
    await heading(pl.auth.loginTitle)

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await user.type(screen.getByLabelText(pl.auth.email), 'm@example.com')
    await user.type(screen.getByLabelText(pl.auth.password), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: pl.auth.loginAction }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.errors.offline)
  })

  it('signs out from the settings and returns to the login screen', async () => {
    const user = userEvent.setup()
    serverAnswers((path) => {
      if (path === '/api/auth/logout') {
        return new Response(null, { status: 204 })
      }
      return path === '/api/me' ? json(200, ACCOUNT) : json(200)
    })
    renderAt('/settings')
    await heading(pl.settings.title)

    await user.click(screen.getByRole('button', { name: pl.settings.logOut }))

    expect(await heading(pl.auth.loginTitle)).toBeInTheDocument()
  })

  it('keeps a signed-in person away from the login screen', async () => {
    serverAnswers((path) => (path === '/api/me' ? json(200, ACCOUNT) : json(200)))
    await db.meta.put({ key: 'account', value: ACCOUNT })

    renderAt('/login')

    expect(await heading(pl.nav.today)).toBeInTheDocument()
  })

  it('checks the password confirmation when registering', async () => {
    const user = userEvent.setup()
    renderAt('/register')
    await heading(pl.auth.registerTitle)

    await user.type(screen.getByLabelText(pl.auth.invitationCode), 'code')
    await user.type(screen.getByLabelText(pl.auth.displayName), 'Marcin')
    await user.type(screen.getByLabelText(pl.auth.email), 'm@example.com')
    await user.type(screen.getByLabelText(pl.auth.newPassword), 'long-enough-password')
    await user.type(screen.getByLabelText(pl.auth.confirmPassword), 'different-password')
    await user.click(screen.getByRole('button', { name: pl.auth.registerAction }))

    expect(await screen.findByText(pl.auth.passwordsDiffer)).toBeInTheDocument()
  })

  it('refuses a reset link without its token', async () => {
    renderAt('/reset-password')

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.auth.resetLinkInvalid)
  })

  it('sends the token and e-mail from the link with the new password', async () => {
    const user = userEvent.setup()
    renderAt('/reset-password?token=abc&email=m%40example.com')
    await heading(pl.auth.resetTitle)

    await user.type(screen.getByLabelText(pl.auth.newPassword), 'a-brand-new-password')
    await user.type(screen.getByLabelText(pl.auth.confirmPassword), 'a-brand-new-password')
    await user.click(screen.getByRole('button', { name: pl.auth.resetAction }))

    expect(await screen.findByRole('status')).toHaveTextContent(pl.auth.resetDone)
    const call = fetchMock.mock.calls.find(([input]) => input === '/api/auth/reset-password')
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      token: 'abc',
      email: 'm@example.com',
    })
  })
})

describe('synchronisation in the app', () => {
  const PULL_PAGE = { changes: [], cursor: 0, has_more: false, settings: { theme: null } }

  function queueUnsentChange() {
    return db.outbox.add({
      op_id: 'op-1',
      entity: 'notes',
      record_id: 'note',
      op: 'create',
      payload: {},
      base_version: 0,
      client_ts: '2026-11-09T10:00:00.000Z',
    })
  }

  function serverAnswersPush(status: 'applied' | 'rejected') {
    serverAnswers((path) => {
      if (path === '/api/me') {
        return json(200, ACCOUNT)
      }
      if (path === '/api/sync/push') {
        return json(200, { results: [{ op_id: 'op-1', status, reason: 'invalid' }] })
      }
      if (path.startsWith('/api/sync/pull')) {
        return json(200, PULL_PAGE)
      }
      return new Response(null, { status: 204 })
    })
  }

  const logOutCalls = () => fetchMock.mock.calls.filter(([input]) => input === '/api/auth/logout')

  beforeEach(() => fetchMock.mockClear())

  afterEach(() => useSyncStatus.setState({ connection: 'ok', pending: 0, rejected: 0 }))

  it('shows the state of synchronisation', async () => {
    renderAt('/')
    await heading(pl.nav.today)

    expect(screen.getByRole('status', { name: pl.sync.synced })).toBeInTheDocument()

    act(() => useSyncStatus.setState({ pending: 2 }))
    expect(screen.getByRole('status', { name: pl.sync.pending(2) })).toBeInTheDocument()

    act(() => useSyncStatus.setState({ connection: 'offline' }))
    expect(screen.getByRole('status', { name: pl.sync.offlinePending(2) })).toBeInTheDocument()

    act(() => useSyncStatus.setState({ rejected: 1 }))
    expect(screen.getByRole('status', { name: pl.sync.rejected(1) })).toBeInTheDocument()
  })

  it('sends waiting changes and signs out without asking when that works', async () => {
    const user = userEvent.setup()
    await queueUnsentChange()
    serverAnswersPush('applied')
    renderAt('/settings')
    await heading(pl.settings.title)

    await user.click(screen.getByRole('button', { name: pl.settings.logOut }))

    expect(await heading(pl.auth.loginTitle)).toBeInTheDocument()
    expect(logOutCalls()).toHaveLength(1)
  })

  it('warns before losing changes and lets the user back out or continue', async () => {
    const user = userEvent.setup()
    await queueUnsentChange()
    serverAnswersPush('rejected')
    renderAt('/settings')
    await heading(pl.settings.title)

    await user.click(screen.getByRole('button', { name: pl.settings.logOut }))
    expect(
      await screen.findByRole('dialog', { name: pl.settings.unsentTitle }),
    ).toHaveAccessibleDescription(pl.settings.unsentDescription(1))
    expect(logOutCalls()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: pl.common.cancel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(logOutCalls()).toHaveLength(0)
    expect(await db.outbox.count()).toBe(1)

    await user.click(screen.getByRole('button', { name: pl.settings.logOut }))
    await user.click(await screen.findByRole('button', { name: pl.settings.logOutAnyway }))

    expect(await heading(pl.auth.loginTitle)).toBeInTheDocument()
    expect(logOutCalls()).toHaveLength(1)
    await waitFor(async () => expect(await db.outbox.count()).toBe(0))
  })
})

describe('app banners', () => {
  afterEach(() =>
    usePwa.setState({ applyUpdate: null, installPrompt: null, showIosInstructions: false }),
  )

  it('offers a new version and reloads into it on request', async () => {
    const user = userEvent.setup()
    const applyUpdate = vi.fn()
    renderAt('/')
    await heading(pl.nav.today)

    act(() => usePwa.setState({ applyUpdate }))
    await user.click(screen.getByRole('button', { name: pl.pwa.updateAction }))

    expect(applyUpdate).toHaveBeenCalledOnce()
  })

  it('shows iPhone instructions without an install button, and hides them', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await heading(pl.nav.today)

    act(() => usePwa.setState({ showIosInstructions: true }))
    expect(screen.getByText(pl.pwa.iosInstructions)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: pl.pwa.installAction })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: pl.pwa.dismiss }))
    expect(screen.queryByText(pl.pwa.iosInstructions)).not.toBeInTheDocument()
  })

  it('offers installing, but a new version comes first', async () => {
    renderAt('/')
    await heading(pl.nav.today)

    act(() => usePwa.setState({ installPrompt: new Event('x') as BeforeInstallPromptEvent }))
    expect(screen.getByRole('button', { name: pl.pwa.installAction })).toBeInTheDocument()

    act(() => usePwa.setState({ applyUpdate: vi.fn() }))
    expect(screen.queryByRole('button', { name: pl.pwa.installAction })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: pl.pwa.updateAction })).toBeInTheDocument()
  })
})

describe('sessions screen', () => {
  const SESSIONS = [
    {
      id: 'current',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/142.0 Safari/537.36',
      last_active_at: new Date().toISOString(),
      is_current: true,
    },
    {
      id: 'phone',
      ip_address: '10.0.0.5',
      user_agent: 'Mozilla/5.0 (Linux; Android 15) Chrome/142.0 Mobile Safari/537.36',
      last_active_at: new Date().toISOString(),
      is_current: false,
    },
  ]

  it('lists devices and ends another session, but not the current one', async () => {
    const user = userEvent.setup()
    let sessions = SESSIONS
    fetchMock.mockImplementation(async (input, init) => {
      const path = String(input)
      if (path === '/api/me') {
        return json(200, ACCOUNT)
      }
      if (path === '/api/sessions/phone' && init?.method === 'DELETE') {
        sessions = SESSIONS.slice(0, 1)
        return new Response(null, { status: 204 })
      }
      return json(200, { sessions })
    })

    renderAt('/settings/sessions')

    expect(await screen.findByText('Chrome, Android')).toBeInTheDocument()
    expect(screen.getByText(pl.sessions.current)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: pl.sessions.end })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: pl.sessions.end }))

    await waitFor(() => expect(screen.queryByText('Chrome, Android')).not.toBeInTheDocument())
    expect(screen.getByText('Chrome, Windows')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: pl.sessions.endOthers })).not.toBeInTheDocument()
  })

  it('explains when the list needs a connection', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input) === '/api/me') {
        return json(200, ACCOUNT)
      }
      throw new TypeError('Failed to fetch')
    })

    renderAt('/settings/sessions')

    expect(await screen.findByText(pl.errors.offline)).toBeInTheDocument()
  })
})

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
