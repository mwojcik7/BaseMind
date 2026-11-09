// Loaded inside the search worker: type-only imports, and nothing from React.
import type { SyncedRecord } from '@/db/repository'
import type { Tag } from '@/db/tags'
import type { SearchDocument } from '@/search/engine'

export interface SearchSource<T extends SyncedRecord = SyncedRecord> {
  /** The local table to index. */
  entity: string
  title: (record: T) => string
  /** Extra searchable content, such as a note's body. */
  text?: (record: T) => string
  subtitle?: (record: T) => string | null
  /** Where selecting the result leads. Without it the result is only shown. */
  href?: (record: T) => string
}

function source<T extends SyncedRecord>(definition: SearchSource<T>) {
  return definition as unknown as SearchSource
}

/**
 * Everything the search covers. A module adds one entry here and one in presentation.tsx.
 * The order is the order of the result groups.
 */
export const searchSources: readonly SearchSource[] = [
  source<Tag>({ entity: 'tags', title: (tag) => tag.name }),
]

export function toDocument(from: SearchSource, record: SyncedRecord): SearchDocument {
  return {
    id: `${from.entity}:${record.id}`,
    entity: from.entity,
    title: from.title(record),
    subtitle: from.subtitle?.(record) ?? null,
    href: from.href?.(record) ?? null,
    text: from.text?.(record) ?? '',
  }
}
