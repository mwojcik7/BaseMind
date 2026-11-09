import { ArrowLeft, ChevronRight, Inbox, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { deleteTaskList, taskLists, type Task, type TaskList } from '@/modules/tasks/repo'
import { tasksInList } from '@/modules/tasks/selectors'
import { TaskRow } from '@/modules/tasks/TaskRow'

const MAX_NAME_LENGTH = 120

/** Mounted only while the sheet is open, so it always starts from the current name. */
function ListNameForm({ list, onDone }: { list?: TaskList; onDone: () => void }) {
  const [name, setName] = useState(list?.name ?? '')
  const trimmed = name.trim()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!trimmed) {
      return
    }

    try {
      await (list
        ? taskLists.update(list.id, { name: trimmed })
        : taskLists.create({ name: trimmed }))
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      <Input
        autoFocus
        aria-label={pl.tasks.listName}
        placeholder={pl.tasks.listName}
        maxLength={MAX_NAME_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" disabled={!trimmed}>
        {pl.tasks.save}
      </Button>
    </form>
  )
}

function ListRow({
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

export function TaskListsTab({
  all,
  lists,
  today,
}: {
  all: readonly Task[]
  lists: readonly TaskList[]
  today: string
}) {
  // undefined: the overview; null: the inbox; otherwise a list's id.
  const [selected, setSelected] = useState<string | null | undefined>(undefined)
  const [editing, setEditing] = useState<'new' | 'rename' | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const liveIds = new Set(lists.map((list) => list.id))
  const sorted = [...lists].sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  const list = lists.find((candidate) => candidate.id === selected)
  // A list deleted on another device leaves this screen by itself.
  const viewing = selected === null || list !== undefined
  const items = viewing ? tasksInList(all, list?.id ?? null, liveIds) : []

  async function handleDelete() {
    setConfirmingDelete(false)
    if (!list) {
      return
    }

    try {
      await deleteTaskList(list.id)
      setSelected(undefined)
      toast.success(pl.tasks.listDeleted)
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
              aria-label={pl.tasks.backToLists}
              onClick={() => setSelected(undefined)}
            >
              <ArrowLeft aria-hidden className="size-5" />
            </Button>
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
              {list?.name ?? pl.tasks.inbox}
            </h2>
            {list && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={pl.tasks.renameList}
                  onClick={() => setEditing('rename')}
                >
                  <Pencil aria-hidden className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={pl.tasks.deleteList}
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 aria-hidden className="size-5" />
                </Button>
              </>
            )}
          </div>
          {items.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {items.map((task) => (
                <TaskRow key={task.id} task={task} today={today} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={ListTodo} description={pl.tasks.emptyList} />
          )}
        </section>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-2">
            <ListRow
              icon={Inbox}
              name={pl.tasks.inbox}
              count={tasksInList(all, null, liveIds).length}
              onPress={() => setSelected(null)}
            />
            {sorted.map(({ id, name }) => (
              <ListRow
                key={id}
                icon={ListTodo}
                name={name}
                count={tasksInList(all, id, liveIds).length}
                onPress={() => setSelected(id)}
              />
            ))}
          </ul>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {pl.tasks.newList}
          </Button>
        </>
      )}

      <BottomSheet
        title={editing === 'rename' ? pl.tasks.renameList : pl.tasks.newList}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <ListNameForm
          list={editing === 'rename' ? list : undefined}
          onDone={() => setEditing(null)}
        />
      </BottomSheet>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pl.tasks.deleteListTitle(list?.name ?? '')}</DialogTitle>
            <DialogDescription>{pl.tasks.deleteListDescription}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="destructive" onClick={() => void handleDelete()}>
              {pl.tasks.deleteList}
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
