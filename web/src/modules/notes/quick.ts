import { create } from 'zustand'
import { notes, type Note } from '@/modules/notes/repo'

/**
 * The folder open on the notes screen, so the [+] sheet adds to it by default.
 * Undefined while no folder is open; null for the inbox.
 */
export const useActiveNoteFolder = create<{ folderId: string | null | undefined }>(() => ({
  folderId: undefined,
}))

const FOLDER_KEY = 'notes_quick_folder'

/** The folder last picked for a quick note on this device; null for the inbox. */
export function rememberedFolder(): string | null {
  try {
    return localStorage.getItem(FOLDER_KEY) || null
  } catch {
    return null
  }
}

export function rememberFolder(folderId: string | null) {
  try {
    if (folderId) localStorage.setItem(FOLDER_KEY, folderId)
    else localStorage.removeItem(FOLDER_KEY)
  } catch {
    // Storage blocked: the next note starts in the inbox.
  }
}

/**
 * The folder a quick note starts in: the one open on the notes screen, or the last one
 * picked. May name a folder deleted since: `liveFolder` checks it.
 */
export function startingFolder(): string | null {
  const open = useActiveNoteFolder.getState().folderId
  return open !== undefined ? open : rememberedFolder()
}

/** The folder if it still exists, else the inbox. */
export function liveFolder(
  folderId: string | null,
  folders: readonly { id: string }[] | undefined,
): string | null {
  return folderId && folders?.some((folder) => folder.id === folderId) ? folderId : null
}

/** Saves a note from the [+] sheet or the widget and remembers its folder for the next one. */
export async function createQuickNote(fields: {
  title: string
  content: string
  folderId: string | null
}): Promise<Note> {
  const note = await notes.create({
    folder_id: fields.folderId,
    title: fields.title.trim() || null,
    content: fields.content.trim() ? fields.content : null,
    pinned: false,
    archived: false,
  })
  rememberFolder(fields.folderId)
  return note
}
