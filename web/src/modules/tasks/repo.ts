import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { db } from '@/db/db'
import { createRepository, type OwnFields, type SyncedRecord } from '@/db/repository'
import { nextDueDate, type RepeatFrom } from '@/modules/tasks/recurrence'
import {
  dismissTaskReminder,
  refreshTaskReminder,
  setTaskReminder,
  type ReminderSetting,
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
  // Repeating tasks (recurrence.ts). Optional: tasks stored before 2026-11-14 don't have them.
  /** RFC 5545 rule without DTSTART and COUNT; null or missing means the task doesn't repeat. */
  rrule?: string | null
  repeat_from?: RepeatFrom
  /** The date the pattern gives for this occurrence; due_date differs when only it was moved. */
  repeat_anchor?: string | null
  /** Occurrences left, this one included; null means no limit. */
  repeat_remaining?: number | null
  /** On a copy kept in history: the repeating task it came from. */
  recurring_task_id?: string | null
  /** On a deleted subtask: it went to the trash with its parent and comes back with it. */
  deleted_with_parent?: boolean
}

export const taskLists = createRepository<TaskList>('task_lists')
export const tasks = createRepository<Task>('tasks')

export const DEFAULT_PRIORITY = 4

// Everything below changes a task and its reminder together, or neither.
function withReminder<T>(work: () => Promise<T>) {
  return db.transaction('rw', db.table('tasks'), db.table('reminders'), db.outbox, work)
}

export function createTask(fields: OwnFields<Task>, offset: ReminderSetting = null) {
  return withReminder(async () => {
    const task = await tasks.create(fields)
    await setTaskReminder(task, offset)
    return task
  })
}

export function updateTask(id: string, patch: Partial<OwnFields<Task>>, offset: ReminderSetting) {
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

type TaskState = Pick<
  Task,
  'status' | 'completed_at' | 'due_date' | 'repeat_anchor' | 'repeat_remaining'
>

/** What `finishOccurrence` changed, so `undoOccurrence` can put it back. */
export interface FinishedOccurrence {
  /** The new due date, or null when the series ended with this occurrence. */
  next: string | null
  copyId: string | null
  before: { id: string; state: TaskState }[]
}

const stateOf = (task: Task): TaskState => ({
  status: task.status,
  completed_at: task.completed_at,
  due_date: task.due_date,
  repeat_anchor: task.repeat_anchor ?? null,
  repeat_remaining: task.repeat_remaining ?? null,
})

/**
 * Completes (or skips) the current occurrence of a repeating task: a copy goes to history
 * and the task moves to its next date, with its subtasks open again and moved by as many
 * days. When the series has ended, the task itself is completed. Mirrors
 * `TaskSeries::finishOccurrence` on the server.
 */
export function finishOccurrence(id: string, status: 'done' | 'cancelled' = 'done') {
  return withReminder(async (): Promise<FinishedOccurrence> => {
    const task = await tasks.get(id)
    if (!task?.rrule) {
      throw new Error(`Task ${id} does not repeat`)
    }

    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const currentDue = task.due_date ?? today
    const next = nextDueDate(
      task.rrule,
      task.repeat_from ?? 'due',
      task.repeat_anchor ?? currentDue,
      task.repeat_remaining ?? null,
      today,
    )
    const before = [{ id, state: stateOf(task) }]

    if (next === null) {
      await refreshTaskReminder(await tasks.update(id, { status, completed_at: now.toISOString() }))
      return { next, copyId: null, before }
    }

    const copy = await tasks.create({
      list_id: task.list_id,
      parent_id: null,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      status,
      due_date: currentDue,
      due_time: task.due_time,
      completed_at: now.toISOString(),
      recurring_task_id: task.id,
    })

    await refreshTaskReminder(
      await tasks.update(id, {
        due_date: next,
        repeat_anchor: next,
        repeat_remaining: task.repeat_remaining ? task.repeat_remaining - 1 : null,
      }),
    )

    const shift = differenceInCalendarDays(parseISO(next), parseISO(currentDue))
    for (const subtask of await subtasksOf(id)) {
      before.push({ id: subtask.id, state: stateOf(subtask) })
      await refreshTaskReminder(
        await tasks.update(subtask.id, {
          status: 'todo',
          completed_at: null,
          due_date: subtask.due_date
            ? format(addDays(parseISO(subtask.due_date), shift), 'yyyy-MM-dd')
            : null,
        }),
      )
    }

    return { next, copyId: copy.id, before }
  })
}

export function undoOccurrence(finished: FinishedOccurrence) {
  return withReminder(async () => {
    // Gone for good: the copy was never meant to be deleted, so it doesn't go to the trash.
    if (finished.copyId) {
      await tasks.softDelete(finished.copyId)
      await tasks.purge(finished.copyId)
    }
    for (const { id, state } of finished.before) {
      await refreshTaskReminder(await tasks.update(id, state))
    }
  })
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

/** Deleted tasks too, which the trash needs. */
function anyTask(id: string) {
  return db.table<Task, string>('tasks').get(id)
}

async function restoreOne(id: string) {
  await tasks.restore(id)
  const task = await tasks.get(id)
  if (task?.deleted_with_parent) {
    await tasks.update(id, { deleted_with_parent: false })
  }
  if (task) {
    await refreshTaskReminder((await tasks.get(id)) ?? task)
  }
}

/**
 * Deleting and restoring (by undo or from the trash), with reminders following the tasks.
 * A task takes its subtasks along, and brings back just those when restored, not ones
 * deleted on their own earlier.
 */
export const removableTasks = {
  softDelete: (id: string) =>
    withReminder(async () => {
      for (const subtask of await subtasksOf(id)) {
        await tasks.update(subtask.id, { deleted_with_parent: true })
        await tasks.softDelete(subtask.id)
        await dismissTaskReminder(subtask.id)
      }
      await tasks.softDelete(id)
      await dismissTaskReminder(id)
    }),
  restore: (id: string) =>
    withReminder(async () => {
      const task = await anyTask(id)
      // A subtask cannot come back without its parent; the parent's other subtasks stay.
      const parent = task?.parent_id ? await anyTask(task.parent_id) : undefined
      if (parent && parent.deleted_at !== null) {
        await restoreOne(parent.id)
      }

      await restoreOne(id)

      const deleted = await db.table<Task, string>('tasks').where('parent_id').equals(id).toArray()
      for (const subtask of deleted) {
        if (subtask.deleted_at !== null && subtask.deleted_with_parent) {
          await restoreOne(subtask.id)
        }
      }
    }),
  /** Removes it for good, with its subtasks (the server does the same). */
  purge: (id: string) =>
    withReminder(async () => {
      const subtasks = await db.table<Task, string>('tasks').where('parent_id').equals(id).toArray()
      for (const subtask of subtasks) {
        if (subtask.deleted_at !== null) {
          await tasks.purge(subtask.id)
        }
      }
      await tasks.purge(id)
    }),
}
