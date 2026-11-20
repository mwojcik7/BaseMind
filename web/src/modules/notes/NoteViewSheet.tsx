import { SlidersHorizontal } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { pl } from '@/i18n/pl'
import type { NoteFolder } from '@/modules/notes/repo'
import { isFiltering, NOTE_ORDERS, sortFolders } from '@/modules/notes/selectors'
import { clearNoteFilter, setNoteFilter, setNoteOrder, useNotesView } from '@/modules/notes/view'

const text = pl.notes.view
const ANY = 'any'
const INBOX = 'inbox'

/** Order and filters for the notes list. The dot on the button says filters are on. */
export function NoteViewSheet({
  folders,
  folderFilter,
}: {
  folders: readonly NoteFolder[]
  /** Inside a folder, picking another one makes no sense. */
  folderFilter: boolean
}) {
  const order = useNotesView((state) => state.order)
  const filter = useNotesView((state) => state.filter)
  const folderValue = filter.folder === undefined ? ANY : (filter.folder ?? INBOX)

  return (
    <BottomSheet
      title={text.title}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label={text.button}
          title={text.button}
          className="relative"
        >
          <SlidersHorizontal aria-hidden />
          {isFiltering(filter) && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary"
            />
          )}
        </Button>
      }
    >
      <div className="flex flex-col gap-1 pb-4">
        <h3 className="text-sm font-semibold">{text.order}</h3>
        <div role="radiogroup" aria-label={text.order} className="flex flex-col">
          {NOTE_ORDERS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={order === option}
              onClick={() => setNoteOrder(option)}
              className="flex min-h-11 items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-accent"
            >
              <span
                aria-hidden
                className="flex size-4 items-center justify-center rounded-full border border-input"
              >
                {order === option && <span className="size-2 rounded-full bg-primary" />}
              </span>
              {text.orders[option]}
            </button>
          ))}
        </div>
        <p className="px-2 text-xs text-muted-foreground">{text.pinnedFirst}</p>

        <div className="my-3 h-px bg-border" />
        <h3 className="text-sm font-semibold">{text.filters}</h3>
        {folderFilter && (
          <div className="flex min-h-12 items-center justify-between gap-4">
            <Label htmlFor="notes-filter-folder">{text.folder}</Label>
            <Select
              value={folderValue}
              onValueChange={(value) =>
                setNoteFilter({
                  folder: value === ANY ? undefined : value === INBOX ? null : value,
                })
              }
            >
              <SelectTrigger id="notes-filter-folder" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{text.anyFolder}</SelectItem>
                <SelectItem value={INBOX}>{pl.notes.inbox}</SelectItem>
                {sortFolders(folders).map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex min-h-12 items-center justify-between gap-4">
          <Label htmlFor="notes-filter-pinned">{text.pinnedOnly}</Label>
          <Switch
            id="notes-filter-pinned"
            checked={filter.pinnedOnly}
            onCheckedChange={(pinnedOnly) => setNoteFilter({ pinnedOnly })}
          />
        </div>
        <div className="flex min-h-12 items-center justify-between gap-4">
          <div className="flex flex-col">
            <Label htmlFor="notes-filter-open">{text.openItemsOnly}</Label>
            <span className="text-xs text-muted-foreground">{text.openItemsHint}</span>
          </div>
          <Switch
            id="notes-filter-open"
            checked={filter.openItemsOnly}
            onCheckedChange={(openItemsOnly) => setNoteFilter({ openItemsOnly })}
          />
        </div>
        {isFiltering(filter) && (
          <Button variant="secondary" className="mt-2" onClick={clearNoteFilter}>
            {text.clear}
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
