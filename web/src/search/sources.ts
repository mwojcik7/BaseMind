// Loaded inside the search worker: besides types only plain modules (texts, Markdown to
// text), nothing from React or the DOM.
import type { SyncedRecord } from '@/db/repository'
import type { Tag } from '@/db/tags'
import { pl } from '@/i18n/pl'
import { markdownToPlain, noteBodyText, noteTitleText } from '@/lib/markdown-plain'
import type { CalendarEvent } from '@/modules/calendar/repo'
import type { Note } from '@/modules/notes/repo'
import type { Task } from '@/modules/tasks/repo'
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
  source<Task>({
    entity: 'tasks',
    title: (task) => task.title,
    text: (task) => markdownToPlain(task.notes),
    subtitle: (task) => task.due_date?.split('-').reverse().join('.') ?? null,
    href: (task) => `/tasks/${task.id}`,
  }),
  source<CalendarEvent>({
    entity: 'events',
    title: (event) => event.title,
    text: (event) =>
      [event.location, markdownToPlain(event.description)].filter(Boolean).join(' · '),
    subtitle: (event) =>
      [event.start_date.split('-').reverse().join('.'), event.start_time].filter(Boolean).join(' '),
    href: (event) => `/calendar/events/${event.id}`,
  }),
  source<Note>({
    entity: 'notes',
    title: (note) => noteTitleText(note) || pl.notes.untitled,
    text: noteBodyText,
    subtitle: (note) => (note.archived ? pl.notes.tabs.archive : null),
    href: (note) => `/notes/${note.id}`,
  }),
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
