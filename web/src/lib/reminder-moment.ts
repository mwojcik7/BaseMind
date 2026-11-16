/**
 * When a reminder about something dated goes out, in local wall time. The server
 * follows the same rule (`App\Support\ReminderMoment`, same cases file).
 *
 * - Without a time, the day counts from the morning.
 * - Whole days before (e.g. "1 day before") land in the morning of that day, so the
 *   evening's appointment is announced at breakfast, not the evening before; a reminder
 *   with its own time of day (`at`) lands at that time instead.
 * - `at` matters only for whole days: other offsets count from the moment itself.
 */
export const MORNING = '07:00'

export const DAY_MINUTES = 1440

export function reminderMoment(
  date: string,
  time: string | null,
  offset: number,
  at: string | null = null,
): Date {
  if (offset % DAY_MINUTES === 0 && (offset > 0 || at !== null)) {
    const day = new Date(`${date}T${at ?? MORNING}:00`)
    day.setDate(day.getDate() - offset / DAY_MINUTES)
    return day
  }

  const due = new Date(`${date}T${time ?? MORNING}:00`)
  return new Date(due.getTime() - offset * 60_000)
}

/** How long before, and for whole days optionally at what time of day (null = 7:00). */
export interface ReminderTiming {
  offset: number
  time: string | null
}

/** A plain number is minutes before, without a time of its own. */
export type ReminderChoice = number | ReminderTiming

export function timingOf(choice: ReminderChoice): ReminderTiming {
  if (typeof choice === 'number') {
    return { offset: choice, time: null }
  }
  // 7:00 is the default, so it is kept as no time of its own; a time only fits whole days.
  const time = choice.time === MORNING || choice.offset % DAY_MINUTES !== 0 ? null : choice.time
  return { offset: choice.offset, time }
}

/** One string per distinct timing, e.g. `1440` or `7200@09:00`; also a Select value. */
export function timingKey(choice: ReminderChoice): string {
  const { offset, time } = timingOf(choice)
  return time ? `${offset}@${time}` : String(offset)
}

export function parseTimingKey(key: string): ReminderTiming {
  const [offset, time] = key.split('@')
  return timingOf({ offset: Number(offset), time: time ?? null })
}

/** Farthest ahead first, as the lists show them. */
export function compareTimings(a: ReminderTiming, b: ReminderTiming): number {
  const moment = (timing: ReminderTiming) => {
    if (timing.offset % DAY_MINUTES !== 0 || (timing.offset === 0 && !timing.time))
      return timing.offset
    const [hours, minutes] = (timing.time ?? MORNING).split(':').map(Number)
    return timing.offset - (hours * 60 + minutes)
  }
  return moment(b) - moment(a)
}
