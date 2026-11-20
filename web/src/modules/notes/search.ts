// Kept apart from the screens, so the router can use it without loading them.

export type NotesTab = 'all' | 'folders' | 'archive'

/** The tab and folder live in the address, so coming back from a note returns to them. */
export interface NotesSearch {
  tab?: Exclude<NotesTab, 'all'>
  /** 'inbox' or a folder's id; only on the folders tab. */
  folder?: string
  /** While notes are being picked: the back button then ends picking, not leaves the screen. */
  select?: true
}

export const INBOX = 'inbox'

const ID = /^[\w-]{1,40}$/

export function validateNotesSearch(search: Record<string, unknown>): NotesSearch {
  const tab = search.tab === 'folders' || search.tab === 'archive' ? search.tab : undefined
  const folder =
    tab === 'folders' && typeof search.folder === 'string' && ID.test(search.folder)
      ? search.folder
      : undefined
  const select = search.select === true || search.select === 'true' || search.select === 1
  return { ...(tab && { tab }), ...(folder && { folder }), ...(select && { select: true }) }
}

/** For a new note: the folder it goes to. */
export function validateNoteSearch(search: Record<string, unknown>): { folder?: string } {
  return typeof search.folder === 'string' && ID.test(search.folder)
    ? { folder: search.folder }
    : {}
}
