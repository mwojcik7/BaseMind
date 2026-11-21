import {
  Archive,
  ArchiveRestore,
  Check,
  CheckSquare,
  CircleHelp,
  Folder,
  FolderInput,
  Inbox,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import {
  moveNotes,
  noteFolders,
  notes,
  reportNoteError,
  setArchived,
  type Note,
} from '@/modules/notes/repo'
import { sortFolders } from '@/modules/notes/selectors'

function MenuButton({
  icon: Icon,
  children,
  destructive = false,
  onClick,
}: {
  icon: typeof Pin
  children: ReactNode
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left text-sm font-medium hover:bg-accent ${destructive ? 'text-destructive' : ''}`}
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      {children}
    </button>
  )
}

/** Moves notes to a folder or the inbox. `current` gets a check mark. */
export function FolderPicker({
  ids,
  current,
  open,
  onOpenChange,
  onMoved,
}: {
  ids: readonly string[]
  current?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMoved?: () => void
}) {
  const folders = useRecords(noteFolders)
  const choices = [
    { id: null, name: pl.notes.inbox, icon: Inbox },
    ...sortFolders(folders ?? []).map(({ id, name }) => ({ id, name, icon: Folder })),
  ]

  function moveTo(folderId: string | null, name: string) {
    onOpenChange(false)
    moveNotes(ids, folderId, name)
      .then(() => onMoved?.())
      .catch(reportNoteError)
  }

  return (
    <BottomSheet title={pl.notes.move} open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col">
        {choices.map(({ id, name, icon }) => (
          <MenuButton key={id ?? 'inbox'} icon={icon} onClick={() => moveTo(id, name)}>
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {id === current && (
              <Check aria-label={pl.notes.currentFolder} className="size-5 text-brand-text" />
            )}
          </MenuButton>
        ))}
      </div>
    </BottomSheet>
  )
}

/** What can be done with one note: from its screen, or from its card in a list. */
export function NoteMenu({
  note,
  open,
  onOpenChange,
  onDelete,
  onSelect,
  onHelp,
}: {
  note: Note
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  /** On a card: starts picking several notes, for those without a long press. */
  onSelect?: () => void
  /** On the note's screen: opens "Jak formatować". */
  onHelp?: () => void
}) {
  const folders = useRecords(noteFolders)
  const [moving, setMoving] = useState(false)
  const liveIds = new Set(folders?.map((folder) => folder.id))
  const current = note.folder_id && liveIds.has(note.folder_id) ? note.folder_id : null

  function act(action: () => Promise<unknown>) {
    onOpenChange(false)
    action().catch(reportNoteError)
  }

  return (
    <>
      <BottomSheet title={pl.notes.options} open={open} onOpenChange={onOpenChange}>
        <div className="flex flex-col">
          <MenuButton
            icon={note.pinned ? PinOff : Pin}
            onClick={() => act(() => notes.update(note.id, { pinned: !note.pinned }))}
          >
            {note.pinned ? pl.notes.unpin : pl.notes.pin}
          </MenuButton>
          <MenuButton
            icon={FolderInput}
            onClick={() => {
              onOpenChange(false)
              setMoving(true)
            }}
          >
            {pl.notes.move}
          </MenuButton>
          <MenuButton
            icon={note.archived ? ArchiveRestore : Archive}
            onClick={() => act(() => setArchived([note.id], !note.archived))}
          >
            {note.archived ? pl.notes.unarchive : pl.notes.archive}
          </MenuButton>
          {onSelect && (
            <MenuButton
              icon={CheckSquare}
              onClick={() => {
                onOpenChange(false)
                onSelect()
              }}
            >
              {pl.notes.select}
            </MenuButton>
          )}
          {onHelp && (
            <MenuButton
              icon={CircleHelp}
              onClick={() => {
                onOpenChange(false)
                onHelp()
              }}
            >
              {pl.notes.help.title}
            </MenuButton>
          )}
          <MenuButton
            icon={Trash2}
            destructive
            onClick={() => {
              onOpenChange(false)
              onDelete()
            }}
          >
            {pl.notes.delete}
          </MenuButton>
        </div>
      </BottomSheet>

      <FolderPicker ids={[note.id]} current={current} open={moving} onOpenChange={setMoving} />
    </>
  )
}
