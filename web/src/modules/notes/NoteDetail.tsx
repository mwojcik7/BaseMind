import { getRouteApi, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { toggleTaskLine } from '@/lib/task-items'
import { FormattingHelp } from '@/modules/notes/FormattingHelp'
import { NoteMenu } from '@/modules/notes/NoteActions'
import {
  deleteNotes,
  discardNote,
  MAX_NOTE_CONTENT,
  MAX_NOTE_TITLE,
  notes,
  reportNoteError as report,
  type Note,
} from '@/modules/notes/repo'
import { isEmptyNote } from '@/modules/notes/selectors'

// Loaded only when the preview is opened: the Markdown parser is the biggest part.
const MarkdownPreview = lazy(() => import('@/components/MarkdownPreview'))
// CodeMirror is big too and only needed here, so it comes with the first note opened.
const NoteCodeEditor = lazy(() => import('@/modules/notes/editor/NoteCodeEditor'))

const route = getRouteApi('/_app/notes/$noteId')

/** Typing pauses this long before the note is saved. */
const SAVE_DELAY_MS = 700

export const NEW_NOTE = 'new'

function useClose() {
  const navigate = useNavigate()
  const router = useRouter()

  return () => {
    if (router.history.canGoBack()) {
      router.history.back()
    } else {
      void navigate({ to: '/notes' })
    }
  }
}

interface Draft {
  title: string
  content: string
}

const fieldsOf = (draft: Draft) => ({
  title: draft.title.trim() ? draft.title : null,
  content: draft.content.trim() ? draft.content : null,
})

/**
 * Saves as you type. A new note is created with its first character, and one left empty
 * is removed on the way out.
 */
function NoteEditor({
  note,
  folderId,
  onCreated,
}: {
  /** The note as stored now; null while a new one has nothing in it yet. */
  note: Note | null
  folderId?: string
  onCreated: (id: string) => void
}) {
  const close = useClose()
  // The fields start from the note once; later changes come from typing here.
  const [draft, setDraft] = useState<Draft>(() => ({
    title: note?.title ?? '',
    content: note?.content ?? '',
  }))
  const [preview, setPreview] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const latest = useRef(draft)
  const noteId = useRef(note?.id ?? null)
  const createdHere = useRef(false)
  const dirty = useRef(false)
  const gone = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const created = useRef(onCreated)

  useEffect(() => {
    created.current = onCreated
  }, [onCreated])

  /** Saves what was typed since the last save. Saves run one after another. */
  function save() {
    clearTimeout(timer.current)
    if (!dirty.current || gone.current) {
      return queue.current
    }

    dirty.current = false
    const fields = fieldsOf(latest.current)
    queue.current = queue.current
      .then(async () => {
        if (noteId.current !== null) {
          await notes.update(noteId.current, fields)
          return
        }
        if (isEmptyNote(fields)) {
          return
        }

        const record = await notes.create({
          ...fields,
          folder_id: folderId ?? null,
          pinned: false,
          archived: false,
        })
        noteId.current = record.id
        createdHere.current = true
        created.current(record.id)
      })
      .catch(report)
    return queue.current
  }

  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })

  useEffect(() => {
    // Leaving the app on a phone may be the last chance to save.
    const onHide = () => {
      if (document.visibilityState === 'hidden') void saveRef.current()
    }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      document.removeEventListener('visibilitychange', onHide)
      void saveRef.current().then(() => {
        const id = noteId.current
        if (id && createdHere.current && !gone.current && isEmptyNote(fieldsOf(latest.current))) {
          discardNote(id).catch(report)
        }
      })
    }
  }, [])

  function change(next: Partial<Draft>) {
    const updated = { ...latest.current, ...next }
    latest.current = updated
    setDraft(updated)
    dirty.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void save(), SAVE_DELAY_MS)
  }

  async function handleDelete() {
    await save()
    const id = noteId.current
    if (!id) {
      close()
      return
    }

    try {
      gone.current = true
      await deleteNotes([id])
      close()
    } catch (error) {
      gone.current = false
      report(error)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="-mx-2 flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={pl.notes.back} onClick={close}>
          <ArrowLeft aria-hidden className="size-5" />
        </Button>
        <div className="flex-1" />
        <div className="flex rounded-md bg-secondary p-0.5 text-sm" role="group">
          {[false, true].map((mode) => (
            <button
              key={String(mode)}
              type="button"
              aria-pressed={preview === mode}
              onClick={() => setPreview(mode)}
              className="min-h-9 rounded px-3 font-medium text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
            >
              {mode ? pl.markdown.preview : pl.markdown.edit}
            </button>
          ))}
        </div>
        {note && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={pl.notes.options}
            title={pl.notes.options}
            onClick={() => setMenuOpen(true)}
          >
            <MoreVertical aria-hidden className="size-5" />
          </Button>
        )}
      </div>

      <input
        aria-label={pl.notes.title}
        placeholder={pl.notes.title}
        maxLength={MAX_NOTE_TITLE}
        value={draft.title}
        onChange={(event) => change({ title: event.target.value })}
        className="mt-3 w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
      />

      {preview ? (
        <div className="mt-4 min-h-[60vh]">
          {draft.content.trim() ? (
            <Suspense fallback={null}>
              <MarkdownPreview
                text={draft.content}
                onToggle={(line) => change({ content: toggleTaskLine(draft.content, line) })}
              />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">{pl.markdown.empty}</p>
          )}
        </div>
      ) : (
        <Suspense fallback={<div className="mt-4 min-h-[60vh]" />}>
          <NoteCodeEditor
            initial={draft.content}
            maxLength={MAX_NOTE_CONTENT}
            // A new note opens ready for typing.
            autoFocus={note === null}
            onChange={(content) => change({ content })}
            onHelp={() => setHelpOpen(true)}
          />
        </Suspense>
      )}

      {note && (
        <NoteMenu
          note={note}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onDelete={() => void handleDelete()}
          onHelp={() => setHelpOpen(true)}
        />
      )}
      <FormattingHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}

/** A whole screen, as notes can be long. Has its own address, so search can open it later. */
export function NoteDetail() {
  const { noteId } = route.useParams()
  const { folder } = route.useSearch()
  const navigate = useNavigate()
  // The id a new note got here: the editor stays mounted, so typing isn't interrupted.
  const [adopted, setAdopted] = useState<string | null>(null)
  const isNew = noteId === NEW_NOTE || noteId === adopted

  // undefined while loading, null when there is no such note.
  const note = useLiveQuery(
    async () => (noteId === NEW_NOTE ? null : ((await notes.get(noteId)) ?? null)),
    [noteId],
  )

  if (!isNew) {
    if (note === undefined) {
      return null
    }
    if (note === null) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">{pl.notes.notFound}</p>
          <Link to="/notes" className="text-sm font-medium text-brand-text">
            {pl.notes.back}
          </Link>
        </div>
      )
    }
  }

  return (
    <NoteEditor
      key={isNew ? NEW_NOTE : noteId}
      note={note ?? null}
      folderId={folder}
      onCreated={(id) => {
        setAdopted(id)
        void navigate({
          to: '/notes/$noteId',
          params: { noteId: id },
          search: {},
          replace: true,
        })
      }}
    />
  )
}
