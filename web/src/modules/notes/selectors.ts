import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { pl } from '@/i18n/pl'
import { contentLines, noteTitleText, plainLine } from '@/lib/markdown-plain'
import { hasOpenTaskItems, taskItem } from '@/lib/task-items'
import type { Note, NoteFolder } from '@/modules/notes/repo'

export { plainLine }

/** More than a card can show; CSS cuts the rest. */
const CARD_LINES = 12

const BULLET = /^\s*[-*+]\s+/
const NUMBERED = /^\s*(\d+[.)])\s+/

/** One line as a card shows it: lists keep a bullet, number or box, the rest is plain text. */
function cardLine(line: string): string {
  const box = taskItem(line)
  if (box) return `${box.checked ? '☑' : '☐'} ${plainLine(box.text)}`.trimEnd()
  const text = plainLine(line)
  if (BULLET.test(line)) return `• ${text}`
  const number = NUMBERED.exec(line)
  return number ? `${number[1]} ${text}` : text
}

/** What a note is called in lists: its title, or else its first line. */
export function noteHeading(note: Pick<Note, 'title' | 'content'>): string {
  return noteTitleText(note) || pl.notes.untitled
}

/** The text under the heading on a card, without the line already used as the heading. */
export function cardLines(note: Pick<Note, 'title' | 'content'>): string[] {
  const lines = contentLines(note.content)
  return (note.title?.trim() ? lines : lines.slice(1)).slice(0, CARD_LINES).map(cardLine)
}

export function isEmptyNote(note: Pick<Note, 'title' | 'content'>): boolean {
  return !note.title?.trim() && !note.content?.trim()
}

/** A box still to tick, in any spelling `lib/task-items.ts` accepts. */
export function hasOpenItems(note: Pick<Note, 'content'>): boolean {
  return hasOpenTaskItems(note.content)
}

export const NOTE_ORDERS = ['changed', 'created', 'title', 'oldest'] as const
export type NoteOrder = (typeof NOTE_ORDERS)[number]

const compare: Record<NoteOrder, (a: Note, b: Note) => number> = {
  changed: (a, b) => b.updated_at.localeCompare(a.updated_at),
  created: (a, b) => b.created_at.localeCompare(a.created_at),
  title: (a, b) =>
    noteHeading(a).localeCompare(noteHeading(b), 'pl', { sensitivity: 'base' }) ||
    b.updated_at.localeCompare(a.updated_at),
  oldest: (a, b) => a.created_at.localeCompare(b.created_at),
}

/** Pinned first, then in the chosen order. */
export function sortNotes(notes: readonly Note[], order: NoteOrder = 'changed'): Note[] {
  return [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || compare[order](a, b))
}

const inInbox = (note: Note, liveFolderIds: ReadonlySet<string>) =>
  note.folder_id === null || !liveFolderIds.has(note.folder_id)

/**
 * Notes outside the archive in a folder; `null` is the inbox, which also holds notes whose
 * folder no longer exists (it may come back from the trash).
 */
export function notesInFolder(
  notes: readonly Note[],
  folderId: string | null,
  liveFolderIds: ReadonlySet<string>,
): Note[] {
  return notes.filter(
    (note) =>
      !note.archived &&
      (folderId === null ? inInbox(note, liveFolderIds) : note.folder_id === folderId),
  )
}

export interface NoteFilter {
  /** undefined: any folder; null: the inbox. */
  folder?: string | null
  pinnedOnly: boolean
  /** Only notes with a box still to tick. */
  openItemsOnly: boolean
}

export const NO_FILTER: NoteFilter = { pinnedOnly: false, openItemsOnly: false }

export function isFiltering(filter: NoteFilter): boolean {
  return filter.folder !== undefined || filter.pinnedOnly || filter.openItemsOnly
}

export function filterNotes(
  notes: readonly Note[],
  filter: NoteFilter,
  liveFolderIds: ReadonlySet<string>,
): Note[] {
  return notes.filter(
    (note) =>
      (filter.folder === undefined ||
        (filter.folder === null
          ? inInbox(note, liveFolderIds)
          : note.folder_id === filter.folder)) &&
      (!filter.pinnedOnly || note.pinned) &&
      (!filter.openItemsOnly || hasOpenItems(note)),
  )
}

/** When a note was last changed: "dziś 14:30", "wczoraj", "18 lis", "18 lis 2025". */
export function changedLabel(updatedAt: string, now: Date): string {
  const at = parseISO(updatedAt)
  const days = differenceInCalendarDays(now, at)
  if (days <= 0) return `${pl.notes.today} ${format(at, 'HH:mm')}`
  if (days === 1) return pl.notes.yesterday
  const pattern = at.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy'
  return format(at, pattern, { locale: dateLocale }).replace('.', '')
}

/** By name, as Polish sorts it. */
export function sortFolders(folders: readonly NoteFolder[]): NoteFolder[] {
  return [...folders].sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

/** The notes changed last, outside the archive and leaving out empty ones. */
export function recentNotes(notes: readonly Note[], count: number): Note[] {
  return notes
    .filter((note) => !note.archived && !isEmptyNote(note))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, count)
}
