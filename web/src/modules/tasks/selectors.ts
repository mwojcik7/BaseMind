import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { pl } from '@/i18n/pl'
import type { Task } from '@/modules/tasks/repo'

function compareOpen(a: Task, b: Task) {
  return (
    a.priority - b.priority ||
    // Tasks with a time come first, earliest on top.
    (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99') ||
    a.id.localeCompare(b.id)
  )
}

const open = (all: readonly Task[]) => all.filter((task) => task.status === 'todo')

export function todayTasks(all: readonly Task[], today: string) {
  const dated = open(all).filter((task) => task.due_date !== null && task.due_date <= today)

  return {
    overdue: dated.filter((task) => task.due_date !== today).sort(compareOpen),
    today: dated.filter((task) => task.due_date === today).sort(compareOpen),
  }
}

/** Future tasks by day, soonest first; the ones without a date come last. */
export function upcomingTasks(all: readonly Task[], today: string) {
  const days = new Map<string | null, Task[]>()
  const byId = new Map(all.map((task) => [task.id, task]))
  // A subtask shows up here only with its own date; otherwise it stays inside its parent.
  const listed = open(all).filter((task) => task.due_date || !parentOf(task, byId))

  for (const task of listed.filter((task) => !task.due_date || task.due_date > today)) {
    days.set(task.due_date, [...(days.get(task.due_date) ?? []), task])
  }

  return [...days.entries()]
    .sort(([a], [b]) => (a ?? '9999').localeCompare(b ?? '9999'))
    .map(([date, tasks]) => ({ date, tasks: tasks.sort(compareOpen) }))
}

/** Most recently completed first, with skipped occurrences of repeating tasks. */
export function completedTasks(all: readonly Task[]) {
  return all
    .filter(
      (task) => task.status === 'done' || (task.status === 'cancelled' && task.recurring_task_id),
    )
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
}

/**
 * The live parent of a subtask, or undefined for a top-level task. A subtask whose parent
 * was deleted (e.g. on another device) counts as top-level, so it never goes missing.
 * Tasks stored before subtasks existed have no `parent_id` at all.
 */
function parentOf(task: Task, byId: ReadonlyMap<string, Task>) {
  return task.parent_id ? byId.get(task.parent_id) : undefined
}

/** Pass null for the inbox, which also takes in tasks whose list was deleted. */
export function tasksInList(
  all: readonly Task[],
  listId: string | null,
  liveListIds: ReadonlySet<string>,
) {
  const byId = new Map(all.map((task) => [task.id, task]))

  // Subtasks are shown inside their parent, not on the list itself.
  return open(all)
    .filter((task) => !parentOf(task, byId))
    .filter((task) =>
      listId === null
        ? task.list_id === null || !liveListIds.has(task.list_id)
        : task.list_id === listId,
    )
    .sort(compareOpen)
}

/** The task's subtasks in the order they were added; done ones stay in place. */
export function subtasksIn(all: readonly Task[], parentId: string) {
  return all
    .filter((task) => task.parent_id === parentId && task.status !== 'cancelled')
    .sort((a, b) => a.id.localeCompare(b.id))
}

export interface TaskContext {
  /** For a subtask: its parent's title, shown next to it in the views. */
  parentTitle: string | undefined
  /** For a task with subtasks: how many are done. */
  progress: { done: number; total: number } | undefined
}

/** What a task's row needs to know about the tasks around it, computed once for a list. */
export function taskContexts(all: readonly Task[]) {
  const byId = new Map(all.map((task) => [task.id, task]))
  const progress = new Map<string, { done: number; total: number }>()

  for (const task of all) {
    const parent = parentOf(task, byId)
    if (parent && task.status !== 'cancelled') {
      const counts = progress.get(parent.id) ?? { done: 0, total: 0 }
      progress.set(parent.id, {
        done: counts.done + (task.status === 'done' ? 1 : 0),
        total: counts.total + 1,
      })
    }
  }

  return (task: Task): TaskContext => ({
    parentTitle: parentOf(task, byId)?.title,
    progress: progress.get(task.id),
  })
}

export function dayLabel(date: string, today: string) {
  const parsed = parseISO(date)
  const days = differenceInCalendarDays(parsed, parseISO(today))

  if (days === 0) {
    return pl.tasks.today
  }
  if (days === 1) {
    return pl.tasks.tomorrow
  }
  return format(parsed, 'EEEE, d MMMM', { locale: dateLocale })
}

export function dueLabel(task: Task, today: string) {
  if (!task.due_date) {
    return null
  }

  const day = dayLabel(task.due_date, today)
  return task.due_time ? `${day}, ${task.due_time}` : day
}
