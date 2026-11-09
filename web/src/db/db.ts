import Dexie, { type EntityTable, type Table } from 'dexie'

/** One local change waiting to be sent to the server. Sent in `seq` order. */
export interface OutboxEntry {
  seq: number
  /** Lets the server recognise a batch sent twice. */
  op_id: string
  entity: string
  record_id: string
  op: 'create' | 'update' | 'delete'
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
]

export class LocalDatabase extends Dexie {
  outbox!: EntityTable<OutboxEntry, 'seq'>
  meta!: Table<MetaEntry, string>

  constructor(name: string, versions: SchemaVersion[]) {
    super(name)
    versions.forEach((stores, index) => this.version(index + 1).stores(stores))
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
