import { toast } from '@/components/ui/toaster'
import { db } from '@/db/db'
import { createRepository, RecordNotFoundError, type SyncedRecord } from '@/db/repository'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'

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

/** The server's limit (`Note::MAX_CONTENT`). The server counts characters, never more than here. */
export const MAX_NOTE_CONTENT = 100_000
export const MAX_NOTE_TITLE = 500

export const noteFolders = createRepository<NoteFolder>('note_folders')
export const notes = createRepository<Note>('notes')

const UNDO_VISIBLE_MS = 8000

export function reportNoteError(error: unknown) {
  // Deleted meanwhile, e.g. on another device: there is nothing left to change.
  if (!(error instanceof RecordNotFoundError)) {
    toast.error(errorMessage(error))
  }
}

/** All the notes change, or none. */
function together(work: () => Promise<void>) {
  return db.transaction('rw', db.table('notes'), db.outbox, work)
}

function offerUndo(message: string, undo: () => Promise<void>) {
  toast.success(message, {
    duration: UNDO_VISIBLE_MS,
    action: {
      label: pl.common.undo,
      onClick: () => {
        undo().catch((error: unknown) => toast.error(errorMessage(error)))
      },
    },
  })
}

/** Archiving is one tap away, so it can be undone. */
export async function setArchived(ids: readonly string[], archived: boolean) {
  const change = (value: boolean) =>
    together(async () => {
      for (const id of ids) await notes.update(id, { archived: value })
    })

  await change(archived)
  offerUndo(
    archived ? pl.notes.archivedCount(ids.length) : pl.notes.unarchivedCount(ids.length),
    () => change(!archived),
  )
}

/** To the trash, with a way back for all of them at once. */
export async function deleteNotes(ids: readonly string[]) {
  await together(async () => {
    for (const id of ids) await notes.softDelete(id)
  })
  offerUndo(pl.notes.deletedCount(ids.length), () =>
    together(async () => {
      for (const id of ids) await notes.restore(id)
    }),
  )
}

export async function moveNotes(ids: readonly string[], folderId: string | null, name: string) {
  await together(async () => {
    for (const id of ids) await notes.update(id, { folder_id: folderId })
  })
  toast.success(pl.notes.moved(name))
}

/** A note left empty is not worth keeping, even in the trash. */
export async function discardNote(id: string) {
  await notes.softDelete(id)
  await notes.purge(id)
}
