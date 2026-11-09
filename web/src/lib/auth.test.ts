import { waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/db'
import { api } from '@/lib/api'
import { logIn, logOut, startAuth, useAuth, type Account } from '@/lib/auth'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'Marcin', email: 'm@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

const OTHER_ACCOUNT: Account = { ...ACCOUNT, user: { ...ACCOUNT.user, id: 2 } }

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function remember() {
  return db.meta.put({ key: 'account', value: ACCOUNT })
}

function remembered() {
  return db.meta.get('account').then((entry) => entry?.value)
}

function addLocalChange() {
  return db.outbox.add({
    op_id: 'op',
    entity: 'notes',
    record_id: 'note',
    op: 'create',
    payload: {},
    base_version: 0,
    client_ts: '2026-11-09T10:00:00.000Z',
  })
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
    expect(await remembered()).toEqual(ACCOUNT)
  })

  it('is a guest when the server says so', async () => {
    fetchMock.mockResolvedValue(json(401))

    await startAuth()

    expect(useAuth.getState().status).toBe('guest')
  })

  it('opens with a remembered account before the server answers', async () => {
    await remember()
    fetchMock.mockReturnValue(new Promise(() => {}))

    void startAuth()

    await waitFor(() =>
      expect(useAuth.getState()).toMatchObject({ status: 'authenticated', account: ACCOUNT }),
    )
  })

  it('moves an account remembered by an earlier version into the local database', async () => {
    localStorage.setItem('basemind.account', JSON.stringify(ACCOUNT))
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await startAuth()

    expect(useAuth.getState()).toMatchObject({ status: 'authenticated', account: ACCOUNT })
    expect(await remembered()).toEqual(ACCOUNT)
    expect(localStorage.getItem('basemind.account')).toBeNull()
  })

  it('ignores a damaged account left by an earlier version', async () => {
    localStorage.setItem('basemind.account', '{broken')
    fetchMock.mockResolvedValue(json(401))

    await startAuth()

    expect(useAuth.getState().status).toBe('guest')
    expect(localStorage.getItem('basemind.account')).toBeNull()
  })

  it('stays signed in while offline and keeps local data', async () => {
    await remember()
    await addLocalChange()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await startAuth()

    expect(useAuth.getState().status).toBe('authenticated')
    expect(await remembered()).toEqual(ACCOUNT)
    expect(await db.outbox.count()).toBe(1)
  })

  it('stays signed in during a server failure', async () => {
    await remember()
    fetchMock.mockResolvedValue(json(503))

    await startAuth()

    expect(useAuth.getState().status).toBe('authenticated')
  })

  it('is a guest offline when no account is remembered', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await startAuth()

    expect(useAuth.getState().status).toBe('guest')
  })

  it('wipes the device when the session has ended on the server', async () => {
    await remember()
    await addLocalChange()
    fetchMock.mockResolvedValue(json(401))

    await startAuth()

    expect(useAuth.getState()).toMatchObject({ status: 'guest', account: null })
    expect(await remembered()).toBeUndefined()
    expect(await db.outbox.count()).toBe(0)
  })

  it('signs out and wipes the device when any request finds the session revoked', async () => {
    fetchMock.mockResolvedValueOnce(json(200, ACCOUNT))
    await startAuth()
    await addLocalChange()

    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(401))
    await expect(api.get('/api/sessions')).rejects.toThrow()

    expect(useAuth.getState().status).toBe('guest')
    await waitFor(async () => expect(await db.outbox.count()).toBe(0))
  })

  it('keeps the device signed in after a one-off 401', async () => {
    fetchMock.mockResolvedValueOnce(json(200, ACCOUNT))
    await startAuth()
    await addLocalChange()

    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(200))
    await api.get('/api/sessions')

    expect(useAuth.getState().status).toBe('authenticated')
    expect(await db.outbox.count()).toBe(1)
  })

  it.each([403, 404, 429])('keeps local data when the account check answers %i', async (status) => {
    await db.meta.put({ key: 'account', value: ACCOUNT })
    await addLocalChange()
    fetchMock.mockResolvedValue(json(status))

    await startAuth()

    expect(useAuth.getState()).toMatchObject({ status: 'authenticated', account: ACCOUNT })
    expect(await db.outbox.count()).toBe(1)
  })

  it('logs in and loads the account', async () => {
    fetchMock.mockResolvedValueOnce(json(200)).mockResolvedValueOnce(json(200, ACCOUNT))

    await logIn({ email: 'm@example.com', password: 'secret-secret' })

    expect(useAuth.getState().status).toBe('authenticated')
  })

  it('does not show one account the data of another', async () => {
    await remember()
    await addLocalChange()
    fetchMock.mockResolvedValueOnce(json(200)).mockResolvedValueOnce(json(200, OTHER_ACCOUNT))

    await logIn({ email: 'other@example.com', password: 'secret-secret' })

    expect(await remembered()).toEqual(OTHER_ACCOUNT)
    expect(await db.outbox.count()).toBe(0)
  })

  it('keeps local data when the same account refreshes', async () => {
    await remember()
    await addLocalChange()
    fetchMock.mockResolvedValue(json(200, ACCOUNT))

    await startAuth()

    expect(await db.outbox.count()).toBe(1)
  })

  it('logs out and wipes the device', async () => {
    await remember()
    await addLocalChange()
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await logOut()

    expect(useAuth.getState()).toMatchObject({ status: 'guest', account: null })
    expect(await remembered()).toBeUndefined()
    expect(await db.outbox.count()).toBe(0)
  })

  it('refuses to log out offline, keeping the data and the session', async () => {
    await remember()
    await addLocalChange()
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(logOut()).rejects.toThrow()

    expect(useAuth.getState().status).toBe('authenticated')
    expect(await db.outbox.count()).toBe(1)
  })
})
