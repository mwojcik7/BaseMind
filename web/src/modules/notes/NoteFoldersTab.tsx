import { ArrowLeft, ChevronRight, Folder, Inbox, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { deleteWithUndo } from '@/lib/delete-with-undo'
import { errorMessage } from '@/lib/form-errors'
import { noteFolders, type Note, type NoteFolder } from '@/modules/notes/repo'
import { notesInFolder, sortFolders } from '@/modules/notes/selectors'

const MAX_NAME_LENGTH = 120

/** Mounted only while the sheet is open, so it always starts from the current name. */
function FolderNameForm({ folder, onDone }: { folder?: NoteFolder; onDone: () => void }) {
  const [name, setName] = useState(folder?.name ?? '')
  const trimmed = name.trim()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!trimmed) {
      return
    }

    try {
      await (folder
        ? noteFolders.update(folder.id, { name: trimmed })
        : noteFolders.create({ name: trimmed }))
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      <Input
        autoFocus
        aria-label={pl.notes.folders.name}
        placeholder={pl.notes.folders.name}
        maxLength={MAX_NAME_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" disabled={!trimmed}>
        {pl.notes.folders.save}
      </Button>
    </form>
  )
}

function FolderRow({
  icon: Icon,
  name,
  count,
  onPress,
}: {
  icon: typeof Inbox
  name: string
  count: number
  onPress: () => void
}) {
  return (
    <li>
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 rounded-lg bg-card px-4 text-left text-sm font-medium text-card-foreground"
        onClick={onPress}
      >
        <Icon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="text-muted-foreground tabular-nums">{count}</span>
        <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
      </button>
    </li>
  )
}

export function NoteFoldersTab({
  all,
  folders,
  selected,
  onSelect,
  renderNotes,
}: {
  all: readonly Note[]
  folders: readonly NoteFolder[]
  /** undefined: the overview; null: the inbox; otherwise a folder's id. */
  selected: string | null | undefined
  onSelect: (folder: string | null | undefined) => void
  /** Shows the folder's notes, sorted and filtered as chosen, or `empty` when there are none. */
  renderNotes: (notes: Note[], empty: string) => ReactNode
}) {
  const [editing, setEditing] = useState<'new' | 'rename' | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const liveIds = new Set(folders.map((folder) => folder.id))
  const folder = folders.find((candidate) => candidate.id === selected)
  // A folder deleted on another device leaves this screen by itself.
  const viewing = selected === null || folder !== undefined
  const items = viewing ? notesInFolder(all, folder?.id ?? null, liveIds) : []

  async function handleDelete() {
    setConfirmingDelete(false)
    if (!folder) {
      return
    }

    try {
      // Its notes keep the folder and show in the inbox until it is restored or purged.
      await deleteWithUndo(noteFolders, folder.id, pl.notes.folders.deleted)
      onSelect(undefined)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      {viewing ? (
        <section className="mt-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={pl.notes.folders.back}
              onClick={() => onSelect(undefined)}
            >
              <ArrowLeft aria-hidden className="size-5" />
            </Button>
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
              {folder?.name ?? pl.notes.inbox}
            </h2>
            {folder && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={pl.notes.folders.rename}
                  onClick={() => setEditing('rename')}
                >
                  <Pencil aria-hidden className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={pl.notes.folders.delete}
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 aria-hidden className="size-5" />
                </Button>
              </>
            )}
          </div>
          <div className="mt-2">{renderNotes(items, pl.notes.emptyFolder)}</div>
        </section>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-2">
            <FolderRow
              icon={Inbox}
              name={pl.notes.inbox}
              count={notesInFolder(all, null, liveIds).length}
              onPress={() => onSelect(null)}
            />
            {sortFolders(folders).map(({ id, name }) => (
              <FolderRow
                key={id}
                icon={Folder}
                name={name}
                count={notesInFolder(all, id, liveIds).length}
                onPress={() => onSelect(id)}
              />
            ))}
          </ul>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {pl.notes.folders.new}
          </Button>
        </>
      )}

      <BottomSheet
        title={editing === 'rename' ? pl.notes.folders.rename : pl.notes.folders.new}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <FolderNameForm
          folder={editing === 'rename' ? folder : undefined}
          onDone={() => setEditing(null)}
        />
      </BottomSheet>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pl.notes.folders.deleteTitle(folder?.name ?? '')}</DialogTitle>
            <DialogDescription>{pl.notes.folders.deleteDescription}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="destructive" onClick={() => void handleDelete()}>
              {pl.notes.folders.delete}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              {pl.common.cancel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
