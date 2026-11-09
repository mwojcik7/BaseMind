import { createRepository, type SyncedRecord } from '@/db/repository'

export interface Tag extends SyncedRecord {
  name: string
  color: string | null
}

/** Puts a tag on any record. */
export interface EntityTag extends SyncedRecord {
  entity_type: string
  entity_id: string
  tag_id: string
}

/** A link between any two records; followed backwards, it is a backlink. */
export interface EntityLink extends SyncedRecord {
  source_type: string
  source_id: string
  target_type: string
  target_id: string
  origin: 'manual' | 'parsed'
}

export const tags = createRepository<Tag>('tags')
export const entityTags = createRepository<EntityTag>('entity_tags')
export const entityLinks = createRepository<EntityLink>('entity_links')
