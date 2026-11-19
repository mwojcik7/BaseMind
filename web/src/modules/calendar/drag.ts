import { differenceInCalendarDays, parseISO } from 'date-fns'
import { shiftDay, type EventItem } from '@/modules/calendar/days'
import type { Span } from '@/modules/calendar/form'
import { DAY_MINUTES, minutesOf } from '@/modules/calendar/timeline'
import type { Task } from '@/modules/tasks/repo'

/**
 * Where a block dragged on the hour axis lands: the times are worked out on the user's
 * clock, in steps of a quarter of an hour.
 */

export const SNAP_MINUTES = 15

/** How far the block was dragged: in minutes (snapped) and, in the Week view, days. */
export interface Drop {
  /** Moving the whole block, or its bottom edge to change the length. */
  mode: 'move' | 'resize'
  minutes: number
  days: number
}

export const snapMinutes = (minutes: number) =>
  Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES || 0

const EPOCH = '2000-01-01'
const pad = (value: number) => String(value).padStart(2, '0')

/** Minutes from a fixed day, so that moving across midnight is plain arithmetic. */
const moment = (date: string, time: string) =>
  differenceInCalendarDays(parseISO(date), parseISO(EPOCH)) * DAY_MINUTES + minutesOf(time)

function fromMoment(value: number) {
  const day = Math.floor(value / DAY_MINUTES)
  const minutes = value - day * DAY_MINUTES
  return {
    date: shiftDay(EPOCH, day),
    time: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * The new times of an event occurrence after a drag; null when it lands where it was.
 * Moving keeps the length; a block starting on this day stays within the day it is
 * dropped on. Resizing changes the end, no shorter than a quarter of an hour and no
 * later than midnight of the day the block ends on.
 */
export function droppedEvent(item: EventItem, drop: Drop): Span | null {
  const { event, start: occurrence } = item
  if (event.start_time === null || event.end_time === null) {
    return null
  }

  const length = differenceInCalendarDays(parseISO(event.end_date), parseISO(event.start_date))
  const start = moment(occurrence, event.start_time)
  const end = moment(shiftDay(occurrence, length), event.end_time)
  let nextStart = start
  let nextEnd = end

  if (drop.mode === 'move') {
    let shift = drop.days * DAY_MINUTES + drop.minutes
    if (item.day === 1) {
      const startsAt = minutesOf(event.start_time)
      shift =
        drop.days * DAY_MINUTES +
        clamp(drop.minutes, -startsAt, DAY_MINUTES - SNAP_MINUTES - startsAt)
    }
    nextStart += shift
    nextEnd += shift
  } else {
    const lastDay = moment(shiftDay(occurrence, item.days - 1), '00:00')
    nextEnd = clamp(end + drop.minutes, start + SNAP_MINUTES, lastDay + DAY_MINUTES)
  }

  if (nextStart === start && nextEnd === end) {
    return null
  }
  const from = fromMoment(nextStart)
  const to = fromMoment(nextEnd)
  return { start_date: from.date, start_time: from.time, end_date: to.date, end_time: to.time }
}

/** The new term of a task with a time after a drag; null when it lands where it was. */
export function droppedTask(
  task: Pick<Task, 'due_date' | 'due_time'>,
  drop: Drop,
): { due_date: string; due_time: string } | null {
  if (!task.due_date || !task.due_time || drop.mode !== 'move') {
    return null
  }
  const startsAt = minutesOf(task.due_time)
  const minutes = clamp(startsAt + drop.minutes, 0, DAY_MINUTES - SNAP_MINUTES)
  if (drop.days === 0 && minutes === startsAt) {
    return null
  }
  return {
    due_date: shiftDay(task.due_date, drop.days),
    due_time: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
  }
}
