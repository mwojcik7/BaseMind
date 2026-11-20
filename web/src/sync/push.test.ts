import { afterEach, describe, expect, it, vi } from 'vitest'
import { db, type OutboxEntry } from '@/db/db'
import { combineUpdates, deviceId, pushOutbox, type PostOperations } from '@/sync/push'

type Entry = Omit<OutboxEntry, 'seq'>

let opNumber = 0

function entry(fields: Partial<Entry>): Entry {
  opNumber += 1
  return {
    op_id: `op-${opNumber}`,
    entity: 'notes',
    record_id: 'note-1',
    op: 'update',
    payload: {},
    base_version: 1,
    client_ts: `2026-11-20T10:00:0${opNumber % 10}.000Z`,
    ...fields,
  }
}

async function queue(...entries: Entry[]) {
  for (const item of entries) await db.outbox.add(item as OutboxEntry)
}

const outbox = () => db.outbox.orderBy('seq').toArray()

afterEach(async () => {
  await db.outbox.clear()
  await db.meta.clear()
})

describe('combineUpdates', () => {
  it('sends the unsent updates of a note as one change', async () => {
    await queue(
      entry({ payload: { content: 'm' }, base_version: 1, client_ts: '2026-11-20T10:00:00.000Z' }),
      entry({
        payload: { title: 'Zakupy' },
        base_version: 2,
        client_ts: '2026-11-20T10:00:01.000Z',
      }),
      entry({
        payload: { content: 'mleko' },
        base_version: 3,
        client_ts: '2026-11-20T10:00:02.000Z',
      }),
    )

    await combineUpdates()

    const [combined, ...rest] = await outbox()
    expect(rest).toEqual([])
    expect(combined).toMatchObject({
      op: 'update',
      payload: { content: 'mleko', title: 'Zakupy' },
      // The version the device started from, the moment of the last change.
      base_version: 1,
      client_ts: '2026-11-20T10:00:02.000Z',
    })
    // A fuller version under a new id: the first change may be on its way already.
    expect(combined.op_id).not.toBe('op-1')
  })

  it('keeps notes apart, and other entities as they are', async () => {
    await queue(
      entry({ record_id: 'a', payload: { content: '1' } }),
      entry({ record_id: 'b', payload: { content: '2' } }),
      entry({ record_id: 'a', payload: { content: '3' } }),
      entry({ entity: 'tasks', record_id: 't', payload: { title: 'x' } }),
      entry({ entity: 'tasks', record_id: 't', payload: { title: 'y' } }),
    )

    await combineUpdates()

    expect((await outbox()).map((item) => [item.entity, item.record_id, item.payload])).toEqual([
      ['notes', 'a', { content: '3' }],
      ['notes', 'b', { content: '2' }],
      ['tasks', 't', { title: 'x' }],
      ['tasks', 't', { title: 'y' }],
    ])
  })

  it('does not join changes across a delete or with a create', async () => {
    await queue(
      entry({ op: 'create', payload: { content: '' } }),
      entry({ payload: { content: '1' } }),
      entry({ op: 'delete' }),
      entry({ op: 'restore' }),
      entry({ payload: { content: '2' } }),
      entry({ payload: { content: '3' } }),
    )

    await combineUpdates()

    expect((await outbox()).map((item) => [item.op, item.payload])).toEqual([
      ['create', { content: '' }],
      ['update', { content: '1' }],
      ['delete', {}],
      ['restore', {}],
      ['update', { content: '3' }],
    ])
  })

  it('leaves changes the server refused alone', async () => {
    await queue(
      entry({ payload: { content: '1' }, rejected_reason: 'invalid' }),
      entry({ payload: { content: '2' } }),
    )

    await combineUpdates()

    expect((await outbox()).map((item) => item.payload)).toEqual([
      { content: '1' },
      { content: '2' },
    ])
  })
})

describe('deviceId', () => {
  it('stays the same for this installation', async () => {
    const first = await deviceId()
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(await deviceId()).toBe(first)
  })
})

describe('pushOutbox', () => {
  it('sends the combined change with the device id', async () => {
    await queue(entry({ payload: { content: 'm' } }), entry({ payload: { content: 'mleko' } }))
    const post = vi.fn<PostOperations>(async (ops) => ({
      results: ops.map((op) => ({ op_id: op.op_id, status: 'applied' as const })),
    }))

    await pushOutbox(post)

    expect(post).toHaveBeenCalledOnce()
    const [ops, device] = post.mock.calls[0]
    expect(ops).toHaveLength(1)
    expect(ops[0].payload).toEqual({ content: 'mleko' })
    expect(device).toBe(await deviceId())
    expect(await outbox()).toEqual([])
  })
})
