import { pl } from '@/i18n/pl'
import { DAY_MINUTES, MORNING, timingOf, type ReminderChoice } from '@/lib/reminder-moment'

const WEEK_MINUTES = 7 * DAY_MINUTES

/** What the reminder is about: a timed event, an all-day event or a task. */
export type ReminderKind = 'timed' | 'allDay' | 'task'

const PRESETS: Record<ReminderKind, Record<number, string>> = {
  timed: pl.calendar.reminderOffsets,
  allDay: pl.calendar.allDayReminderOffsets,
  task: pl.tasks.reminderOffsets,
}

/** 09:00 → 9:00, as the labels read. */
const clock = (time: string) => time.replace(/^0(\d)/, '$1')

/** The ready-made label when there is one, else one built from the numbers. */
export function reminderLabel(choice: ReminderChoice, kind: ReminderKind): string {
  const { offset, time } = timingOf(choice)
  const text = pl.reminders
  const preset = time === null ? PRESETS[kind][offset] : undefined
  if (preset) return preset

  const at = clock(time ?? MORNING)
  if (offset % DAY_MINUTES === 0 && (offset > 0 || time !== null || kind === 'allDay')) {
    if (offset === 0) return text.sameDay(at)
    if (offset % WEEK_MINUTES === 0) return text.weeksBefore(offset / WEEK_MINUTES, at)
    return text.daysBefore(offset / DAY_MINUTES, at)
  }
  if (offset % 60 === 0 && offset > 0) return text.hoursBefore(offset / 60)
  return text.minutesBefore(offset)
}
