import type { Transaction } from 'dexie'
import type { OutboxEntry } from './db'

/**
 * Event colours renamed on 2026-11-16 (pink → gray, teal → cyan). The server no longer
 * accepts the old names, but a device could still hold events and changes that use them.
 */
const RENAMED_EVENT_COLORS = new Map([
  ['pink', 'gray'],
  ['teal', 'cyan'],
])

/**
 * Moves stored events and queued changes to the new colour names. A change the server
 * refused only because of the old colour is sent again.
 */
export async function renameEventColors(tx: Transaction) {
  await tx
    .table<{ color?: string | null }>('events')
    .toCollection()
    .modify((event) => {
      const renamed = RENAMED_EVENT_COLORS.get(event.color ?? '')
      if (renamed) event.color = renamed
    })

  await tx
    .table<OutboxEntry>('outbox')
    .toCollection()
    .modify((entry) => {
      if (entry.entity !== 'events') return
      const renamed = RENAMED_EVENT_COLORS.get(String(entry.payload.color ?? ''))
      if (!renamed) return
      entry.payload.color = renamed
      if (entry.rejected_reason === 'invalid') delete entry.rejected_reason
    })
}
