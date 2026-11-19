import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { RRule, type Options } from 'rrule'
import {
  fromRrule,
  toRrule,
  WEEKDAYS,
  weekdayOf,
  weekdayPositionsOf,
} from '@/modules/tasks/recurrence'

/**
 * Rules for changing part of a series: cutting it at an occurrence and moving it by days.
 * Plain dates throughout, as in series.ts.
 */

export const daysBetween = (from: string, to: string) =>
  differenceInCalendarDays(parseISO(to), parseISO(from))

export const shiftDate = (date: string, days: number) =>
  days === 0 ? date : format(addDays(parseISO(date), days), 'yyyy-MM-dd')

function utcDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const countOf = (rrule: string) => {
  const count = /(?:^|;)COUNT=(\d+)/.exec(rrule)?.[1]
  return count ? Number(count) : null
}

const untilOf = (rrule: string) => /(?:^|;)UNTIL=(\d{8})/.exec(rrule)?.[1] ?? null

/** The rule without its end (COUNT or UNTIL). */
const withoutEnd = (rrule: string) =>
  rrule
    .split(';')
    .filter((part) => !/^(COUNT|UNTIL)=/.test(part))
    .join(';')

/** How many occurrences the rule gives before `date`; skipped ones count, as in COUNT. */
export function occurrencesBefore(rrule: string, start: string, date: string): number {
  if (date <= start) {
    return 0
  }
  const options: Partial<Options> = RRule.parseString(withoutEnd(rrule))
  return new RRule({ ...options, dtstart: utcDate(start) }).between(
    utcDate(start),
    utcDate(shiftDate(date, -1)),
    true,
  ).length
}

/**
 * A series cut at the occurrence on `date`: the part before ends the day before, the
 * rest starts at `date` with what is left of a COUNT, or the same UNTIL.
 */
export function splitRule(
  rrule: string,
  start: string,
  date: string,
): { before: string; after: string } {
  const base = withoutEnd(rrule)
  const count = countOf(rrule)
  const until = untilOf(rrule)
  const before = `${base};UNTIL=${shiftDate(date, -1).replaceAll('-', '')}`

  if (count !== null) {
    const left = Math.max(1, count - occurrencesBefore(rrule, start, date))
    return { before, after: `${base};COUNT=${left}` }
  }
  return { before, after: until ? `${base};UNTIL=${until}` : base }
}

/**
 * The rule of a series moved from `from` to `to`, so that it still falls on its start:
 * "every Tuesday" moved a day on becomes "every Wednesday", "the 10th of each month"
 * the 11th. Days chosen by hand that don't follow the start stay as they are.
 */
export function moveRule(rrule: string, from: string, to: string): string {
  const days = daysBetween(from, to)
  const withoutCount = rrule
    .split(';')
    .filter((part) => !part.startsWith('COUNT='))
    .join(';')
  const spec = days === 0 ? null : fromRrule(withoutCount)
  if (!spec) {
    return rrule
  }

  const old = utcDate(from)
  const next = utcDate(to)

  if (spec.freq === 'WEEKLY') {
    spec.weekdays = spec.weekdays.map(
      (day) => WEEKDAYS[(((WEEKDAYS.indexOf(day) + days) % 7) + 7) % 7],
    )
  } else if (spec.freq === 'MONTHLY' && spec.monthly?.kind === 'day') {
    if (spec.monthly.day === old.getUTCDate()) {
      spec.monthly = { kind: 'day', day: next.getUTCDate() }
    }
  } else if (spec.freq === 'MONTHLY' && spec.monthly?.kind === 'weekday') {
    if (spec.monthly.weekday === weekdayOf(from)) {
      const positions = weekdayPositionsOf(to)
      spec.monthly = {
        kind: 'weekday',
        weekday: weekdayOf(to),
        position: spec.monthly.position === -1 && positions.includes(-1) ? -1 : positions[0],
      }
    }
  } else if (spec.freq === 'YEARLY' && spec.yearly) {
    if (spec.yearly.month === old.getUTCMonth() + 1 && spec.yearly.day === old.getUTCDate()) {
      spec.yearly = { month: next.getUTCMonth() + 1, day: next.getUTCDate() }
    }
  }

  const count = countOf(rrule)
  const end = count !== null ? `;COUNT=${count}` : ''
  // The UNTIL lives in the spec and comes back with it.
  return `${toRrule(spec)}${end}`
}
