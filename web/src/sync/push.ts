// Imported by the Service Worker too, so it must not depend on the DOM or on React.
// Relative imports because the worker is bundled without the "@" alias.
import { db, type OutboxEntry } from '../db/db'

export const BACKGROUND_SYNC_TAG = 'basemind-push'

const BATCH_SIZE = 100

export type OutgoingOperation = Omit<OutboxEntry, 'seq' | 'rejected_reason'>

export interface PushResult {
  op_id: string
  status: 'applied' | 'merged' | 'rejected'
  reason?: string
}

export type PostOperations = (ops: OutgoingOperation[]) => Promise<{ results: PushResult[] }>

/**
 * Sends the outbox in order until nothing is left to send. A failed request throws and
 * leaves the rest queued; sending a batch twice is safe because the server remembers op_id.
 * Rejected changes stay in the outbox, unsent, so they are reported rather than lost.
 */
export async function pushOutbox(post: PostOperations) {
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
