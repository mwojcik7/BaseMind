import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { logIn, logOut, startAuth, useAuth, type Account } from '@/lib/auth'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'Marcin', email: 'm@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function remember() {
  localStorage.setItem('basemind.account', JSON.stringify(ACCOUNT))
}

describe('auth', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=token; path=/'
    useAuth.setState({ status: 'loading', account: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('signs in from the server and remembers the account', async () => {
    fetchMock.mockResolvedValue(json(200, ACCOUNT))

    await startAuth()

    expect(useAuth.getState()).toMatchObject({ status: 'authenticated', account: ACCOUNT })
    expect(localStorage.getItem('basemind.account')).toContain('Marcin')
  })

  it('is a guest when the server says so', async () => {
    fetchMock.mockResolvedValue(json(401))

    await startAuth()

    expect(useAuth.getState().status).toBe('guest')
  })

  it('opens at once with a remembered account, before the server answers', () => {
    remember()
    fetchMock.mockReturnValue(new Promise(() => {}))

    void startAuth()

    expect(useAuth.getState()).toMatchObject({ status: 'authenticated', account: ACCOUNT })
  })

  it('stays signed in while offline', async () => {
    remember()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await startAuth()

    expect(useAuth.getState().status).toBe('authenticated')
    expect(localStorage.getItem('basemind.account')).not.toBeNull()
  })

  it('stays signed in during a server failure', async () => {
    remember()
    fetchMock.mockResolvedValue(json(503))

    await startAuth()

    expect(useAuth.getState().status).toBe('authenticated')
  })

  it('is a guest offline when no account is remembered', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await startAuth()

    expect(useAuth.getState().status).toBe('guest')
  })

  it('forgets the account when the session has ended on the server', async () => {
    remember()
    fetchMock.mockResolvedValue(json(401))

    await startAuth()

    expect(useAuth.getState()).toMatchObject({ status: 'guest', account: null })
    expect(localStorage.getItem('basemind.account')).toBeNull()
  })

  it('signs out when any request finds the session revoked', async () => {
    fetchMock.mockResolvedValueOnce(json(200, ACCOUNT))
    await startAuth()

    fetchMock.mockResolvedValueOnce(json(401))
    await expect(api.get('/api/sessions')).rejects.toThrow()

    expect(useAuth.getState().status).toBe('guest')
  })

  it('logs in and loads the account', async () => {
    fetchMock.mockResolvedValueOnce(json(200)).mockResolvedValueOnce(json(200, ACCOUNT))

    await logIn({ email: 'm@example.com', password: 'secret-secret' })

    expect(useAuth.getState().status).toBe('authenticated')
  })

  it('logs out and forgets the account', async () => {
    remember()
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await logOut()

    expect(useAuth.getState()).toMatchObject({ status: 'guest', account: null })
    expect(localStorage.getItem('basemind.account')).toBeNull()
  })

  it('refuses to log out offline, so the server session cannot come back', async () => {
    remember()
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(logOut()).rejects.toThrow()

    expect(useAuth.getState().status).toBe('authenticated')
  })
})
