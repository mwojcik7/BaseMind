import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format, subDays } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppRouter } from '@/app/router'
import { db } from '@/db/db'
import { pl } from '@/i18n/pl'
import { startAuth, type Account } from '@/lib/auth'
import { usePwa, type BeforeInstallPromptEvent } from '@/lib/pwa'
import { getTheme } from '@/lib/theme'
import { taskLists, tasks, type Task } from '@/modules/tasks/repo'
import { search } from '@/search/client'
import { getRecentSearches, rememberSearch } from '@/search/recent'
import { useSyncStatus } from '@/sync/engine'

// jsdom has no Web Workers. The index itself is tested in search/search.test.ts.
vi.mock('@/search/client', () => ({ search: vi.fn() }))

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

function heading(name: string | RegExp) {
  return screen.findByRole('heading', { level: 1, name })
}

// The "Dziś" screen greets the user; the wording depends on the time of day.
const TODAY_HEADING = new RegExp(`^(${pl.today.day}|${pl.today.evening}), Marcin$`)

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

    expect(await heading(TODAY_HEADING)).toBeInTheDocument()
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

    expect(await heading(TODAY_HEADING)).toBeInTheDocument()
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
    await heading(TODAY_HEADING)

    expect(screen.getByRole('status', { name: pl.sync.synced })).toBeInTheDocument()

    act(() => useSyncStatus.setState({ pending: 2 }))
    expect(screen.getByRole('status', { name: pl.sync.pending(2) })).toBeInTheDocument()

    act(() => useSyncStatus.setState({ connection: 'offline' }))
    expect(screen.getByRole('status', { name: pl.sync.offlinePending(2) })).toBeInTheDocument()

    act(() => useSyncStatus.setState({ rejected: 1 }))
    expect(screen.getByRole('status', { name: pl.sync.rejected(1) })).toBeInTheDocument()
  })

  it('synchronises at once when the indicator is tapped', async () => {
    const user = userEvent.setup()
    serverAnswersPush('applied')
    renderAt('/')
    await heading(TODAY_HEADING)
    const pulls = () =>
      fetchMock.mock.calls.filter(([input]) => String(input).startsWith('/api/sync/pull'))

    await user.click(screen.getByRole('button', { name: pl.sync.syncNow }))

    expect(screen.getByRole('status', { name: pl.sync.syncing })).toBeInTheDocument()
    await waitFor(() => expect(pulls()).toHaveLength(1))
    expect(await screen.findByRole('status', { name: pl.sync.synced })).toBeInTheDocument()
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

describe('search', () => {
  const HIT = { id: 'tags:1', entity: 'tags', title: 'Dom', subtitle: null, href: null }

  async function openSearch(user: ReturnType<typeof userEvent.setup>) {
    renderAt('/')
    await heading(TODAY_HEADING)
    await user.click(screen.getByRole('button', { name: new RegExp(pl.search.placeholder) }))
    return within(await screen.findByRole('dialog', { name: pl.search.title }))
  }

  function searchBox(dialog: ReturnType<typeof within>) {
    return dialog.getByRole('searchbox', { name: pl.search.placeholder })
  }

  beforeEach(() => vi.mocked(search).mockReset().mockResolvedValue([]))

  it('shows results grouped by module', async () => {
    const user = userEvent.setup()
    vi.mocked(search).mockResolvedValue([HIT])
    const dialog = await openSearch(user)

    await user.type(searchBox(dialog), 'dom')

    expect(await dialog.findByText('Dom')).toBeInTheDocument()
    expect(dialog.getByRole('heading', { name: pl.search.groups.tags })).toBeInTheDocument()
    expect(search).toHaveBeenLastCalledWith('dom')
  })

  it('says when nothing was found', async () => {
    const user = userEvent.setup()
    const dialog = await openSearch(user)

    await user.type(searchBox(dialog), 'xyz')

    expect(await dialog.findByText(pl.search.noResults('xyz'))).toBeInTheDocument()
  })

  it('opens a result and closes the search', async () => {
    const user = userEvent.setup()
    vi.mocked(search).mockResolvedValue([{ ...HIT, title: 'Notatka', href: '/notes' }])
    const dialog = await openSearch(user)

    await user.type(searchBox(dialog), 'not')
    await user.click(await dialog.findByRole('button', { name: 'Notatka' }))

    expect(await heading(pl.modules.notes)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ignores a slower answer to an earlier query', async () => {
    const user = userEvent.setup()
    let answerFirst: (hits: (typeof HIT)[]) => void = () => {}
    vi.mocked(search)
      .mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
      .mockResolvedValue([{ ...HIT, title: 'Aktualny' }])
    const dialog = await openSearch(user)

    await user.type(searchBox(dialog), 'ab')
    expect(await dialog.findByText('Aktualny')).toBeInTheDocument()
    act(() => answerFirst([{ ...HIT, title: 'Spóźniony' }]))

    await waitFor(() => expect(dialog.queryByText('Spóźniony')).not.toBeInTheDocument())
    expect(dialog.getByText('Aktualny')).toBeInTheDocument()
  })

  it('remembers a search that found something and offers it next time', async () => {
    const user = userEvent.setup()
    vi.mocked(search).mockResolvedValue([HIT])
    let dialog = await openSearch(user)
    await user.type(searchBox(dialog), 'dom')
    await dialog.findByText('Dom')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(async () => expect(await getRecentSearches()).toEqual(['dom']))

    await user.click(screen.getByRole('button', { name: new RegExp(pl.search.placeholder) }))
    dialog = within(await screen.findByRole('dialog', { name: pl.search.title }))
    await user.click(await dialog.findByRole('button', { name: 'dom' }))

    expect(searchBox(dialog)).toHaveValue('dom')
  })

  it('does not remember a search that found nothing', async () => {
    const user = userEvent.setup()
    const dialog = await openSearch(user)
    await user.type(searchBox(dialog), 'xyz')
    await dialog.findByText(pl.search.noResults('xyz'))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(await getRecentSearches()).toEqual([])
  })

  it('removes a single recent search and keeps the others', async () => {
    const user = userEvent.setup()
    await rememberSearch('auto')
    await rememberSearch('dom')
    const dialog = await openSearch(user)

    await user.click(await dialog.findByRole('button', { name: pl.search.removeRecent('auto') }))

    await waitFor(() => expect(dialog.queryByText('auto')).not.toBeInTheDocument())
    expect(dialog.getByText('dom')).toBeInTheDocument()
    expect(searchBox(dialog)).toHaveValue('')
  })

  it('clears the recent searches', async () => {
    const user = userEvent.setup()
    await rememberSearch('dom')
    const dialog = await openSearch(user)

    await user.click(await dialog.findByRole('button', { name: pl.search.clearRecent }))

    expect(await dialog.findByText(pl.search.hint)).toBeInTheDocument()
  })
})

describe('notification settings', () => {
  const SETTINGS = {
    push: true,
    email: true,
    quiet_hours: null,
    digest: { enabled: true, time: '07:00' },
  }

  function serverHasSettings() {
    fetchMock.mockImplementation(async (input) => {
      const path = String(input)
      if (path === '/api/me') {
        return json(200, ACCOUNT)
      }
      if (path === '/api/settings') {
        return json(200, { notifications: SETTINGS })
      }
      return new Response(null, { status: 204 })
    })
  }

  const saved = () =>
    JSON.parse(
      String(
        fetchMock.mock.calls.find(
          ([input, init]) => input === '/api/settings' && init?.method === 'POST',
        )?.[1]?.body,
      ),
    )

  it('saves the chosen digest time and quiet hours', async () => {
    const user = userEvent.setup()
    serverHasSettings()
    renderAt('/settings/notifications')

    const digestTime = await screen.findByLabelText(pl.notifications.time)
    expect(digestTime).toHaveValue('07:00')
    fireEvent.change(digestTime, { target: { value: '06:30' } })
    await user.click(screen.getByRole('switch', { name: pl.notifications.quietHours }))
    expect(screen.getByLabelText(pl.notifications.from)).toHaveValue('22:00')
    await user.click(screen.getByRole('switch', { name: pl.notifications.email }))
    await user.click(screen.getByRole('button', { name: pl.notifications.save }))

    await waitFor(() =>
      expect(saved()).toEqual({
        notifications: {
          push: true,
          email: false,
          quiet_hours: { start: '22:00', end: '07:00' },
          digest: { enabled: true, time: '06:30' },
        },
      }),
    )
  })

  it('explains when this browser cannot show notifications', async () => {
    serverHasSettings()
    renderAt('/settings/notifications')

    expect(await screen.findByText(pl.notifications.pushUnsupported)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: pl.notifications.push })).toBeDisabled()
  })

  it('explains when the settings need a connection', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input) === '/api/me') {
        return json(200, ACCOUNT)
      }
      throw new TypeError('Failed to fetch')
    })
    renderAt('/settings/notifications')

    expect(await screen.findByText(pl.errors.offline)).toBeInTheDocument()
  })

  it('is reachable from the settings screen', async () => {
    const user = userEvent.setup()
    serverHasSettings()
    renderAt('/settings')
    await heading(pl.settings.title)

    await user.click(screen.getByRole('link', { name: pl.settings.notifications }))

    expect(await heading(pl.settings.notifications)).toBeInTheDocument()
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
    await heading(TODAY_HEADING)

    act(() => usePwa.setState({ applyUpdate }))
    await user.click(screen.getByRole('button', { name: pl.pwa.updateAction }))

    expect(applyUpdate).toHaveBeenCalledOnce()
  })

  it('shows iPhone instructions without an install button, and hides them', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await heading(TODAY_HEADING)

    act(() => usePwa.setState({ showIosInstructions: true }))
    expect(screen.getByText(pl.pwa.iosInstructions)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: pl.pwa.installAction })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: pl.pwa.dismiss }))
    expect(screen.queryByText(pl.pwa.iosInstructions)).not.toBeInTheDocument()
  })

  it('offers installing, but a new version comes first', async () => {
    renderAt('/')
    await heading(TODAY_HEADING)

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

    expect(await heading(TODAY_HEADING)).toBeInTheDocument()
    for (const name of [pl.nav.today, pl.nav.tasks, pl.nav.calendar, pl.nav.more]) {
      expect(bottomNav().getByRole('link', { name })).toBeInTheDocument()
    }
    expect(bottomNav().getByRole('button', { name: pl.nav.add })).toBeInTheDocument()
  })

  it('lists every module and the settings in the desktop sidebar', async () => {
    renderAt('/')
    await heading(TODAY_HEADING)

    for (const name of [pl.nav.today, pl.modules.finance, pl.modules.files, pl.settings.title]) {
      expect(sidebar().getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('navigates from the module grid to a module placeholder', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await heading(TODAY_HEADING)

    await user.click(bottomNav().getByRole('link', { name: pl.nav.more }))
    await user.click(await page().findByRole('link', { name: pl.modules.finance }))

    expect(await heading(pl.modules.finance)).toBeInTheDocument()
    expect(screen.getByText(pl.module.comingSoon(3))).toBeInTheDocument()
  })

  it('opens and closes the quick add sheet', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await heading(TODAY_HEADING)

    await user.click(bottomNav().getByRole('button', { name: pl.nav.add }))
    expect(screen.getByRole('dialog', { name: pl.quickAdd.title })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: pl.common.close }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('opens the search from the bar and with Ctrl+K', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await heading(TODAY_HEADING)

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

  describe('tasks', () => {
    const today = format(new Date(), 'yyyy-MM-dd')

    function newTask(fields: Partial<Task> = {}) {
      return tasks.create({
        list_id: null,
        title: 'Kupić mleko',
        notes: null,
        priority: 4,
        status: 'todo',
        due_date: today,
        due_time: null,
        completed_at: null,
        ...fields,
      })
    }

    async function openTasks() {
      renderAt('/tasks')
      return heading(pl.modules.tasks)
    }

    it('adds a task from the [+] sheet, reading the date and priority', async () => {
      const user = userEvent.setup()
      await openTasks()

      await user.click(bottomNav().getByRole('button', { name: pl.nav.add }))
      const sheet = within(await screen.findByRole('dialog', { name: pl.quickAdd.title }))
      await user.type(
        sheet.getByRole('textbox', { name: pl.tasks.quickAddPlaceholder }),
        'Kupić chleb jutro !1',
      )
      expect(sheet.getByRole('combobox', { name: pl.tasks.priority })).toHaveTextContent('P1')
      expect(sheet.getByLabelText(pl.tasks.dueTime)).toBeEnabled()
      await user.click(sheet.getByRole('button', { name: pl.quickAdd.add }))

      await waitFor(async () => expect(await tasks.list()).toHaveLength(1))
      expect((await tasks.list())[0]).toMatchObject({
        title: 'Kupić chleb',
        priority: 1,
        due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      })

      await user.click(screen.getByRole('tab', { name: pl.tasks.tabs.upcoming }))
      expect(await page().findByText('Kupić chleb')).toBeInTheDocument()
    })

    it('keeps the time and reminder off until there is a date', async () => {
      const user = userEvent.setup()
      await openTasks()

      await user.click(bottomNav().getByRole('button', { name: pl.nav.add }))
      const sheet = within(await screen.findByRole('dialog', { name: pl.quickAdd.title }))

      expect(sheet.getByLabelText(pl.tasks.dueTime)).toBeDisabled()
      expect(sheet.getByRole('combobox', { name: pl.tasks.reminder })).toBeDisabled()
    })

    it('saves the time picked by hand with the task', async () => {
      const user = userEvent.setup()
      await openTasks()

      await user.click(bottomNav().getByRole('button', { name: pl.nav.add }))
      const sheet = within(await screen.findByRole('dialog', { name: pl.quickAdd.title }))
      await user.type(sheet.getByRole('textbox'), 'Spotkanie jutro')
      fireEvent.change(sheet.getByLabelText(pl.tasks.dueTime), { target: { value: '14:30' } })
      await user.click(sheet.getByRole('button', { name: pl.quickAdd.add }))

      await waitFor(async () => expect(await tasks.list()).toHaveLength(1))
      expect((await tasks.list())[0]).toMatchObject({ title: 'Spotkanie', due_time: '14:30' })
    })

    it('opens quick add with the Q key, but not while typing', async () => {
      const user = userEvent.setup()
      await openTasks()

      await user.click(screen.getByRole('button', { name: new RegExp(pl.search.placeholder) }))
      const searchField = await screen.findByRole('searchbox')
      fireEvent.keyDown(searchField, { key: 'q' })
      expect(screen.queryByRole('dialog', { name: pl.quickAdd.title })).not.toBeInTheDocument()
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      fireEvent.keyDown(document.body, { key: 'q', ctrlKey: true })
      expect(screen.queryByRole('dialog', { name: pl.quickAdd.title })).not.toBeInTheDocument()

      fireEvent.keyDown(document.body, { key: 'q' })
      expect(await screen.findByRole('dialog', { name: pl.quickAdd.title })).toBeInTheDocument()
    })

    it('does not add a task with nothing but a date', async () => {
      const user = userEvent.setup()
      await openTasks()

      await user.click(bottomNav().getByRole('button', { name: pl.nav.add }))
      const sheet = within(await screen.findByRole('dialog', { name: pl.quickAdd.title }))
      await user.type(sheet.getByRole('textbox'), 'jutro')

      expect(sheet.getByRole('button', { name: pl.quickAdd.add })).toBeDisabled()
    })

    it('shows overdue tasks above today and moves a completed one to its tab', async () => {
      const user = userEvent.setup()
      await openTasks()
      await newTask()
      await newTask({ title: 'Zaległe', due_date: format(subDays(new Date(), 1), 'yyyy-MM-dd') })

      expect(await page().findByRole('heading', { name: pl.tasks.overdue })).toBeInTheDocument()
      await user.click(
        await page().findByRole('checkbox', { name: pl.tasks.complete('Kupić mleko') }),
      )
      await waitFor(() => expect(page().queryByText('Kupić mleko')).not.toBeInTheDocument())

      await user.click(screen.getByRole('tab', { name: pl.tasks.tabs.done }))
      expect(await page().findByText('Kupić mleko')).toBeInTheDocument()

      await user.click(page().getByRole('checkbox', { name: pl.tasks.reopen('Kupić mleko') }))
      await waitFor(async () =>
        expect((await tasks.list()).find((task) => task.title === 'Kupić mleko')?.status).toBe(
          'todo',
        ),
      )
    })

    it('edits a task on its own address and returns to the list', async () => {
      const user = userEvent.setup()
      await openTasks()
      await newTask()

      await user.click(await page().findByRole('button', { name: /Kupić mleko/ }))
      const sheet = within(await screen.findByRole('dialog', { name: pl.tasks.edit }))
      const title = sheet.getByLabelText(pl.tasks.title)
      await user.clear(title)
      await user.type(title, 'Kupić śmietanę')
      await user.click(sheet.getByRole('radio', { name: 'P2' }))
      await user.click(sheet.getByRole('button', { name: pl.tasks.save }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect((await tasks.list())[0]).toMatchObject({ title: 'Kupić śmietanę', priority: 2 })
    })

    it('brings a deleted task back with the undo button', async () => {
      const user = userEvent.setup()
      await openTasks()
      await newTask()

      await page().findByText('Kupić mleko')
      await user.click(page().getByRole('button', { name: pl.tasks.delete }))
      await waitFor(() => expect(page().queryByText('Kupić mleko')).not.toBeInTheDocument())
      expect(await tasks.list()).toHaveLength(0)

      await user.click(await screen.findByRole('button', { name: pl.common.undo }))

      expect(await page().findByText('Kupić mleko')).toBeInTheDocument()
      expect(await tasks.list()).toHaveLength(1)
    })

    it('refuses an empty title', async () => {
      const user = userEvent.setup()
      await openTasks()
      await newTask()

      await user.click(await page().findByRole('button', { name: /Kupić mleko/ }))
      const sheet = within(await screen.findByRole('dialog', { name: pl.tasks.edit }))
      await user.clear(sheet.getByLabelText(pl.tasks.title))
      await user.click(sheet.getByRole('button', { name: pl.tasks.save }))

      expect(await sheet.findByText(pl.tasks.titleRequired)).toBeInTheDocument()
      expect((await tasks.list())[0].title).toBe('Kupić mleko')
    })

    it('creates a list and sends its tasks to the inbox when it is deleted', async () => {
      const user = userEvent.setup()
      await openTasks()
      await user.click(screen.getByRole('tab', { name: pl.tasks.tabs.lists }))

      await user.click(await page().findByRole('button', { name: pl.tasks.newList }))
      const sheet = within(await screen.findByRole('dialog', { name: pl.tasks.newList }))
      await user.type(sheet.getByRole('textbox'), 'Dom')
      await user.click(sheet.getByRole('button', { name: pl.tasks.save }))
      await waitFor(async () => expect(await taskLists.list()).toHaveLength(1))
      const [list] = await taskLists.list()
      await newTask({ list_id: list.id })

      await user.click(await page().findByRole('button', { name: /^Dom/ }))
      await page().findByText('Kupić mleko')
      await user.click(page().getByRole('button', { name: pl.tasks.deleteList }))
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: pl.tasks.deleteList,
        }),
      )

      await waitFor(async () => expect(await taskLists.list()).toHaveLength(0))
      expect((await tasks.list())[0].list_id).toBeNull()
    })

    it('shows the tasks due today on the "Dziś" screen', async () => {
      renderAt('/')
      await heading(TODAY_HEADING)
      await newTask()

      expect(await page().findByRole('link', { name: 'Kupić mleko' })).toBeInTheDocument()
    })
  })

  describe('the "Dziś" screen', () => {
    const widgetTitles = () =>
      page()
        .getAllByRole('heading', { level: 2 })
        .map((title) => title.textContent)

    it('shows the widgets in the default order', async () => {
      renderAt('/')
      await heading(TODAY_HEADING)

      await waitFor(() =>
        expect(widgetTitles()).toEqual([pl.today.tasks, pl.today.events, pl.today.expenses]),
      )
    })

    it('follows the order and visibility chosen in the settings', async () => {
      const user = userEvent.setup()
      const router = renderAt('/settings')
      await heading(pl.settings.title)

      await user.click(screen.getByRole('link', { name: pl.settings.dashboard }))
      await heading(pl.dashboardSettings.title)

      const moveTasksDown = await screen.findByRole('button', {
        name: pl.dashboardSettings.moveDown(pl.today.tasks),
      })
      await user.click(moveTasksDown)
      await waitFor(async () =>
        expect((await db.meta.get('dashboard_layout'))?.value).toMatchObject({
          order: ['events', 'tasks', 'expenses'],
        }),
      )

      await user.click(screen.getByRole('switch', { name: pl.today.expenses }))
      await waitFor(async () =>
        expect((await db.meta.get('dashboard_layout'))?.value).toMatchObject({
          hidden: ['expenses'],
        }),
      )

      await act(() => router.navigate({ to: '/' }))
      await heading(TODAY_HEADING)

      await waitFor(() => expect(widgetTitles()).toEqual([pl.today.events, pl.today.tasks]))
    })

    it('cannot move the first widget up or the last one down', async () => {
      renderAt('/settings/dashboard')

      expect(
        await screen.findByRole('button', { name: pl.dashboardSettings.moveUp(pl.today.tasks) }),
      ).toBeDisabled()
      expect(
        screen.getByRole('button', { name: pl.dashboardSettings.moveDown(pl.today.expenses) }),
      ).toBeDisabled()
    })
  })
})
