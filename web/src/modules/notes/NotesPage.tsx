import { getRouteApi, useRouter } from '@tanstack/react-router'
import { Archive, ArchiveRestore, FolderInput, NotebookPen, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { useTimeNow } from '@/lib/use-today'
import { FolderPicker } from '@/modules/notes/NoteActions'
import { NoteFoldersTab } from '@/modules/notes/NoteFoldersTab'
import { NoteGrid, type NoteSelection } from '@/modules/notes/NoteGrid'
import { NoteViewSheet } from '@/modules/notes/NoteViewSheet'
import { useActiveNoteFolder } from '@/modules/notes/quick'
import {
  deleteNotes,
  noteFolders,
  notes,
  reportNoteError,
  setArchived,
  type Note,
} from '@/modules/notes/repo'
import { INBOX, validateNotesSearch, type NotesSearch, type NotesTab } from '@/modules/notes/search'
import { filterNotes, isFiltering, sortNotes } from '@/modules/notes/selectors'
import { clearNoteFilter, clearSelection, toggleSelected, useNotesView } from '@/modules/notes/view'

const route = getRouteApi('/_app/notes/')

export function NotesPage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const router = useRouter()
  const all = useRecords(notes)
  const folders = useRecords(noteFolders)
  const { order, filter, selected } = useNotesView()
  const [moving, setMoving] = useState(false)
  // Re-renders every minute, so "dziś 14:30" turns into "wczoraj" by itself.
  useTimeNow()
  const now = new Date()

  const tab: NotesTab = search.tab ?? 'all'
  const selectedFolder =
    search.folder === undefined ? undefined : search.folder === INBOX ? null : search.folder
  const insideFolder = tab === 'folders' && selectedFolder !== undefined
  const records = all ?? []
  const liveFolderIds = new Set(folders?.map((folder) => folder.id))
  const folderNames = new Map(folders?.map((folder) => [folder.id, folder.name]))
  // Nothing until the first read, so empty states don't flash on start.
  const loaded = all !== undefined && folders !== undefined

  // Picked notes deleted or archived elsewhere drop out of the selection.
  const visibleIds = new Set(records.map((note) => note.id))
  const picked = [...selected].filter((id) => visibleIds.has(id))
  const selecting = picked.length > 0

  // The [+] sheet adds a note to the folder open here.
  const activeFolder = insideFolder ? selectedFolder : undefined
  useEffect(() => {
    useActiveNoteFolder.setState({ folderId: activeFolder })
    return () => useActiveNoteFolder.setState({ folderId: undefined })
  }, [activeFolder])

  // The back button removed the marker: picking ends. A marker without a selection (e.g.
  // after a reload) is dropped.
  useEffect(() => {
    if (!search.select && useNotesView.getState().selected.size > 0) {
      clearSelection()
    }
  }, [search.select])
  useEffect(() => {
    if (search.select && useNotesView.getState().selected.size === 0) {
      void navigate({ search: (previous) => ({ ...previous, select: undefined }), replace: true })
    }
    // Only on arrival; later the selection itself decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function endSelection() {
    clearSelection()
    if (search.select) {
      router.history.back()
    }
  }

  const selection: NoteSelection = {
    selected: new Set(picked),
    start: (id) => {
      if (!search.select) {
        void navigate({ search: (previous) => ({ ...previous, select: true }) })
      }
      if (!useNotesView.getState().selected.has(id)) {
        toggleSelected(id)
      }
    },
    toggle: (id) => {
      if (picked.length === 1 && picked[0] === id) {
        endSelection()
      } else {
        toggleSelected(id)
      }
    },
  }

  function show(next: NotesSearch) {
    void navigate({ search: next, replace: true })
  }

  function newNote() {
    // A note started inside a folder goes to it.
    const folder = insideFolder ? search.folder : undefined
    void navigate({
      to: '/notes/$noteId',
      params: { noteId: 'new' },
      search: folder && folder !== INBOX ? { folder } : {},
    })
  }

  function bulk(action: Promise<void>) {
    endSelection()
    action.catch(reportNoteError)
  }

  /** Sorted and filtered as chosen; inside a folder the folder filter doesn't apply. */
  function renderNotes(items: Note[], empty: string, showFolders = false) {
    const shown = sortNotes(
      filterNotes(items, insideFolder ? { ...filter, folder: undefined } : filter, liveFolderIds),
      order,
    )
    if (!loaded) {
      return null
    }
    if (shown.length > 0) {
      return (
        <NoteGrid
          notes={shown}
          now={now}
          selection={selection}
          folderNames={
            showFolders
              ? (note) => (note.folder_id && folderNames.get(note.folder_id)) || pl.notes.inbox
              : undefined
          }
        />
      )
    }
    if (items.length > 0) {
      return (
        <EmptyState
          icon={NotebookPen}
          description={pl.notes.view.noMatch}
          action={
            <Button variant="secondary" onClick={clearNoteFilter}>
              {pl.notes.view.clear}
            </Button>
          }
        />
      )
    }
    return <EmptyState icon={tab === 'archive' ? Archive : NotebookPen} description={empty} />
  }

  return (
    <>
      {selecting ? (
        <header className="sticky top-[var(--app-bar,0px)] z-10 -mx-2 flex min-h-10 items-center gap-1 bg-background px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={pl.notes.endSelection}
            onClick={endSelection}
          >
            <X aria-hidden className="size-5" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold" aria-live="polite">
            {pl.notes.selectedCount(picked.length)}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            aria-label={pl.notes.move}
            title={pl.notes.move}
            onClick={() => setMoving(true)}
          >
            <FolderInput aria-hidden className="size-5" />
          </Button>
          {tab === 'archive' ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={pl.notes.unarchive}
              title={pl.notes.unarchive}
              onClick={() => bulk(setArchived(picked, false))}
            >
              <ArchiveRestore aria-hidden className="size-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label={pl.notes.archive}
              title={pl.notes.archive}
              onClick={() => bulk(setArchived(picked, true))}
            >
              <Archive aria-hidden className="size-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={pl.notes.delete}
            title={pl.notes.delete}
            onClick={() => bulk(deleteNotes(picked))}
          >
            <Trash2 aria-hidden className="size-5" />
          </Button>
        </header>
      ) : (
        <header className="flex items-center gap-1">
          <h1 className="flex-1 text-2xl font-semibold tracking-tight">{pl.modules.notes}</h1>
          <NoteViewSheet folders={folders ?? []} folderFilter={!insideFolder} />
          <Button
            size="icon"
            aria-label={pl.notes.newNote}
            title={pl.notes.newNote}
            onClick={newNote}
          >
            <Plus aria-hidden />
          </Button>
        </header>
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => show(validateNotesSearch({ tab: value }))}
        className="mt-6"
      >
        <TabsList className="w-full">
          {(['all', 'folders', 'archive'] as const).map((value) => (
            <TabsTrigger key={value} value={value} disabled={selecting}>
              {pl.notes.tabs[value]}
            </TabsTrigger>
          ))}
        </TabsList>

        {isFiltering(filter) && !selecting && (
          <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {pl.notes.view.active(
                [
                  filter.folder !== undefined && !insideFolder,
                  filter.pinnedOnly,
                  filter.openItemsOnly,
                ].filter(Boolean).length,
              )}
            </span>
            <button type="button" className="font-medium text-brand-text" onClick={clearNoteFilter}>
              {pl.notes.view.clear}
            </button>
          </div>
        )}

        <TabsContent value="all" className="mt-4">
          {renderNotes(
            records.filter((note) => !note.archived),
            pl.notes.emptyAll,
            true,
          )}
        </TabsContent>

        <TabsContent value="folders">
          {loaded && (
            <NoteFoldersTab
              all={records}
              folders={folders}
              selected={selectedFolder}
              onSelect={(folder) =>
                show({
                  tab: 'folders',
                  ...(folder !== undefined && { folder: folder ?? INBOX }),
                })
              }
              renderNotes={(items, empty) => renderNotes(items, empty)}
            />
          )}
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          {renderNotes(
            records.filter((note) => note.archived),
            pl.notes.emptyArchive,
            true,
          )}
        </TabsContent>
      </Tabs>

      <FolderPicker ids={picked} open={moving} onOpenChange={setMoving} onMoved={endSelection} />
    </>
  )
}
