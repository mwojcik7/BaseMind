import Dexie, { type EntityTable, type Table, type Transaction } from 'dexie'
import { renameEventColors } from './upgrades'

/** One local change waiting to be sent to the server. Sent in `seq` order. */
export interface OutboxEntry {
  seq: number
  /** Lets the server recognise a batch sent twice. */
  op_id: string
  entity: string
  record_id: string
  op: 'create' | 'update' | 'delete' | 'restore' | 'purge'
  /** The whole record for `create`, only the changed fields for `update`. */
  payload: Record<string, unknown>
  /** The record's version before this change; the server compares it to detect conflicts. */
  base_version: number
  client_ts: string
  /** Set when the server refused this change for good; it is then no longer sent. */
  rejected_reason?: string
}

export interface MetaEntry {
  key: string
  value: unknown
}

type SchemaVersion = Record<string, string | null>

/**
 * Local schema, oldest first. Like server migrations, these run on every device, so a
 * published entry must never change: to add or alter a table, append a new entry.
 */
export const SCHEMA_VERSIONS: SchemaVersion[] = [
  { outbox: '++seq, &op_id', meta: 'key' },
  {
    tags: 'id, name',
    entity_tags: 'id, [entity_type+entity_id], tag_id',
    entity_links: 'id, [source_type+source_id], [target_type+target_id]',
  },
  { reminders: 'id, status' },
  { task_lists: 'id', tasks: 'id, status, due_date, list_id' },
  { tasks: 'id, status, due_date, list_id, parent_id' },
  { events: 'id, start_date, end_date' },
  // Data only: see SCHEMA_UPGRADES.
  {},
  { events: 'id, start_date, end_date, series_id' },
]

/**
 * One-off data fixes, keyed by the schema version (position in SCHEMA_VERSIONS, from 1)
 * that runs them. They run once, on devices upgrading from an older version.
 */
export const SCHEMA_UPGRADES: Record<number, (tx: Transaction) => Promise<void>> = {
  7: renameEventColors,
}

export class LocalDatabase extends Dexie {
  outbox!: EntityTable<OutboxEntry, 'seq'>
  meta!: Table<MetaEntry, string>

  constructor(name: string, versions: SchemaVersion[]) {
    super(name)
    versions.forEach((stores, index) => {
      const version = this.version(index + 1).stores(stores)
      const upgrade = SCHEMA_UPGRADES[index + 1]
      if (upgrade) version.upgrade(upgrade)
    })
  }
}

export const db = new LocalDatabase('basemind', SCHEMA_VERSIONS)

/**
 * Removes everything stored on this device. Data here is decrypted, so it must not outlive
 * the session. All-or-nothing: if it fails, the remembered account survives too, and the
 * next start finds the session ended and tries again.
 */
export async function clearLocalData(database: LocalDatabase = db) {
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()))
  })
}
