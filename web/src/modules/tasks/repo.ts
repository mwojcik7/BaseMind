import { db } from '@/db/db'
import { createRepository, type OwnFields, type SyncedRecord } from '@/db/repository'
import {
  dismissTaskReminder,
  refreshTaskReminder,
  setTaskReminder,
  type ReminderOffset,
} from '@/modules/tasks/reminder'

export interface TaskList extends SyncedRecord {
  name: string
}

export interface Task extends SyncedRecord {
  /** Null, or a list that no longer exists, means the inbox. */
  list_id: string | null
  /** Set on a subtask. Subtasks are one level deep; a deleted parent makes it top-level again. */
  parent_id: string | null
  title: string
  notes: string | null
  /** 1 is the most important. */
  priority: number
  status: 'todo' | 'done' | 'cancelled'
  /** 'yyyy-MM-dd' */
  due_date: string | null
  /** 'HH:mm' */
  due_time: string | null
  completed_at: string | null
}

export const taskLists = createRepository<TaskList>('task_lists')
export const tasks = createRepository<Task>('tasks')

export const DEFAULT_PRIORITY = 4

// Everything below changes a task and its reminder together, or neither.
function withReminder<T>(work: () => Promise<T>) {
  return db.transaction('rw', db.table('tasks'), db.table('reminders'), db.outbox, work)
}

export function createTask(fields: OwnFields<Task>, offset: ReminderOffset = null) {
  return withReminder(async () => {
    const task = await tasks.create(fields)
    await setTaskReminder(task, offset)
    return task
  })
}

export function updateTask(id: string, patch: Partial<OwnFields<Task>>, offset: ReminderOffset) {
  return withReminder(async () => setTaskReminder(await tasks.update(id, patch), offset))
}

function changeTask(id: string, patch: Partial<OwnFields<Task>>) {
  return withReminder(async () => refreshTaskReminder(await tasks.update(id, patch)))
}

export function completeTask(id: string) {
  return changeTask(id, { status: 'done', completed_at: new Date().toISOString() })
}

export function reopenTask(id: string) {
  return changeTask(id, { status: 'todo', completed_at: null })
}

export function moveTask(id: string, dueDate: string) {
  return changeTask(id, { due_date: dueDate })
}

/** The task's live subtasks, oldest first (UUIDv7 ids sort by creation time). */
export async function subtasksOf(id: string) {
  return (await tasks.list())
    .filter((task) => task.parent_id === id)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function openSubtasksOf(id: string) {
  return (await subtasksOf(id)).filter((task) => task.status === 'todo')
}

/**
 * Completes the task and its open subtasks together.
 * Returns the ids it completed, so the change can be undone with `reopenTasks`.
 */
export function completeTaskWithSubtasks(id: string) {
  return withReminder(async () => {
    const ids = [id, ...(await openSubtasksOf(id)).map((task) => task.id)]
    const completedAt = new Date().toISOString()
    for (const taskId of ids) {
      await refreshTaskReminder(
        await tasks.update(taskId, { status: 'done', completed_at: completedAt }),
      )
    }
    return ids
  })
}

export function reopenTasks(ids: readonly string[]) {
  return withReminder(async () => {
    for (const id of ids) {
      await refreshTaskReminder(await tasks.update(id, { status: 'todo', completed_at: null }))
    }
  })
}

// The subtasks deleted together with each task, so undoing brings back just those and not
// ones deleted on their own earlier. Kept in memory: undo is only offered for a few seconds.
const deletedWithParent = new Map<string, string[]>()

/** Deleting and undoing it, with the reminder following the task and its subtasks. */
export const removableTasks = {
  softDelete: (id: string) =>
    withReminder(async () => {
      const subtaskIds = (await subtasksOf(id)).map((task) => task.id)
      for (const taskId of [id, ...subtaskIds]) {
        await tasks.softDelete(taskId)
        await dismissTaskReminder(taskId)
      }
      deletedWithParent.set(id, subtaskIds)
    }),
  restore: (id: string) =>
    withReminder(async () => {
      for (const taskId of [id, ...(deletedWithParent.get(id) ?? [])]) {
        await tasks.restore(taskId)
        const task = await tasks.get(taskId)
        if (task) {
          await refreshTaskReminder(task)
        }
      }
      deletedWithParent.delete(id)
    }),
}

/** The list's tasks are kept: they go back to the inbox. */
export function deleteTaskList(id: string) {
  return db.transaction('rw', db.table('tasks'), db.table('task_lists'), db.outbox, async () => {
    for (const task of await tasks.list()) {
      if (task.list_id === id) {
        await tasks.update(task.id, { list_id: null })
      }
    }
    await taskLists.softDelete(id)
  })
}
