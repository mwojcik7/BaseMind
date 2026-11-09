import { act, renderHook, waitFor } from '@testing-library/react'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearLocalData, LocalDatabase, SCHEMA_VERSIONS } from '@/db/db'
import { useRecord, useRecords } from '@/db/hooks'
import { createRepository, RecordNotFoundError, type SyncedRecord } from '@/db/repository'
import { useAuth, type Account } from '@/lib/auth'

interface Item extends SyncedRecord {
  title: string
  note: string | null
  details: { size: number }
}

const NEW_ITEM = { title: 'Mleko', note: null, details: { size: 1 } }

const ACCOUNT: Account = {
  user: { id: 7, display_name: 'Test', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [
    { id: 'shared-view', name: 'Podgląd', type: 'shared', role: 'viewer' },
    { id: 'private', name: 'Moja', type: 'personal', role: 'owner' },
    { id: 'shared-edit', name: 'Dom', type: 'shared', role: 'editor' },
  ],
}

describe('repository', () => {
  let database: LocalDatabase
  let items: ReturnType<typeof createRepository<Item>>

  const outbox = () => database.outbox.orderBy('seq').toArray()

  beforeEach(() => {
    database = new LocalDatabase('repository-test', [...SCHEMA_VERSIONS, { items: 'id' }])
    items = createRepository<Item>('items', database)
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
  })

  afterEach(async () => {
    database.close()
    await Dexie.delete('repository-test')
  })

  it('fills in the common fields and queues the whole record', async () => {
    const item = await items.create(NEW_ITEM)

    expect(item).toMatchObject({
      ...NEW_ITEM,
      space_id: 'private',
      created_by: 7,
      deleted_at: null,
      rev: null,
      version: 1,
    })
    expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/)
    expect(await items.get(item.id)).toEqual(item)

    const [entry] = await outbox()
    expect(entry).toMatchObject({
      entity: 'items',
      record_id: item.id,
      op: 'create',
      base_version: 0,
      payload: { title: 'Mleko' },
    })
  })

  it('cannot have its common fields overridden by the data', async () => {
    const item = await items.create({ ...NEW_ITEM, id: 'mine', version: 99 } as typeof NEW_ITEM)

    expect(item.id).not.toBe('mine')
    expect(item.version).toBe(1)
  })

  it('queues only the changed fields, against the previous version', async () => {
    const item = await items.create(NEW_ITEM)

    const updated = await items.update(item.id, { title: 'Chleb', note: null })

    expect(updated).toMatchObject({ title: 'Chleb', version: 2 })
    const [, entry] = await outbox()
    expect(entry).toMatchObject({
      op: 'update',
      base_version: 1,
      payload: { title: 'Chleb' },
    })
    expect(entry.payload).not.toHaveProperty('note')
  })

  it('treats an equal nested value as no change', async () => {
    const item = await items.create(NEW_ITEM)

    const same = await items.update(item.id, { details: { size: 1 }, title: undefined })

    expect(same.version).toBe(1)
    expect(await outbox()).toHaveLength(1)
  })

  it('chains base versions across several offline edits', async () => {
    const item = await items.create(NEW_ITEM)
    await items.update(item.id, { title: 'A' })
    await items.update(item.id, { title: 'B' })
    await items.softDelete(item.id)

    expect((await outbox()).map((entry) => entry.base_version)).toEqual([0, 1, 2, 3])
  })

  it('hides deleted records but keeps the tombstone', async () => {
    const kept = await items.create(NEW_ITEM)
    const removed = await items.create({ ...NEW_ITEM, title: 'Usunięty' })

    await items.softDelete(removed.id)

    expect(await items.get(removed.id)).toBeUndefined()
    expect((await items.list()).map((item) => item.id)).toEqual([kept.id])
    const tombstone = await database.table<Item, string>('items').get(removed.id)
    expect(tombstone).toMatchObject({ version: 2, deleted_at: expect.any(String) })
    expect((await outbox()).at(-1)).toMatchObject({ op: 'delete', record_id: removed.id })
  })

  it('ignores a second delete of the same record', async () => {
    const item = await items.create(NEW_ITEM)
    await items.softDelete(item.id)

    await items.softDelete(item.id)

    expect(await outbox()).toHaveLength(2)
  })

  it('refuses to change missing or deleted records', async () => {
    const item = await items.create(NEW_ITEM)
    await items.softDelete(item.id)

    await expect(items.update(item.id, { title: 'X' })).rejects.toThrow(RecordNotFoundError)
    await expect(items.update('missing', { title: 'X' })).rejects.toThrow(RecordNotFoundError)
    await expect(items.softDelete('missing')).rejects.toThrow(RecordNotFoundError)
  })

  it('lists records from oldest to newest', async () => {
    const created = []
    for (const title of ['1', '2', '3']) {
      created.push(await items.create({ ...NEW_ITEM, title }))
    }

    expect((await items.list()).map((item) => item.id)).toEqual(created.map((item) => item.id))
  })

  it('saves nothing when the outbox entry cannot be written', async () => {
    const item = await items.create(NEW_ITEM)
    const original = database.outbox.add.bind(database.outbox)
    database.outbox.add = () => Promise.reject(new Error('disk full')) as never

    await expect(items.create({ ...NEW_ITEM, title: 'Nowy' })).rejects.toThrow('disk full')
    await expect(items.update(item.id, { title: 'Zmiana' })).rejects.toThrow('disk full')
    database.outbox.add = original

    expect(await items.list()).toEqual([item])
  })

  it('writes to a chosen space the user can edit', async () => {
    expect((await items.create(NEW_ITEM, { spaceId: 'shared-edit' })).space_id).toBe('shared-edit')
  })

  it('refuses spaces the user cannot write to', async () => {
    await expect(items.create(NEW_ITEM, { spaceId: 'shared-view' })).rejects.toThrow()
    await expect(items.create(NEW_ITEM, { spaceId: 'foreign' })).rejects.toThrow()
    expect(await outbox()).toHaveLength(0)
  })

  it('refuses to write while signed out', async () => {
    useAuth.setState({ status: 'guest', account: null })

    await expect(items.create(NEW_ITEM)).rejects.toThrow()
  })

  it('removes records, the outbox and meta when clearing', async () => {
    await items.create(NEW_ITEM)
    await database.meta.put({ key: 'cursor', value: 5 })

    await clearLocalData(database)

    expect(await items.list()).toEqual([])
    expect(await outbox()).toEqual([])
    expect(await database.meta.count()).toBe(0)
  })

  describe('hooks', () => {
    it('updates the list when data changes', async () => {
      const { result } = renderHook(() => useRecords(items))
      await waitFor(() => expect(result.current).toEqual([]))

      await act(() => items.create(NEW_ITEM))

      await waitFor(() => expect(result.current?.map((item) => item.title)).toEqual(['Mleko']))
    })

    it('follows one record until it is deleted', async () => {
      const item = await items.create(NEW_ITEM)
      const { result } = renderHook(() => useRecord(items, item.id))
      await waitFor(() => expect(result.current?.title).toBe('Mleko'))

      await act(() => items.update(item.id, { title: 'Chleb' }))
      await waitFor(() => expect(result.current?.title).toBe('Chleb'))

      await act(() => items.softDelete(item.id))
      await waitFor(() => expect(result.current).toBeUndefined())
    })
  })
})
