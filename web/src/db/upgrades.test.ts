import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalDatabase, SCHEMA_VERSIONS, type OutboxEntry } from '@/db/db'

const NAME = 'colour-upgrade-test'

function queued(
  seq: number,
  entity: string,
  payload: Record<string, unknown>,
  rejected?: string,
): OutboxEntry {
  return {
    seq,
    op_id: `op-${seq}`,
    entity,
    record_id: `r-${seq}`,
    op: 'create',
    payload,
    base_version: 0,
    client_ts: '2026-11-15T22:59:10.629Z',
    ...(rejected ? { rejected_reason: rejected } : {}),
  }
}

describe('renaming the old event colours', () => {
  afterEach(() => Dexie.delete(NAME))

  it('fixes stored events and queued changes, and sends again those refused for the colour', async () => {
    const before = new LocalDatabase(NAME, SCHEMA_VERSIONS.slice(0, 6))
    await before.table('events').bulkPut([
      { id: 'a', color: 'pink' },
      { id: 'b', color: 'teal' },
      { id: 'c', color: 'red' },
      { id: 'd', color: null },
    ])
    await before.outbox.bulkPut([
      queued(1, 'events', { color: 'pink' }, 'invalid'),
      queued(2, 'events', { color: 'teal' }),
      queued(3, 'events', { color: 'red' }, 'invalid'),
      queued(4, 'tags', { color: 'pink' }, 'invalid'),
      queued(5, 'events', { color: 'pink' }, 'deleted'),
    ])
    before.close()

    const after = new LocalDatabase(NAME, SCHEMA_VERSIONS)
    await after.open()

    const colours = (await after.table('events').toArray()).map((event) => [event.id, event.color])
    expect(colours).toEqual([
      ['a', 'gray'],
      ['b', 'cyan'],
      ['c', 'red'],
      ['d', null],
    ])
    const outbox = (await after.outbox.toArray()).map((entry) => [
      entry.payload.color,
      entry.rejected_reason,
    ])
    expect(outbox).toEqual([
      ['gray', undefined],
      ['cyan', undefined],
      ['red', 'invalid'],
      ['pink', 'invalid'],
      ['gray', 'deleted'],
    ])
    after.close()
  })
})
