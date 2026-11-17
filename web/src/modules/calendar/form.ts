import {
  addDays,
  addHours,
  addMinutes,
  differenceInMinutes,
  format,
  parseISO,
  startOfHour,
} from 'date-fns'
import type { RepeatValue } from '@/modules/tasks/RepeatField'

/** Where a new event starts: at `time` when given, else the next full hour; lasting an hour. */
export function defaultSpan(now: Date, date?: string, time?: string) {
  const at = time ?? format(addHours(startOfHour(now), 1), 'HH:mm')
  const start = date ? parseISO(`${date}T${at}`) : addHours(startOfHour(now), 1)
  const end = addHours(start, 1)

  return {
    start_date: format(start, 'yyyy-MM-dd'),
    start_time: format(start, 'HH:mm'),
    end_date: format(end, 'yyyy-MM-dd'),
    end_time: format(end, 'HH:mm'),
  }
}

export interface Span {
  start_date: string
  start_time: string
  end_date: string
  end_time: string
}

const moment = (date: string, time: string) => parseISO(`${date}T${time || '00:00'}`)

/**
 * The span after the start was moved: the end moves with it, so the event keeps its length.
 * An all-day event keeps its number of days.
 */
export function moveStart(
  span: Span,
  start: { date: string; time: string },
  allDay: boolean,
): Span {
  if (allDay) {
    const days = Math.round(
      (parseISO(span.end_date).getTime() - parseISO(span.start_date).getTime()) / 86_400_000,
    )
    return {
      ...span,
      start_date: start.date,
      end_date: format(addDays(parseISO(start.date), Math.max(0, days)), 'yyyy-MM-dd'),
    }
  }

  const length = Math.max(
    0,
    differenceInMinutes(
      moment(span.end_date, span.end_time),
      moment(span.start_date, span.start_time),
    ),
  )
  const end = addMinutes(moment(start.date, start.time), length)

  return {
    start_date: start.date,
    start_time: start.time,
    end_date: format(end, 'yyyy-MM-dd'),
    end_time: format(end, 'HH:mm'),
  }
}

/** Whether the event ends no earlier than it starts. */
export function endsAfterStart(span: Span, allDay: boolean) {
  if (span.end_date !== span.start_date || allDay) {
    return span.end_date >= span.start_date
  }
  return span.end_time >= span.start_time
}

/**
 * The repeat editor counts occurrences in `repeat_remaining`, as tasks do; an event's rule
 * holds the count itself (COUNT), since its series starts at a fixed date.
 */
export function repeatOf(rrule: string | null): RepeatValue {
  const count = rrule?.match(/(?:^|;)COUNT=(\d+)/)?.[1]
  return {
    rrule: rrule ? rrule.replace(/;?COUNT=\d+/, '').replace(/^;/, '') : null,
    repeat_from: 'due',
    repeat_remaining: count ? Number(count) : null,
  }
}

export function rruleOf(repeat: RepeatValue): string | null {
  if (!repeat.rrule) {
    return null
  }
  return repeat.repeat_remaining ? `${repeat.rrule};COUNT=${repeat.repeat_remaining}` : repeat.rrule
}
