import { addMinutes, format, parseISO } from 'date-fns'
import type { ReminderChoice } from '@/lib/reminder-moment'
import { defaultSpan, rruleOf } from '@/modules/calendar/form'
import type { ParsedEventFields } from '@/modules/calendar/parse'
import { DEFAULT_EVENT_REMINDERS, timingFits } from '@/modules/calendar/reminder'
import { firstDueDate, pinToDate } from '@/modules/tasks/recurrence'

/** What was set by hand in the [+] sheet; undefined leaves it to the text. */
export interface QuickEventPicks {
  date?: string
  allDay?: boolean
  start?: string
  end?: string
  /** null: no reminder, on purpose. */
  reminder?: ReminderChoice | null
}

export interface QuickEventDraft {
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  allDay: boolean
  rrule: string | null
  reminder: ReminderChoice | null
}

const hourLater = (date: string, time: string) =>
  format(addMinutes(parseISO(`${date}T${time}`), 60), 'HH:mm')

const nextDay = (date: string) => format(addMinutes(parseISO(date), 24 * 60), 'yyyy-MM-dd')

/**
 * The event the [+] sheet will save. A value picked by hand wins over the text. Without a
 * day the event goes on `day` (today, or the day picked in the calendar's month), a series
 * on its first occurrence from then; without a time it lasts the whole day. An hour is
 * the default length, and an end before the start means the next day ("22-1").
 */
export function quickEventDraft(
  fields: Partial<ParsedEventFields>,
  picks: QuickEventPicks,
  { now, day }: { now: Date; day: string },
): QuickEventDraft {
  const rule = fields.rrule ?? null
  const date = picks.date ?? fields.date ?? (rule ? (firstDueDate(rule, day) ?? day) : day)
  const allDay = picks.allDay ?? fields.time === undefined
  const start = picks.start ?? fields.time ?? defaultSpan(now).start_time
  // A start changed by hand moves a typed end along with it: the hour from the text no longer fits.
  const end =
    picks.end ?? (picks.start === undefined ? fields.end_time : undefined) ?? hourLater(date, start)

  const typed = fields.reminder_offset
  const wanted =
    picks.reminder !== undefined ? picks.reminder : (typed ?? DEFAULT_EVENT_REMINDERS[0])
  // "przypomnij 30 min" means nothing for a whole day: the usual day before stands in.
  const reminder =
    wanted === null || timingFits(wanted, allDay) ? wanted : DEFAULT_EVENT_REMINDERS[0]

  return {
    start_date: date,
    start_time: start,
    end_date: !allDay && end < start ? nextDay(date) : date,
    end_time: end,
    allDay,
    rrule: rule
      ? rruleOf({
          rrule: pinToDate(rule, date),
          repeat_from: 'due',
          repeat_remaining: fields.repeat_remaining ?? null,
        })
      : null,
    reminder,
  }
}
