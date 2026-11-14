import { format, parseISO } from 'date-fns'
import { RRule, type Options } from 'rrule'
import { pl } from '@/i18n/pl'

/**
 * Repeating tasks. The server runs the same rules (api/app/Services/TaskSeries.php) for
 * the Done button on a notification; recurrence.cases.json keeps both sides in step.
 *
 * Rules are RFC 5545 without DTSTART and COUNT: the series starts at the task's
 * `repeat_anchor`, and `repeat_remaining` counts occurrences instead. UNTIL is a plain
 * date (UNTIL=20261231). Occurrences fall at midnight UTC, so their dates are the task's.
 */

export type RepeatFrom = 'due' | 'completion'
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export const WEEKDAYS: readonly Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
export const WORKDAYS: readonly Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR']

/** Which day of the month a monthly series falls on. */
export type MonthlyDay =
  | { kind: 'day'; day: number } // 1–31, or -1 for the last day
  | { kind: 'weekday'; position: WeekdayPosition; weekday: Weekday }

/** 1–4, or -1 for the last one in the month. */
export type WeekdayPosition = 1 | 2 | 3 | 4 | -1

/** A rule the editor can show. Anything else is kept as it is, but not editable. */
export interface RecurrenceSpec {
  freq: Frequency
  interval: number
  /** WEEKLY: the days, in week order. */
  weekdays: Weekday[]
  /** MONTHLY. */
  monthly: MonthlyDay | null
  /** YEARLY: month 1–12 and day. */
  yearly: { month: number; day: number } | null
  /** 'yyyy-MM-dd', the last day the series may fall on. */
  until: string | null
}

function utcDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const dateKey = (date: Date) => date.toISOString().slice(0, 10)

function ruleFrom(rrule: string, start: string) {
  const options: Partial<Options> = RRule.parseString(rrule)
  return new RRule({ ...options, dtstart: utcDate(start) })
}

/** Throws nothing: an invalid rule is simply not a rule. */
export function isValidRule(rrule: string) {
  try {
    ruleFrom(rrule, '2026-01-01')
    return /^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)\b/.test(rrule) && !/\b(COUNT|DTSTART)\b/.test(rrule)
  } catch {
    return false
  }
}

/**
 * The next due date, or null when the series has ended.
 *
 * Counting from the due date, the next occurrence is the first one after both the
 * current occurrence and today: an overdue task doesn't come back already overdue.
 */
export function nextDueDate(
  rrule: string,
  repeatFrom: RepeatFrom,
  anchor: string,
  remaining: number | null,
  today: string,
): string | null {
  if (remaining !== null && remaining <= 1) {
    return null
  }

  const start = repeatFrom === 'completion' ? today : anchor
  const after = start > today ? start : today
  const next = ruleFrom(rrule, start).after(utcDate(after), false)

  return next ? dateKey(next) : null
}

/** The first date on or after `from` that the rule falls on: where a new series starts. */
export function firstDueDate(rrule: string, from: string): string | null {
  const first = ruleFrom(rrule, from).after(utcDate(from), true)
  return first ? dateKey(first) : null
}

export function toRrule(spec: RecurrenceSpec): string {
  const parts = [`FREQ=${spec.freq}`]
  if (spec.interval > 1) {
    parts.push(`INTERVAL=${spec.interval}`)
  }

  if (spec.freq === 'WEEKLY' && spec.weekdays.length > 0) {
    parts.push(`BYDAY=${WEEKDAYS.filter((day) => spec.weekdays.includes(day)).join(',')}`)
  }
  if (spec.freq === 'MONTHLY' && spec.monthly) {
    parts.push(
      spec.monthly.kind === 'day'
        ? `BYMONTHDAY=${spec.monthly.day}`
        : `BYDAY=${spec.monthly.position}${spec.monthly.weekday}`,
    )
  }
  if (spec.freq === 'YEARLY' && spec.yearly) {
    parts.push(`BYMONTH=${spec.yearly.month}`, `BYMONTHDAY=${spec.yearly.day}`)
  }
  if (spec.until) {
    parts.push(`UNTIL=${spec.until.replaceAll('-', '')}`)
  }

  return parts.join(';')
}

