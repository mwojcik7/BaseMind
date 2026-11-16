import { reminders, timingOfReminder, type Reminder } from '@/db/reminders'
import {
  compareTimings,
  DAY_MINUTES as DAY,
  timingKey,
  timingOf,
  type ReminderChoice,
  type ReminderTiming,
} from '@/lib/reminder-moment'
import type { CalendarEvent } from '@/modules/calendar/repo'
import { nextReminderAt } from '@/modules/calendar/series'

/** Minutes before an event with times. Whole days go out at 7:00 (lib/reminder-moment). */
export const TIMED_REMINDER_OFFSETS: readonly number[] = [0, 15, 30, 60, DAY]

/** Days before an all-day event, at 7:00; a month counts as 30 days. */
export const ALL_DAY_REMINDER_OFFSETS: readonly number[] = [
  0,
  DAY,
  2 * DAY,
  3 * DAY,
  7 * DAY,
  30 * DAY,
]

/** What a new event gets unless changed: a day before, in the morning (user's decision). */
export const DEFAULT_EVENT_REMINDERS: readonly number[] = [DAY]

export const reminderOffsetsFor = (allDay: boolean) =>
  allDay ? ALL_DAY_REMINDER_OFFSETS : TIMED_REMINDER_OFFSETS

/**
 * Whether a reminder suits the kind of event. An all-day event has no hour to count
 * minutes from, so only whole days fit; a time of its own on the very day could come
 * after a timed event has started.
 */
export function timingFits(choice: ReminderChoice, allDay: boolean): boolean {
  const { offset, time } = timingOf(choice)
  if (allDay) return offset % DAY === 0
  return time === null || offset >= DAY
}

/**
 * The reminders an event keeps after switching between all-day and timed: those that
 * suit the new kind. Dropping all of them would surprise, so a day before stands in then.
 */
export function timingsAfterSwitch(
  choices: readonly ReminderChoice[],
  allDay: boolean,
): ReminderTiming[] {
  const kept = choices.map(timingOf).filter((timing) => timingFits(timing, allDay))
  return kept.length === 0 && choices.length > 0 ? [timingOf(DAY)] : kept
}

/** The event's reminders, live ones only, farthest ahead first. */
export async function findEventReminders(eventId: string): Promise<Reminder[]> {
  return (await reminders.list())
    .filter((reminder) => reminder.entity_type === 'events' && reminder.entity_id === eventId)
    .sort((a, b) => compareTimings(timingOfReminder(a), timingOfReminder(b)))
}

function stateFor(event: CalendarEvent, { offset, time }: ReminderTiming) {
  const next = nextReminderAt(event, offset, new Date(), time)
  return {
    title: event.title,
    // With nothing left to remind about, the choice is still remembered.
    remind_at: (next ?? new Date()).toISOString(),
    offset_minutes: offset,
    remind_time: time,
    status: next ? ('scheduled' as const) : ('dismissed' as const),
    snoozed_until: null,
  }
}

/**
 * Makes the event's reminders exactly `choices`, each pointing at the next occurrence
 * still to come. They carry no rule of their own: after one goes out, the server finds
 * the next occurrence the same way. Must be called inside a transaction covering
 * reminders and the outbox.
 */
export async function setEventReminders(event: CalendarEvent, choices: readonly ReminderChoice[]) {
  const wanted = new Map(choices.map((choice) => [timingKey(choice), timingOf(choice)]))
  const existing = await findEventReminders(event.id)

  for (const reminder of existing) {
    const key = timingKey(timingOfReminder(reminder))
    const timing = wanted.get(key)
    if (timing) {
      wanted.delete(key)
      await reminders.update(reminder.id, stateFor(event, timing))
    } else {
      await reminders.softDelete(reminder.id)
    }
  }

  for (const timing of wanted.values()) {
    await reminders.create({
      ...stateFor(event, timing),
      entity_type: 'events',
      entity_id: event.id,
      rrule: null,
      channels: ['push', 'email'],
    })
  }
}

/** Keeps the event's reminders in step with a change to the event. */
export async function refreshEventReminders(event: CalendarEvent) {
  const existing = await findEventReminders(event.id)
  await setEventReminders(event, existing.map(timingOfReminder))
}

export async function dismissEventReminders(eventId: string) {
  for (const reminder of await findEventReminders(eventId)) {
    await reminders.update(reminder.id, { status: 'dismissed', snoozed_until: null })
  }
}
