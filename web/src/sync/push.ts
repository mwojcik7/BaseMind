// Imported by the Service Worker too, so it must not depend on the DOM or on React.
// Relative imports because the worker is bundled without the "@" alias.
import { v7 as uuidv7 } from 'uuid'
import { db, type OutboxEntry } from '../db/db'

export const BACKGROUND_SYNC_TAG = 'basemind-push'

/** The worker's message to open windows: the server has news, fetch it now. */
export const SYNC_NOW_MESSAGE = 'SYNC_NOW'

const BATCH_SIZE = 100

export type OutgoingOperation = Omit<OutboxEntry, 'seq' | 'rejected_reason'>

export interface PushResult {
  op_id: string
  status: 'applied' | 'merged' | 'rejected'
  reason?: string
}

export type PostOperations = (
  ops: OutgoingOperation[],
  deviceId: string,
) => Promise<{ results: PushResult[] }>

const DEVICE_ID_KEY = 'device_id'

/**
 * This installation's own id, sent with every change. The server uses it to tell a note
 * changed on another device from this device's own earlier change (conflict copies).
 */
export async function deviceId(): Promise<string> {
  return db.transaction('rw', db.meta, async () => {
    const known = (await db.meta.get(DEVICE_ID_KEY))?.value
    if (typeof known === 'string') return known

    const id = uuidv7()
    await db.meta.put({ key: DEVICE_ID_KEY, value: id })
    return id
  })
}

/**
 * Entities whose unsent changes to one record are sent as one. Notes save every few seconds
 * while typing: written offline, that is hundreds of changes, and each one would meet the
 * other device's version as a separate conflict (and a separate conflict copy).
 */
const COMBINED_ENTITIES = new Set(['notes'])

/**
 * Joins the unsent updates of each record in COMBINED_ENTITIES into the first of them: the
 * version the device started from, the latest values and the moment of the last change.
 * Anything else sent for the record in between (a delete, a restore) ends the run.
 */
export async function combineUpdates() {
  await db.transaction('rw', db.outbox, async () => {
    const entries = await db.outbox
      .orderBy('seq')
      .filter((entry) => !entry.rejected_reason && COMBINED_ENTITIES.has(entry.entity))
      .toArray()

    const runs = new Map<string, OutboxEntry>()
    const changed = new Set<OutboxEntry>()
    for (const entry of entries) {
      const key = `${entry.entity}:${entry.record_id}`
      const first = runs.get(key)
      if (entry.op !== 'update') {
        runs.delete(key)
      } else if (!first) {
        runs.set(key, entry)
      } else {
        first.payload = { ...first.payload, ...entry.payload }
        first.client_ts = entry.client_ts
        changed.add(first)
        await db.outbox.delete(entry.seq)
      }
    }

    // A new op_id: the first change may already be on its way, and the server would
    // ignore this fuller version as a repeat of it.
    for (const entry of changed) {
      await db.outbox.put({ ...entry, op_id: uuidv7() })
    }
  })
}

/**
 * Sends the outbox in order until nothing is left to send. A failed request throws and
 * leaves the rest queued; sending a batch twice is safe because the server remembers op_id.
 * Rejected changes stay in the outbox, unsent, so they are reported rather than lost.
 */
export async function pushOutbox(post: PostOperations) {
  await combineUpdates()
  const device = await deviceId()

  for (;;) {
    const batch = await db.outbox
      .orderBy('seq')
      .filter((entry) => !entry.rejected_reason)
      .limit(BATCH_SIZE)
      .toArray()

    if (batch.length === 0) {
      return
    }

    const { results } = await post(
      batch.map((entry) => ({
        op_id: entry.op_id,
        entity: entry.entity,
        record_id: entry.record_id,
        op: entry.op,
        payload: entry.payload,
        base_version: entry.base_version,
        client_ts: entry.client_ts,
      })),
      device,
    )

    if (results.length === 0) {
      throw new Error('The server did not acknowledge any operation')
    }

    await db.transaction('rw', db.outbox, async () => {
      for (const result of results) {
        const entry = db.outbox.where('op_id').equals(result.op_id)
        if (result.status === 'rejected') {
          await entry.modify({ rejected_reason: result.reason ?? 'unknown' })
        } else {
          await entry.delete()
        }
      }
    })
  }
}
