import { createRepository, type SyncedRecord } from '@/db/repository'

/** Folders are one level deep. */
export interface NoteFolder extends SyncedRecord {
  name: string
}

export interface Note extends SyncedRecord {
  /** Null, or a folder that no longer exists, means the inbox. */
  folder_id: string | null
  /** Optional: without one, lists show the first line of the content. */
  title: string | null
  /** Markdown. */
  content: string | null
  pinned: boolean
  archived: boolean
}

/** The server's limit (`Note::MAX_CONTENT`), in characters as the server counts them. */
export const MAX_NOTE_CONTENT = 100_000

export const noteFolders = createRepository<NoteFolder>('note_folders')
export const notes = createRepository<Note>('notes')
