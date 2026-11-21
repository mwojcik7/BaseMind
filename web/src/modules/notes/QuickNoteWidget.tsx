import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { useTimeNow } from '@/lib/use-today'
import { NoteFolderSelect } from '@/modules/notes/NoteFolderSelect'
import { NOTE_TEXT_CLASS, useNoteSavedToast } from '@/modules/notes/quick-saved'
import { createQuickNote, liveFolder, startingFolder } from '@/modules/notes/quick'
import { MAX_NOTE_CONTENT, noteFolders, notes } from '@/modules/notes/repo'
import { changedLabel, noteHeading, recentNotes } from '@/modules/notes/selectors'

const RECENT_SHOWN = 3

/** "Dziś": a field to jot something down, and the notes changed last. */
export function QuickNoteWidget() {
  const all = useRecords(notes)
  const folders = useRecords(noteFolders)
  const [content, setContent] = useState('')
  const [preferred] = useState(startingFolder)
  const [picked, setPicked] = useState<string | null>()
  const [saving, setSaving] = useState(false)
  const showSaved = useNoteSavedToast()
  useTimeNow()
  const now = new Date()

  const folderId = liveFolder(picked !== undefined ? picked : preferred, folders)
  const ready = content.trim().length > 0
  const recent = all ? recentNotes(all, RECENT_SHOWN) : []

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ready || saving) return

    setSaving(true)
    try {
      // The first line becomes the title, as in any note without one.
      showSaved(await createQuickNote({ title: '', content, folderId }))
      setContent('')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-2">
        <textarea
          rows={2}
          aria-label={pl.today.quickNote}
          placeholder={pl.notes.quickPlaceholder}
          maxLength={MAX_NOTE_CONTENT}
          className={`${NOTE_TEXT_CLASS} field-sizing-content max-h-60 min-h-16`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <div className="flex items-center gap-2">
          <NoteFolderSelect
            value={folderId}
            folders={folders ?? []}
            onChange={setPicked}
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={!ready || saving}>
            {pl.notes.save}
          </Button>
        </div>
      </form>

      {recent.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground">{pl.notes.recent}</h3>
          <ul>
            {recent.map((note) => (
              <li key={note.id}>
                <Link
                  to="/notes/$noteId"
                  params={{ noteId: note.id }}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{noteHeading(note)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {changedLabel(note.updated_at, now)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/notes" className="inline-block py-2 text-sm font-medium text-brand-text">
            {pl.notes.showAll}
          </Link>
        </section>
      )}
    </div>
  )
}
