import { useNavigate } from '@tanstack/react-router'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import type { Note } from '@/modules/notes/repo'

/** The text field of a quick note, in the [+] sheet and the widget. */
export const NOTE_TEXT_CLASS =
  'w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'

/** "Notatka zapisana", with a way to open it. */
export function useNoteSavedToast() {
  const navigate = useNavigate()
  return (note: Note) =>
    toast.success(pl.notes.saved, {
      action: {
        label: pl.notes.open,
        onClick: () => void navigate({ to: '/notes/$noteId', params: { noteId: note.id } }),
      },
    })
}
