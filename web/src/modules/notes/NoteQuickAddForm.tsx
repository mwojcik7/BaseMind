import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { NoteFolderSelect } from '@/modules/notes/NoteFolderSelect'
import { createQuickNote, liveFolder, startingFolder } from '@/modules/notes/quick'
import { NOTE_TEXT_CLASS, useNoteSavedToast } from '@/modules/notes/quick-saved'
import { MAX_NOTE_CONTENT, MAX_NOTE_TITLE, noteFolders } from '@/modules/notes/repo'

/** A note from the [+] sheet: an optional title, the text and the folder it goes to. */
export function NoteQuickAddForm({ onDone }: { onDone: () => void }) {
  const folders = useRecords(noteFolders)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  // Read once: the folder open on the notes screen, or the one picked last time.
  const [preferred] = useState(startingFolder)
  // undefined: not picked, so the preferred one; null: the inbox picked on purpose.
  const [picked, setPicked] = useState<string | null>()
  const [saving, setSaving] = useState(false)
  const showSaved = useNoteSavedToast()

  const folderId = liveFolder(picked !== undefined ? picked : preferred, folders)
  const ready = title.trim().length > 0 || content.trim().length > 0

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ready || saving) return

    setSaving(true)
    try {
      showSaved(await createQuickNote({ title, content, folderId }))
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      <Input
        aria-label={pl.notes.titleOptional}
        placeholder={pl.notes.titleOptional}
        maxLength={MAX_NOTE_TITLE}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <textarea
        autoFocus
        rows={5}
        aria-label={pl.notes.content}
        placeholder={pl.notes.contentPlaceholder}
        maxLength={MAX_NOTE_CONTENT}
        className={NOTE_TEXT_CLASS}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }
        }}
      />
      <NoteFolderSelect
        value={folderId}
        folders={folders ?? []}
        onChange={setPicked}
        className="w-full"
      />
      <Button type="submit" disabled={!ready || saving}>
        {pl.notes.save}
      </Button>
    </form>
  )
}
