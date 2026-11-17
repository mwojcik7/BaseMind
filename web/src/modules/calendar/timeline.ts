import { format, parseISO, startOfWeek } from 'date-fns'
import {
  daysBetween,
  endsAtMidnight,
  shiftDay,
  type CalendarItem,
  type EventItem,
} from '@/modules/calendar/days'
import type { Task } from '@/modules/tasks/repo'

/**
 * The Day and Week views: a day's items split into the all-day strip and blocks on the
 * hour axis, with overlapping blocks side by side.
 */

export const DAY_MINUTES = 24 * 60
/** A task with a time takes this much room on the axis. */
export const TASK_MINUTES = 30
/** Shorter blocks are drawn this tall, so they can be read and tapped. */
export const MIN_BLOCK_MINUTES = 20

export type TimedItem = EventItem | { kind: 'task'; key: string; task: Task }

export interface TimedBlock {
  item: TimedItem
  /** Minutes from midnight; `end` is where the block is drawn to. */
  start: number
  end: number
  /** Which of the side-by-side columns of its group, and how many there are. */
  column: number
  columns: number
}

export const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/**
 * Where an item sits on the axis this day; null for the strip. A timed event lasting
 * several days runs to midnight on its first day and from midnight on its last; the days
 * between are whole and go to the strip.
 */
function span(item: CalendarItem): [number, number] | null {
  if (item.kind === 'task') {
    const start = item.task.due_time ? minutesOf(item.task.due_time) : null
    return start === null ? null : [start, start + TASK_MINUTES]
  }
  if (item.kind !== 'event') return null

  const { event, day, days } = item
  if (event.start_time === null || (day !== 1 && day !== days)) return null
  const start = day === 1 ? minutesOf(event.start_time) : 0
  const last = day === days && !endsAtMidnight(event)
  const end = last && event.end_time ? minutesOf(event.end_time) : DAY_MINUTES
  return [start, end]
}

/** Places overlapping blocks in columns; a group of blocks that overlap shares their number. */
function layOut(placed: { item: TimedItem; start: number; end: number }[]): TimedBlock[] {
  const sorted = [...placed].sort((a, b) => a.start - b.start || b.end - a.end)
  const blocks: TimedBlock[] = []
  let group: TimedBlock[] = []
  let columnEnds: number[] = []
  let groupEnd = -1

  const closeGroup = () => {
    for (const block of group) block.columns = columnEnds.length
    blocks.push(...group)
    group = []
    columnEnds = []
  }

  for (const { item, start, end: realEnd } of sorted) {
    const end = Math.min(DAY_MINUTES, Math.max(realEnd, start + MIN_BLOCK_MINUTES))
    if (start >= groupEnd) closeGroup()
    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start)
    if (column === -1) column = columnEnds.push(end) - 1
    else columnEnds[column] = end
    group.push({ item, start, end, column, columns: 1 })
    groupEnd = Math.max(groupEnd, end)
  }
  closeGroup()
  return blocks
}

/** A day's items (already in the calendar's order) for the strip and the axis. */
export function splitDay(items: readonly CalendarItem[]) {
  const allDay: CalendarItem[] = []
  const timed: { item: TimedItem; start: number; end: number }[] = []

  for (const item of items) {
    const place = span(item)
    if (place && item.kind !== 'holiday') timed.push({ item, start: place[0], end: place[1] })
    else allDay.push(item)
  }
  return { allDay, timed: layOut(timed) }
}

/** Days the Week view shows on a wide screen (Monday to Sunday) or a phone (three from the day). */
export function weekDays(selected: string, wide: boolean): string[] {
  if (!wide) return daysBetween(selected, shiftDay(selected, 2))
  const monday = format(startOfWeek(parseISO(selected), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return daysBetween(monday, shiftDay(monday, 6))
}
