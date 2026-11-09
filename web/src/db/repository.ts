import { v7 as uuidv7 } from 'uuid'
import { db as defaultDb, type LocalDatabase, type OutboxEntry } from '@/db/db'
import { useAuth } from '@/lib/auth'

/** Fields every synchronised record has (`projekt.md`, 4.1). */
export interface SyncedRecord {
  id: string
  space_id: string
  created_by: number
  created_at: string
  updated_at: string
  /** Deleted records stay as tombstones, so other devices learn about the deletion. */
  deleted_at: string | null
  /** Assigned by the server; null until the record has been synchronised. */
  rev: number | null
  version: number
}

export type OwnFields<T extends SyncedRecord> = Omit<T, keyof SyncedRecord>

export class RecordNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`No ${entity} record with id ${id}`)
    this.name = 'RecordNotFoundError'
  }
}

/** Without an explicit space, new records go to the private one. */
function writableSpace(spaceId?: string) {
  const account = useAuth.getState().account
  if (!account) {
    throw new Error('Cannot write local data while signed out')
  }

  const space = account.spaces.find((candidate) =>
    spaceId ? candidate.id === spaceId : candidate.type === 'personal',
  )
  // The server would refuse this too, but only later, leaving the change stuck in the outbox.
  if (!space || space.role === 'viewer') {
    throw new Error('No write access to this space')
  }

  return { spaceId: space.id, userId: account.user.id }
}

/**
 * The one way modules read and write their data. Every write saves the record and its
 * outbox entry in a single transaction, so a change can never be saved but not sent.
 */
export function createRepository<T extends SyncedRecord>(
  entity: string,
  database: LocalDatabase = defaultDb,
) {
  const table = database.table<T, string>(entity)

  function enqueue(
    op: OutboxEntry['op'],
    recordId: string,
    payload: Record<string, unknown>,
    baseVersion: number,
    timestamp: string,
  ) {
    return database.outbox.add({
      op_id: uuidv7(),
      entity,
      record_id: recordId,
      op,
      payload,
      base_version: baseVersion,
      client_ts: timestamp,
    })
  }

  /** Must be called inside a transaction. */
  async function requireLive(id: string) {
    const record = await table.get(id)
    if (!record || record.deleted_at !== null) {
      throw new RecordNotFoundError(entity, id)
    }
    writableSpace(record.space_id)
    return record
  }

  return {
    async get(id: string): Promise<T | undefined> {
      const record = await table.get(id)
      return record?.deleted_at === null ? record : undefined
    },

    /** Oldest first: UUIDv7 ids sort by creation time. */
    list(): Promise<T[]> {
      return table.filter((record) => record.deleted_at === null).toArray()
    },

    async create(data: OwnFields<T>, options: { spaceId?: string } = {}): Promise<T> {
      const { spaceId, userId } = writableSpace(options.spaceId)
      const timestamp = new Date().toISOString()
      const record = {
        ...data,
        id: uuidv7(),
        space_id: spaceId,
        created_by: userId,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        rev: null,
        version: 1,
      } as unknown as T

      await database.transaction('rw', table, database.outbox, async () => {
        await table.add(record)
        await enqueue(
          'create',
          record.id,
          record as unknown as Record<string, unknown>,
          0,
          timestamp,
        )
      })

      return record
    },

    /** Saving the same values is not a change: it bumps no version and sends nothing. */
    update(id: string, patch: Partial<OwnFields<T>>): Promise<T> {
      return database.transaction('rw', table, database.outbox, async () => {
        const current = await requireLive(id)
        const changes = Object.fromEntries(
          Object.entries(patch).filter(
            ([field, value]) =>
              value !== undefined &&
              JSON.stringify(value) !== JSON.stringify(current[field as keyof T]),
          ),
        )

        if (Object.keys(changes).length === 0) {
          return current
        }

        const timestamp = new Date().toISOString()
        const next = {
          ...current,
          ...changes,
          updated_at: timestamp,
          version: current.version + 1,
        }
        await table.put(next)
        await enqueue('update', id, changes, current.version, timestamp)

        return next
      })
    },

    /** Deleting an already deleted record does nothing. */
    softDelete(id: string): Promise<void> {
      return database.transaction('rw', table, database.outbox, async () => {
        const existing = await table.get(id)
        if (existing && existing.deleted_at !== null) {
          return
        }

        const current = await requireLive(id)
        const timestamp = new Date().toISOString()
        await table.put({
          ...current,
          deleted_at: timestamp,
          updated_at: timestamp,
          version: current.version + 1,
        })
        await enqueue('delete', id, {}, current.version, timestamp)
      })
    },
  }
}

export type Repository<T extends SyncedRecord> = ReturnType<typeof createRepository<T>>
