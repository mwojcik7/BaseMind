import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { RRule, type Options } from 'rrule'
import { reminderMoment } from '@/lib/reminder-moment'
import type { CalendarEvent } from '@/modules/calendar/repo'

/**
 * Occurrences of calendar events. The server runs the same rules
 * (api/app/Services/EventSeries.php); series.cases.json keeps both sides in step.
 *
 * A series starts at the event's start_date. Occurrences are worked out as plain dates
 * (at midnight UTC, as for tasks), and the event's times are added on the user's clock,
 * so a weekly 18:00 stays at 18:00 across daylight saving changes.
 */

type Dates = Pick<CalendarEvent, 'start_date' | 'end_date' | 'rrule' | 'exdates'>
type Timing = Pick<CalendarEvent, 'start_date' | 'start_time' | 'rrule' | 'exdates'>

/** Enough for any reminder the app offers; a guard against endless rules. */
const MAX_LOOKAHEAD = 1000

function utcDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const dateKey = (date: Date) => date.toISOString().slice(0, 10)

function ruleFor(rrule: string, start: string) {
  const options: Partial<Options> = RRule.parseString(rrule)
  return new RRule({ ...options, dtstart: utcDate(start) })
}

/** Start dates of the occurrences that fall on any day from `from` to `to` (inclusive). */
export function occurrenceStarts(event: Dates, from: string, to: string): string[] {
  const span = differenceInCalendarDays(parseISO(event.end_date), parseISO(event.start_date))
  const earliest = format(addDays(parseISO(from), -span), 'yyyy-MM-dd')

  if (!event.rrule) {
    return event.start_date >= earliest && event.start_date <= to ? [event.start_date] : []
  }

  const skipped = new Set(event.exdates ?? [])
  return ruleFor(event.rrule, event.start_date)
    .between(utcDate(earliest), utcDate(to), true)
    .map(dateKey)
    .filter((start) => !skipped.has(start))
}

/**
 * When the reminder `offset` minutes before an occurrence goes out next, strictly after
 * `after`; null when no occurrence is left to remind about. `at` is the reminder's own
 * time of day for whole days before (lib/reminder-moment).
 */
export function nextReminderAt(
  event: Timing,
  offset: number,
  after: Date,
  at: string | null = null,
): Date | null {
  const momentOf = (start: string) => reminderMoment(start, event.start_time, offset, at)

  if (!event.rrule) {
    const moment = momentOf(event.start_date)
    return moment > after ? moment : null
  }

  // A reminder never comes after its occurrence, so earlier days are already gone.
  const skipped = new Set(event.exdates ?? [])
  const rule = ruleFor(event.rrule, event.start_date)
  let cursor = utcDate(format(after, 'yyyy-MM-dd'))
  let inclusive = true

  for (let step = 0; step < MAX_LOOKAHEAD; step++) {
    const next = rule.after(cursor, inclusive)
    if (!next) {
      return null
    }

    const start = dateKey(next)
    const moment = momentOf(start)
    if (!skipped.has(start) && moment > after) {
      return moment
    }

    cursor = next
    inclusive = false
  }

  return null
}
