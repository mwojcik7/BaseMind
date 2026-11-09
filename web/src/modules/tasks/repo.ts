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

/** Deleting and undoing it, with the reminder following the task. */
export const removableTasks = {
  softDelete: (id: string) =>
    withReminder(async () => {
      await tasks.softDelete(id)
      await dismissTaskReminder(id)
    }),
  restore: (id: string) =>
    withReminder(async () => {
      await tasks.restore(id)
      const task = await tasks.get(id)
      if (task) {
        await refreshTaskReminder(task)
      }
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