/** The editable form of a rule, or null for a rule the editor doesn't know. */
export function fromRrule(rrule: string): RecurrenceSpec | null {
  const parts = new Map(
    rrule.split(';').map((part) => {
      const [name, value = ''] = part.split('=')
      return [name.toUpperCase(), value.toUpperCase()] as const
    }),
  )
  const known = ['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'BYMONTH', 'UNTIL']
  if ([...parts.keys()].some((name) => !known.includes(name))) {
    return null
  }

  const freq = parts.get('FREQ') as Frequency
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) {
    return null
  }

  const interval = Number(parts.get('INTERVAL') ?? 1)
  const byDay = parts.get('BYDAY')?.split(',') ?? []
  const monthDay = parts.has('BYMONTHDAY') ? Number(parts.get('BYMONTHDAY')) : null
  const until = parts.get('UNTIL')
  const spec: RecurrenceSpec = {
    freq,
    interval: Number.isInteger(interval) && interval > 0 ? interval : 1,
    weekdays: [],
    monthly: null,
    yearly: null,
    until:
      until && /^\d{8}$/.test(until)
        ? `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6)}`
        : null,
  }
  if (until && !spec.until) {
    return null
  }

  if (freq === 'WEEKLY') {
    if (!byDay.every((day) => WEEKDAYS.includes(day as Weekday)) || parts.has('BYMONTHDAY')) {
      return null
    }
    spec.weekdays = byDay as Weekday[]
  } else if (freq === 'MONTHLY') {
    const nth = byDay.length === 1 ? /^(-1|[1-4])(MO|TU|WE|TH|FR|SA|SU)$/.exec(byDay[0]) : null
    if (monthDay !== null && byDay.length === 0) {
      spec.monthly = { kind: 'day', day: monthDay }
    } else if (nth && monthDay === null) {
      spec.monthly = {
        kind: 'weekday',
        position: Number(nth[1]) as WeekdayPosition,
        weekday: nth[2] as Weekday,
      }
    } else if (byDay.length > 0 || monthDay !== null) {
      return null
    }
  } else if (freq === 'YEARLY') {
    const month = parts.has('BYMONTH') ? Number(parts.get('BYMONTH')) : null
    if (byDay.length > 0 || (month === null) !== (monthDay === null)) {
      return null
    }
    spec.yearly = month !== null && monthDay !== null ? { month, day: monthDay } : null
  } else if (byDay.length > 0 || monthDay !== null) {
    return null
  }

  return spec
}

const weekdayIndex = (day: Weekday) => WEEKDAYS.indexOf(day)

/** "Co tydzień: pon., czw. do 31.12.2026", for the task's row and editor. */
export function describeRecurrence(task: {
  rrule?: string | null
  repeat_from?: RepeatFrom
  repeat_remaining?: number | null
}): string | null {
  if (!task.rrule) {
    return null
  }

  const text = pl.tasks.repeat
  const spec = fromRrule(task.rrule)
  if (!spec) {
    return text.icon
  }

  let main: string
  if (spec.freq === 'WEEKLY' && spec.interval === 1 && sameDays(spec.weekdays, WORKDAYS)) {
    main = text.workdays
  } else {
    main = text.everyN[spec.freq](spec.interval)
    if (spec.freq === 'WEEKLY' && spec.weekdays.length > 0) {
      main += `: ${spec.weekdays.map((day) => text.weekdayShort[weekdayIndex(day)]).join(', ')}`
    } else if (spec.monthly?.kind === 'day') {
      main += `, ${text.monthDay(spec.monthly.day)}`
    } else if (spec.monthly?.kind === 'weekday') {
      main += `, ${text.nthWeekday(spec.monthly.position, weekdayIndex(spec.monthly.weekday))}`
    } else if (spec.yearly) {
      main += `, ${text.yearDay(spec.yearly.day, spec.yearly.month)}`
    }
  }

  const extras = [
    task.repeat_from === 'completion' ? text.fromCompletion : null,
    spec.until ? text.until(format(parseISO(spec.until), 'dd.MM.yyyy')) : null,
    task.repeat_remaining ? text.remaining(task.repeat_remaining) : null,
  ].filter(Boolean)

  return extras.length > 0 ? `${main} ${extras.join(', ')}` : main
}

function sameDays(a: readonly Weekday[], b: readonly Weekday[]) {
  return a.length === b.length && b.every((day) => a.includes(day))
}

/**
 * Fills in the day a bare rule falls on from the task's date: "co tydzień" on a Friday
 * becomes "every week on Friday". The series would do that anyway, but this way the
 * editor shows it and moving one occurrence can't change it.
 */
export function pinToDate(rrule: string, date: string): string {
  const spec = fromRrule(rrule)
  if (!spec) {
    return rrule
  }

  const day = utcDate(date)
  if (spec.freq === 'WEEKLY' && spec.weekdays.length === 0) {
    spec.weekdays = [weekdayOf(date)]
  } else if (spec.freq === 'MONTHLY' && !spec.monthly) {
    spec.monthly = { kind: 'day', day: day.getUTCDate() }
  } else if (spec.freq === 'YEARLY' && !spec.yearly) {
    spec.yearly = { month: day.getUTCMonth() + 1, day: day.getUTCDate() }
  } else {
    return rrule
  }
  return toRrule(spec)
}

/** The weekday of a 'yyyy-MM-dd' date. */
export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[(utcDate(date).getUTCDay() + 6) % 7]
}

/**
 * Which "nth weekday" of its month a date is. The 4th can also be the last one, so
 * both are offered: [4, -1]. A 5th is only ever "the last".
 */
export function weekdayPositionsOf(date: string): WeekdayPosition[] {
  const day = utcDate(date)
  const position = Math.ceil(day.getUTCDate() / 7)
  const daysInMonth = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const isLast = day.getUTCDate() + 7 > daysInMonth

  if (position > 4) {
    return [-1]
  }
  return isLast ? [position as WeekdayPosition, -1] : [position as WeekdayPosition]
}
