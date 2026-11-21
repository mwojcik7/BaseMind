import { Folder, Inbox } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { pl } from '@/i18n/pl'
import type { NoteFolder } from '@/modules/notes/repo'
import { sortFolders } from '@/modules/notes/selectors'

const INBOX = 'inbox'

/** Where a new note goes: the inbox or one of the folders. */
export function NoteFolderSelect({
  value,
  folders,
  onChange,
  className,
}: {
  value: string | null
  folders: readonly NoteFolder[]
  onChange: (folderId: string | null) => void
  className?: string
}) {
  return (
    <Select value={value ?? INBOX} onValueChange={(next) => onChange(next === INBOX ? null : next)}>
      <SelectTrigger aria-label={pl.notes.folder} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={INBOX}>
          <Inbox aria-hidden className="size-4 text-muted-foreground" />
          {pl.notes.inbox}
        </SelectItem>
        {sortFolders(folders).map((folder) => (
          <SelectItem key={folder.id} value={folder.id}>
            <Folder aria-hidden className="size-4 text-muted-foreground" />
            {folder.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
