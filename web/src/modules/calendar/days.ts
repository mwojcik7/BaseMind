import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { pl } from '@/i18n/pl'
import { holidaysIn } from '@/modules/calendar/holidays'
import type { CalendarEvent } from '@/modules/calendar/repo'
import { occurrenceStarts } from '@/modules/calendar/series'
import { layerShown, type CalendarSettings } from '@/modules/calendar/settings'
import type { Task } from '@/modules/tasks/repo'

/**
 * What the calendar shows on each day, gathered from the layers ("date providers"):
 * events, tasks with a date and public holidays. A module with dates adds its layer here
 * and to CALENDAR_LAYERS.
 */

export type CalendarItem =
  | { kind: 'holiday'; key: string; name: string }
  | {
      kind: 'event'
      key: string
      event: CalendarEvent
      /** The occurrence's first day: opens that occurrence of a series. */
      start: string
      /** Which day of the occurrence this is (1-based) and how many it lasts. */
      day: number
      days: number
    }
  | { kind: 'task'; key: string; task: Task }

export interface CalendarSources {
  events: readonly CalendarEvent[]
  tasks: readonly Task[]
}

const dateKey = (date: Date) => format(date, 'yyyy-MM-dd')
export const shiftDay = (date: string, days: number) => dateKey(addDays(parseISO(date), days))

/** Every day from `from` to `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const count = differenceInCalendarDays(parseISO(to), parseISO(from))
  return Array.from({ length: count + 1 }, (_, index) => shiftDay(from, index))
}

/** Tasks the calendar shows: open ones, and done ones when asked for; skipped never. */
function shownTask(task: Task, settings: CalendarSettings) {
  return task.status === 'todo' || (task.status === 'done' && settings.show_done)
}

/**
 * Order within a day: holidays, then all-day items (events without a time, the inner
 * days of long ones), then by the time, and tasks without a time last.
 */
function rank(item: CalendarItem): [number, string] {
  if (item.kind === 'holiday') return [0, '']
  if (item.kind === 'task') return item.task.due_time ? [2, item.task.due_time] : [3, '']
  const { event, day } = item
  return event.start_time && day === 1 ? [2, event.start_time] : [1, '']
}

function compare(a: CalendarItem, b: CalendarItem) {
  const [groupA, timeA] = rank(a)
  const [groupB, timeB] = rank(b)
  return groupA - groupB || timeA.localeCompare(timeB) || a.key.localeCompare(b.key)
}

/** Items per day from `from` to `to`; days without any are left out. */
export function itemsByDay(
  sources: CalendarSources,
  settings: CalendarSettings,
  from: string,
  to: string,
): Map<string, CalendarItem[]> {
  const days = new Map<string, CalendarItem[]>()
  const add = (day: string, item: CalendarItem) => {
    if (day >= from && day <= to) days.set(day, [...(days.get(day) ?? []), item])
  }

  if (layerShown(settings, 'holidays')) {
    for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
      for (const [day, name] of holidaysIn(year)) add(day, { kind: 'holiday', key: day, name })
    }
  }

  if (layerShown(settings, 'events')) {
    for (const event of sources.events) {
      const length =
        differenceInCalendarDays(parseISO(event.end_date), parseISO(event.start_date)) + 1
      for (const start of occurrenceStarts(event, from, to)) {
        for (let index = 0; index < length; index++) {
          add(shiftDay(start, index), {
            kind: 'event',
            key: `${event.id}:${start}`,
            event,
            start,
            day: index + 1,
            days: length,
          })
        }
      }
    }
  }

  if (layerShown(settings, 'tasks')) {
    for (const task of sources.tasks) {
      if (task.due_date && shownTask(task, settings)) {
        add(task.due_date, { kind: 'task', key: task.id, task })
      }
    }
  }

  for (const items of days.values()) items.sort(compare)
  return days
}

/** Open tasks past their date, oldest first; empty when the tasks layer is hidden. */
export function overdueTasks(tasks: readonly Task[], settings: CalendarSettings, today: string) {
  if (!layerShown(settings, 'tasks')) return []
  return tasks
    .filter((task) => task.status === 'todo' && task.due_date !== null && task.due_date < today)
    .sort(
      (a, b) =>
        (a.due_date ?? '').localeCompare(b.due_date ?? '') ||
        (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99'),
    )
}

/** The weeks shown for a month ('yyyy-MM'), Monday first, padded with the days around it. */
export function monthGrid(month: string): string[][] {
  const first = parseISO(`${month}-01`)
  const from = dateKey(startOfWeek(startOfMonth(first), { weekStartsOn: 1 }))
  const to = dateKey(endOfWeek(endOfMonth(first), { weekStartsOn: 1 }))
  const all = daysBetween(from, to)
  return Array.from({ length: all.length / 7 }, (_, week) => all.slice(week * 7, week * 7 + 7))
}

export const shiftMonth = (month: string, by: number) => {
  const date = parseISO(`${month}-01`)
  return format(new Date(date.getFullYear(), date.getMonth() + by, 1), 'yyyy-MM')
}

/** "poniedziałek 16 listopada", prefixed with "Dziś" on today. */
export function dayHeading(date: string, today: string) {
  const full = format(parseISO(date), 'EEEE d MMMM', { locale: dateLocale })
  return date === today ? `${pl.tasks.today} · ${full}` : full
}
