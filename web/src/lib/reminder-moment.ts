/**
 * When a reminder about something dated goes out, in local wall time. The server
 * follows the same rule (`App\Support\ReminderMoment`, same cases file).
 *
 * - Without a time, the day counts from the morning.
 * - Whole days before (e.g. "1 day before") always land in the morning of that day,
 *   so the evening's appointment is announced at breakfast, not the evening before.
 */
export const MORNING = '07:00'

const DAY_MINUTES = 1440

export function reminderMoment(date: string, time: string | null, offset: number): Date {
  if (offset > 0 && offset % DAY_MINUTES === 0) {
    const day = new Date(`${date}T${MORNING}:00`)
    day.setDate(day.getDate() - offset / DAY_MINUTES)
    return day
  }

  const due = new Date(`${date}T${time ?? MORNING}:00`)
  return new Date(due.getTime() - offset * 60_000)
}
