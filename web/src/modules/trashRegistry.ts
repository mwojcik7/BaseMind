import { parseISO } from 'date-fns'
import {
  CalendarDays,
  CheckSquare,
  Folder,
  ListTodo,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react'
import { db } from '@/db/db'
import { pl } from '@/i18n/pl'
import { events, removableEvents } from '@/modules/calendar/repo'
import { noteFolders, notes } from '@/modules/notes/repo'
import { noteHeading } from '@/modules/notes/selectors'
import { removableTasks, taskLists, tasks, type Task } from '@/modules/tasks/repo'

/** Days a deleted item stays in the trash; the server's config/trash.php says the same. */
export const TRASH_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/** Days, rounded up, until the server removes it; 0 once that moment has passed. */
export function daysLeft(deletedAt: string, now: Date) {
  const removedAt = parseISO(deletedAt).getTime() + TRASH_DAYS * DAY_MS
  return Math.max(0, Math.ceil((removedAt - now.getTime()) / DAY_MS))
}

export interface TrashEntry {
  id: string
  title: string
  /** A short second line, e.g. what comes back together with it. */
  detail?: string
  deletedAt: string
}

export interface TrashSource {
  /** The synchronised entity. */
  id: string
  label: string
  icon: LucideIcon
  /** What is in the trash. Leaves out records that come back together with another one. */
  entries: () => Promise<TrashEntry[]>
  restore: (id: string) => Promise<void>
  purge: (id: string) => Promise<void>
}

const taskSource: TrashSource = {
  id: 'tasks',
  label: pl.trash.task,
  icon: CheckSquare,
  entries: async () => {
    const all = await db.table<Task, string>('tasks').toArray()
    const byId = new Map(all.map((task) => [task.id, task]))
    const deleted = all.filter((task) => task.deleted_at !== null)

    return deleted
      .filter((task) => {
        const parent = task.parent_id ? byId.get(task.parent_id) : undefined
        return !(task.deleted_with_parent && parent && parent.deleted_at !== null)
      })
      .map((task) => {
        const parent = task.parent_id ? byId.get(task.parent_id) : undefined
        const withIt = deleted.filter(
          (subtask) => subtask.parent_id === task.id && subtask.deleted_with_parent,
        ).length

        return {
          id: task.id,
          title: task.title,
          detail: parent
            ? pl.trash.subtask(parent.title)
            : withIt > 0
              ? pl.trash.withSubtasks(withIt)
              : undefined,
          deletedAt: task.deleted_at!,
        }
      })
  },
  restore: removableTasks.restore,
  purge: removableTasks.purge,
}

const taskListSource: TrashSource = {
  id: 'task_lists',
  label: pl.trash.list,
  icon: ListTodo,
  entries: async () => {
    const live = await tasks.list()

    return (await taskLists.listDeleted()).map((list) => {
      const waiting = live.filter((task) => task.list_id === list.id).length
      return {
        id: list.id,
        title: list.name,
        detail: waiting > 0 ? pl.trash.listTasks(waiting) : undefined,
        deletedAt: list.deleted_at!,
      }
    })
  },
  restore: taskLists.restore,
  purge: taskLists.purge,
}

const eventSource: TrashSource = {
  id: 'events',
  label: pl.trash.event,
  icon: CalendarDays,
  entries: async () => {
    const deleted = await events.listDeleted()
    const deletedIds = new Set(deleted.map((event) => event.id))

    // Occurrences that went with their series come back with it, so it stands for them.
    return deleted
      .filter(
        (event) =>
          !(event.deleted_with_series && event.series_id && deletedIds.has(event.series_id)),
      )
      .map((event) => ({
        id: event.id,
        title: event.title,
        detail: [event.start_date.split('-').reverse().join('.'), event.start_time]
          .filter(Boolean)
          .join(' '),
        deletedAt: event.deleted_at!,
      }))
  },
  restore: removableEvents.restore,
  purge: removableEvents.purge,
}

const noteSource: TrashSource = {
  id: 'notes',
  label: pl.trash.note,
  icon: NotebookPen,
  entries: async () => {
    const folders = new Map((await noteFolders.list()).map((folder) => [folder.id, folder.name]))

    return (await notes.listDeleted()).map((note) => ({
      id: note.id,
      title: noteHeading(note),
      detail: (note.folder_id && folders.get(note.folder_id)) || pl.notes.inbox,
      deletedAt: note.deleted_at!,
    }))
  },
  restore: notes.restore,
  purge: notes.purge,
}

// Notes of a deleted folder wait in the inbox and go back to it when it is restored.
const noteFolderSource: TrashSource = {
  id: 'note_folders',
  label: pl.trash.noteFolder,
  icon: Folder,
  entries: async () => {
    const live = await notes.list()

    return (await noteFolders.listDeleted()).map((folder) => {
      const waiting = live.filter((note) => note.folder_id === folder.id).length
      return {
        id: folder.id,
        title: folder.name,
        detail: waiting > 0 ? pl.trash.folderNotes(waiting) : undefined,
        deletedAt: folder.deleted_at!,
      }
    })
  },
  restore: noteFolders.restore,
  purge: noteFolders.purge,
}
/** Everything that can be restored from the trash. A module adds one entry here. */
export const trashSources: readonly TrashSource[] = [
  taskSource,
  taskListSource,
  eventSource,
  noteSource,
  noteFolderSource,
]
