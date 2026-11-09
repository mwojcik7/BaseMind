import { waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, SCHEMA_VERSIONS } from '@/db/db'
import { createRepository, type SyncedRecord } from '@/db/repository'
import { NetworkError } from '@/lib/api'
import { useAuth, type Account } from '@/lib/auth'
import { getTheme, setTheme } from '@/lib/theme'
import {
  runSync,
  saveDashboardLayout,
  saveTheme,
  sendChangesBeforeLogOut,
  startSync,
  useSyncStatus,
} from '@/sync/engine'
import type { OutgoingOperation } from '@/sync/push'

interface Item extends SyncedRecord {
  title: string
  note: string | null
}

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

const EMPTY_PAGE = { changes: [], cursor: 0, has_more: false, settings: { theme: null } }

function serverItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'server-item',
    space_id: 'space',
    created_by: 1,
    created_at: '2026-11-09T10:00:00.000000Z',
    updated_at: '2026-11-09T10:00:00.000000Z',
    deleted_at: null,
    rev: 5,
    version: 3,
    title: 'Z serwera',
    note: null,
    ...overrides,
  }
}

function pageWith(record: Item, cursor: number) {
  return { ...EMPTY_PAGE, changes: [{ entity: 'items', record }], cursor }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('synchronisation', () => {
  const fetchMock = vi.fn<typeof fetch>()
  let items: ReturnType<typeof createRepository<Item>>
  let pushes: OutgoingOperation[][]
  let pullUrls: string[]
  let answerPush: (ops: OutgoingOperation[]) => Response
  let answerPull: () => Response | Promise<Response>

  beforeAll(async () => {
    // Test files are isolated, so only this file's database gets the extra table.
    db.close()
    db.version(SCHEMA_VERSIONS.length + 1).stores({ items: 'id' })
    await db.open()
    items = createRepository<Item>('items')
  })

  afterAll(() => db.close())

  beforeEach(() => {
    pushes = []
    pullUrls = []
    answerPush = (ops) =>
      json({ results: ops.map((op) => ({ op_id: op.op_id, status: 'applied' })) })
    answerPull = () => json(EMPTY_PAGE)

    fetchMock.mockReset()
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/sync/push') {
        const ops = (JSON.parse(String(init?.body)) as { ops: OutgoingOperation[] }).ops
        pushes.push(ops)
        return answerPush(ops)
      }
      if (url.startsWith('/api/sync/pull')) {
        pullUrls.push(url)
        return answerPull()
      }
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=token; path=/'
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
    useSyncStatus.setState({ connection: 'ok', pending: 0, rejected: 0 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function goOffline() {
    fetchMock.mockImplementation(async () => {
      throw new TypeError('Failed to fetch')
    })
  }

  function silenceConsoleError() {
    return vi.spyOn(console, 'error').mockImplementation(() => {})
  }

  it('sends changes in order and clears them once acknowledged', async () => {
    const item = await items.create({ title: 'Mleko', note: null })
    await items.update(item.id, { title: 'Chleb' })

    await runSync()

    expect(pushes[0].map((op) => op.op)).toEqual(['create', 'update'])
    expect(pushes[0][0]).not.toHaveProperty('seq')
    expect(await db.outbox.count()).toBe(0)
    expect(useSyncStatus.getState().connection).toBe('ok')
  })

  it('sends a long queue in batches of 100', async () => {
    for (let index = 0; index < 150; index++) {
      await items.create({ title: `${index}`, note: null })
    }

    await runSync()

    expect(pushes.map((batch) => batch.length)).toEqual([100, 50])
    expect(await db.outbox.count()).toBe(0)
  })

  it('removes a merged change but keeps a rejected one without resending it', async () => {
    const merged = await items.create({ title: 'A', note: null })
    const rejected = await items.create({ title: 'B', note: null })
    answerPush = (ops) =>
      json({
        results: ops.map((op) =>
          op.record_id === merged.id
            ? { op_id: op.op_id, status: 'merged' }
            : { op_id: op.op_id, status: 'rejected', reason: 'invalid' },
        ),
      })

    await runSync()
    await runSync()

    expect(pushes).toHaveLength(1)
    const [left] = await db.outbox.toArray()
    expect(left).toMatchObject({ record_id: rejected.id, rejected_reason: 'invalid' })
  })

  it('stops instead of looping when the server acknowledges nothing', async () => {
    const consoleError = silenceConsoleError()
    await items.create({ title: 'A', note: null })
    answerPush = () => json({ results: [] })

    await runSync()

    expect(pushes).toHaveLength(1)
    expect(useSyncStatus.getState().connection).toBe('error')
    consoleError.mockRestore()
  })

  it('keeps changes and reports offline when the server cannot be reached', async () => {
    await items.create({ title: 'Mleko', note: null })
    goOffline()

    await runSync()

    expect(useSyncStatus.getState().connection).toBe('offline')
    expect(await db.outbox.count()).toBe(1)
  })

  it('keeps changes and reports an error on a server failure', async () => {
    const consoleError = silenceConsoleError()
    await items.create({ title: 'Mleko', note: null })
    answerPush = () => json({ message: 'x' }, 500)

    await runSync()

    expect(useSyncStatus.getState().connection).toBe('error')
    expect(await db.outbox.count()).toBe(1)
    consoleError.mockRestore()
  })

  it('stores pulled records and remembers the cursor', async () => {
    await db.meta.put({ key: 'sync_cursor', value: 4 })
    answerPull = () => json(pageWith(serverItem(), 5))

    await runSync()

    expect(pullUrls[0]).toContain('cursor=4')
    expect(await items.get('server-item')).toMatchObject({ title: 'Z serwera', rev: 5 })
    expect((await db.meta.get('sync_cursor'))?.value).toBe(5)
  })

  it('follows pages until there are no more', async () => {
    const pages = [
      { ...pageWith(serverItem(), 5), has_more: true },
      pageWith(serverItem({ id: 'second', rev: 6 }), 6),
    ]
    answerPull = () => json(pages.shift())

    await runSync()

    expect(pullUrls).toHaveLength(2)
    expect(pullUrls[1]).toContain('cursor=5')
    expect(await items.list()).toHaveLength(2)
  })

  it('applies a deletion made on another device', async () => {
    answerPull = () => json(pageWith(serverItem(), 5))
    await runSync()
    expect(await items.get('server-item')).toBeDefined()

    answerPull = () =>
      json(pageWith(serverItem({ deleted_at: '2026-11-09T11:00:00.000000Z', rev: 6 }), 6))
    await runSync()

    expect(await items.get('server-item')).toBeUndefined()
  })

  it('keeps edits made during a sync on top of the pulled record', async () => {
    await db.table('items').put(serverItem())
    answerPull = async () => {
      await items.update('server-item', { note: 'W trakcie' })
      return json(pageWith(serverItem({ title: 'Nowszy', version: 4, rev: 6 }), 6))
    }

    await runSync()

    expect(await items.get('server-item')).toMatchObject({
      title: 'Nowszy',
      note: 'W trakcie',
      version: 5,
    })
  })

  it('does not bring back a record deleted during a sync', async () => {
    await db.table('items').put(serverItem())
    answerPull = async () => {
      await items.softDelete('server-item')
      return json(pageWith(serverItem(), 5))
    }

    await runSync()

    expect(await items.get('server-item')).toBeUndefined()
  })

  it('drops a page that arrives after signing out', async () => {
    answerPull = () => {
      useAuth.setState({ status: 'guest', account: null })
      return json(pageWith(serverItem(), 5))
    }

    await runSync()

    expect(await db.table('items').count()).toBe(0)
    expect(await db.meta.get('sync_cursor')).toBeUndefined()
  })

  it('does not move the cursor past an entity this version does not know', async () => {
    const consoleError = silenceConsoleError()
    answerPull = () =>
      json({ ...EMPTY_PAGE, changes: [{ entity: 'future', record: serverItem() }], cursor: 5 })

    await runSync()

    expect(useSyncStatus.getState().connection).toBe('error')
    expect(await db.meta.get('sync_cursor')).toBeUndefined()
    consoleError.mockRestore()
  })

  it('does nothing while signed out', async () => {
    useAuth.setState({ status: 'guest', account: null })

    await runSync()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('runs one cycle at a time and one more for a request made meanwhile', async () => {
    let finishPull: (response: Response) => void = () => {}
    answerPull = () => new Promise((resolve) => (finishPull = resolve))

    const first = runSync()
    void runSync()
    await waitFor(() => expect(pullUrls).toHaveLength(1))
    answerPull = () => json(EMPTY_PAGE)
    finishPull(json(EMPTY_PAGE))
    await first

    await waitFor(() => expect(pullUrls).toHaveLength(2))
  })

  describe('theme', () => {
    const themeRequests = () =>
      fetchMock.mock.calls.filter(([input]) => String(input) === '/api/settings')

    it('applies at once and reaches the server', async () => {
      await saveTheme('dark')

      expect(getTheme()).toBe('dark')
      await waitFor(() => expect(themeRequests()).toHaveLength(1))
      expect(JSON.parse(String(themeRequests()[0][1]?.body))).toEqual({ theme: 'dark' })
      await waitFor(async () => expect(await db.meta.get('pending_theme')).toBeUndefined())
    })

    it('stays queued while offline', async () => {
      goOffline()

      await saveTheme('dark')
      await waitFor(() => expect(useSyncStatus.getState().connection).toBe('offline'))

      expect(getTheme()).toBe('dark')
      expect((await db.meta.get('pending_theme'))?.value).toBe('dark')
    })

    it('does not let the server undo a choice made during a sync', async () => {
      setTheme('light')
      await db.meta.put({ key: 'pending_theme', value: 'dark' })
      fetchMock.mockImplementation(async (input) => {
        if (String(input) === '/api/settings') {
          setTheme('light')
          await db.meta.put({ key: 'pending_theme', value: 'light' })
          return new Response(null, { status: 204 })
        }
        return json({ ...EMPTY_PAGE, settings: { theme: 'dark' } })
      })

      await runSync()

      expect(getTheme()).toBe('light')
      expect((await db.meta.get('pending_theme'))?.value).toBe('light')
    })

    it('follows a theme chosen on another device', async () => {
      answerPull = () => json({ ...EMPTY_PAGE, settings: { theme: 'light' } })

      await runSync()

      expect(getTheme()).toBe('light')
    })

    it('keeps the device theme when the server has none', async () => {
      localStorage.setItem('basemind.theme', 'dark')

      await runSync()

      expect(getTheme()).toBe('dark')
    })
  })

  describe('dashboard layout', () => {
    const LAYOUT = { order: ['events', 'tasks'], hidden: ['tasks'] }
    const settingsRequests = () =>
      fetchMock.mock.calls.filter(([input]) => String(input) === '/api/settings')

    it('is saved at once and reaches the server', async () => {
      await saveDashboardLayout(LAYOUT)

      expect((await db.meta.get('dashboard_layout'))?.value).toEqual(LAYOUT)
      await waitFor(() => expect(settingsRequests()).toHaveLength(1))
      expect(JSON.parse(String(settingsRequests()[0][1]?.body))).toEqual({ dashboard: LAYOUT })
      await waitFor(async () =>
        expect(await db.meta.get('pending_dashboard_layout')).toBeUndefined(),
      )
    })

    it('stays queued while offline', async () => {
      goOffline()

      await saveDashboardLayout(LAYOUT)
      await waitFor(() => expect(useSyncStatus.getState().connection).toBe('offline'))

      expect((await db.meta.get('pending_dashboard_layout'))?.value).toEqual(LAYOUT)
    })

    it('stays queued when changed again during the request', async () => {
      const newer = { order: ['tasks', 'events'], hidden: [] }
      await db.meta.put({ key: 'pending_dashboard_layout', value: LAYOUT })
      fetchMock.mockImplementation(async (input) => {
        if (String(input) === '/api/settings') {
          await db.meta.put({ key: 'pending_dashboard_layout', value: newer })
          return new Response(null, { status: 204 })
        }
        return json(EMPTY_PAGE)
      })

      await runSync()

      expect((await db.meta.get('pending_dashboard_layout'))?.value).toEqual(newer)
    })

    it('follows a layout chosen on another device', async () => {
      answerPull = () => json({ ...EMPTY_PAGE, settings: { theme: null, dashboard: LAYOUT } })

      await runSync()

      expect((await db.meta.get('dashboard_layout'))?.value).toEqual(LAYOUT)
    })

    it('does not let the server undo a change that was not sent yet', async () => {
      const mine = { order: ['tasks'], hidden: [] }
      await db.meta.put({ key: 'dashboard_layout', value: mine })
      await db.meta.put({ key: 'pending_dashboard_layout', value: mine })
      fetchMock.mockImplementation(async (input) => {
        if (String(input) === '/api/settings') {
          return new Response(null, { status: 500 })
        }
        return json({ ...EMPTY_PAGE, settings: { theme: null, dashboard: LAYOUT } })
      })

      await runSync()

      expect((await db.meta.get('dashboard_layout'))?.value).toEqual(mine)
    })

    it('keeps the local layout when the server has none', async () => {
      await db.meta.put({ key: 'dashboard_layout', value: LAYOUT })

      await runSync()

      expect((await db.meta.get('dashboard_layout'))?.value).toEqual(LAYOUT)
    })
  })

  describe('before signing out', () => {
    it('reports nothing to lose without contacting the server', async () => {
      expect(await sendChangesBeforeLogOut()).toBe(0)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('sends what it can and counts the rest', async () => {
      await items.create({ title: 'A', note: null })

      expect(await sendChangesBeforeLogOut()).toBe(0)
      expect(pushes).toHaveLength(1)

      await items.create({ title: 'B', note: null })
      answerPush = (ops) =>
        json({ results: ops.map((op) => ({ op_id: op.op_id, status: 'rejected', reason: 'x' })) })

      expect(await sendChangesBeforeLogOut()).toBe(1)
    })

    it('reports being offline instead of offering to lose the changes', async () => {
      await items.create({ title: 'A', note: null })
      goOffline()

      await expect(sendChangesBeforeLogOut()).rejects.toThrow(NetworkError)
    })
  })

  describe('triggers', () => {
    let stop: () => void

    afterEach(() => stop())

    it('syncs at start for a signed-in account', async () => {
      stop = startSync()

      await waitFor(() => expect(pullUrls).toHaveLength(1))
    })

    it('syncs shortly after a local change', async () => {
      stop = startSync({ debounceMs: 10 })
      await waitFor(() => expect(pullUrls).toHaveLength(1))

      await items.create({ title: 'Mleko', note: null })

      await waitFor(() => expect(pushes).toHaveLength(1))
      await waitFor(() => expect(useSyncStatus.getState().pending).toBe(0))
    })

    it('counts waiting and rejected changes separately', async () => {
      await items.create({ title: 'A', note: null })
      await items.create({ title: 'B', note: null })
      const [, second] = await db.outbox.toArray()
      await db.outbox.update(second.seq, { rejected_reason: 'x' })
      goOffline()

      stop = startSync()

      await waitFor(() =>
        expect(useSyncStatus.getState()).toMatchObject({ pending: 1, rejected: 1 }),
      )
    })

    it('syncs when the connection comes back', async () => {
      stop = startSync()
      await waitFor(() => expect(pullUrls).toHaveLength(1))

      window.dispatchEvent(new Event('online'))

      await waitFor(() => expect(pullUrls).toHaveLength(2))
    })

    it('syncs when an account signs in, but not when the same one refreshes', async () => {
      useAuth.setState({ status: 'guest', account: null })
      stop = startSync()

      useAuth.setState({ status: 'authenticated', account: ACCOUNT })
      await waitFor(() => expect(pullUrls).toHaveLength(1))

      useAuth.setState({ status: 'authenticated', account: { ...ACCOUNT } })
      await wait(30)

      expect(pullUrls).toHaveLength(1)
    })

    it('stops reacting once stopped', async () => {
      stop = startSync()
      await waitFor(() => expect(pullUrls).toHaveLength(1))

      stop()
      window.dispatchEvent(new Event('online'))
      await wait(30)

      expect(pullUrls).toHaveLength(1)
    })
  })
})
