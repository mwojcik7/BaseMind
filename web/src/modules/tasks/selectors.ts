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

  for (const task of open(all).filter((task) => !task.due_date || task.due_date > today)) {
    days.set(task.due_date, [...(days.get(task.due_date) ?? []), task])
  }

  return [...days.entries()]
    .sort(([a], [b]) => (a ?? '9999').localeCompare(b ?? '9999'))
    .map(([date, tasks]) => ({ date, tasks: tasks.sort(compareOpen) }))
}

/** Most recently completed first. */
export function completedTasks(all: readonly Task[]) {
  return all
    .filter((task) => task.status === 'done')
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
}

/** Pass null for the inbox, which also takes in tasks whose list was deleted. */
export function tasksInList(
  all: readonly Task[],
  listId: string | null,
  liveListIds: ReadonlySet<string>,
) {
  return open(all)
    .filter((task) =>
      listId === null
        ? task.list_id === null || !liveListIds.has(task.list_id)
        : task.list_id === listId,
    )
    .sort(compareOpen)
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
