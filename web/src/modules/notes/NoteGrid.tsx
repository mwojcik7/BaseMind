import { useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { CheckCircle2, Circle, MoreVertical, Pin } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { pl } from '@/i18n/pl'
import { NoteMenu } from '@/modules/notes/NoteActions'
import { deleteNotes, reportNoteError, type Note } from '@/modules/notes/repo'
import { cardLines, changedLabel, noteHeading } from '@/modules/notes/selectors'

/** As for dragging in the calendar: long enough not to fire while scrolling. */
const HOLD_MS = 400
/** A finger moving further than this is scrolling, not holding. */
const MOVE_TOLERANCE_PX = 8

/** Calls `onHold` when the pointer stays down in place; `firedRef` then tells the click apart. */
function useLongPress(onHold: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const start = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)
  const hold = useRef(onHold)

  useEffect(() => {
    hold.current = onHold
  }, [onHold])
  useEffect(() => () => clearTimeout(timer.current), [])

  function cancel() {
    clearTimeout(timer.current)
    start.current = null
  }

  return {
    firedRef,
    handlers: {
      onPointerDown: (event: PointerEvent) => {
        firedRef.current = false
        start.current = { x: event.clientX, y: event.clientY }
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          firedRef.current = true
          start.current = null
          navigator.vibrate?.(10)
          hold.current()
        }, HOLD_MS)
      },
      onPointerMove: (event: PointerEvent) => {
        const from = start.current
        if (
          from &&
          Math.hypot(event.clientX - from.x, event.clientY - from.y) > MOVE_TOLERANCE_PX
        ) {
          cancel()
        }
      },
      // Scrolling cancels the pointer too.
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      // A long press on a phone would otherwise open the browser's own menu.
      onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
    },
  }
}

export interface NoteSelection {
  selected: ReadonlySet<string>
  /** A long press: starts picking, or adds to what is picked. */
  start: (id: string) => void
  toggle: (id: string) => void
}

function NoteCard({
  note,
  folderName,
  now,
  selection,
  onMenu,
}: {
  note: Note
  folderName?: string
  now: Date
  selection: NoteSelection
  onMenu: () => void
}) {
  const navigate = useNavigate()
  const selecting = selection.selected.size > 0
  const selected = selection.selected.has(note.id)
  const heading = noteHeading(note)
  const lines = cardLines(note)
  const details = [folderName, changedLabel(note.updated_at, now)].filter(Boolean).join(' · ')
  const { firedRef, handlers } = useLongPress(() => selection.start(note.id))

  function handleClick() {
    // The click that ends a long press is not a tap.
    if (firedRef.current) {
      firedRef.current = false
      return
    }
    if (selecting) {
      selection.toggle(note.id)
    } else {
      void navigate({ to: '/notes/$noteId', params: { noteId: note.id } })
    }
  }

  return (
    <li className="relative aspect-square min-w-0">
      <button
        type="button"
        aria-pressed={selecting ? selected : undefined}
        aria-label={
          selecting
            ? selected
              ? pl.notes.unselectHint(heading)
              : pl.notes.selectHint(heading)
            : undefined
        }
        onClick={handleClick}
        {...handlers}
        className={cn(
          'flex size-full touch-manipulation flex-col overflow-hidden rounded-lg bg-card p-3 text-left text-card-foreground select-none [-webkit-touch-callout:none]',
          selected && 'ring-2 ring-primary',
        )}
      >
        <span className="line-clamp-2 pr-6 text-sm font-semibold break-words">{heading}</span>
        {lines.length > 0 && (
          <span className="mt-1 min-h-0 flex-1 overflow-hidden text-sm break-words text-muted-foreground [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
            {lines.map((line, index) => (
              <span key={index} className="block">
                {line}
              </span>
            ))}
          </span>
        )}
        <span className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
          {note.pinned && <Pin aria-label={pl.notes.pinnedMark} className="size-3.5 shrink-0" />}
          <span className="min-w-0 truncate">{details}</span>
        </span>
      </button>

      {selecting ? (
        <span aria-hidden className="pointer-events-none absolute top-2 right-2 text-primary">
          {selected ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Circle className="size-5 text-muted-foreground" />
          )}
        </span>
      ) : (
        <button
          type="button"
          aria-label={pl.notes.optionsFor(heading)}
          title={pl.notes.options}
          onClick={onMenu}
          className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <MoreVertical aria-hidden className="size-4" />
        </button>
      )}
    </li>
  )
}

/** Notes as cards close to square, two in a row on a phone and more on wider screens. */
export function NoteGrid({
  notes,
  folderNames,
  now,
  selection,
}: {
  notes: readonly Note[]
  /** When the notes come from several folders: names to show on the cards. */
  folderNames?: (note: Note) => string
  now: Date
  selection: NoteSelection
}) {
  // The last note whose menu was opened: it stays mounted, so its folder picker can open after it.
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuNote = notes.find((note) => note.id === menuFor)

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            folderName={folderNames?.(note)}
            now={now}
            selection={selection}
            onMenu={() => {
              setMenuFor(note.id)
              setMenuOpen(true)
            }}
          />
        ))}
      </ul>

      {menuNote && (
        <NoteMenu
          note={menuNote}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onDelete={() => deleteNotes([menuNote.id]).catch(reportNoteError)}
          onSelect={() => selection.start(menuNote.id)}
        />
      )}
    </>
  )
}
