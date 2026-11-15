import { reminders, type Reminder } from '@/db/reminders'
import type { CalendarEvent } from '@/modules/calendar/repo'
import { nextReminderAt } from '@/modules/calendar/series'

const DAY = 1440

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
 * The reminders an event keeps after switching between all-day and timed: those the new
 * kind offers. Dropping all of them would surprise, so a day before stands in then.
 */
export function offsetsAfterSwitch(offsets: readonly number[], allDay: boolean): number[] {
  const allowed = reminderOffsetsFor(allDay)
  const kept = offsets.filter((offset) => allowed.includes(offset))
  return kept.length === 0 && offsets.length > 0 ? [DAY] : kept
}

/** The event's reminders, live ones only, soonest offset last (farthest ahead first). */
export async function findEventReminders(eventId: string): Promise<Reminder[]> {
  return (await reminders.list())
    .filter((reminder) => reminder.entity_type === 'events' && reminder.entity_id === eventId)
    .sort((a, b) => b.offset_minutes - a.offset_minutes)
}

function stateFor(event: CalendarEvent, offset: number) {
  const next = nextReminderAt(event, offset, new Date())
  return {
    title: event.title,
    // With nothing left to remind about, the choice is still remembered.
    remind_at: (next ?? new Date()).toISOString(),
    offset_minutes: offset,
    status: next ? ('scheduled' as const) : ('dismissed' as const),
    snoozed_until: null,
  }
}

/**
 * Makes the event's reminders exactly `offsets`, each pointing at the next occurrence still
 * to come. They carry no rule of their own: after one goes out, the server finds the next
 * occurrence the same way. Must be called inside a transaction covering reminders and the
 * outbox.
 */
export async function setEventReminders(event: CalendarEvent, offsets: readonly number[]) {
  const wanted = new Set(offsets)
  const existing = await findEventReminders(event.id)

  for (const reminder of existing) {
    if (wanted.has(reminder.offset_minutes)) {
      wanted.delete(reminder.offset_minutes)
      await reminders.update(reminder.id, stateFor(event, reminder.offset_minutes))
    } else {
      await reminders.softDelete(reminder.id)
    }
  }

  for (const offset of wanted) {
    await reminders.create({
      ...stateFor(event, offset),
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
  await setEventReminders(
    event,
    existing.map((reminder) => reminder.offset_minutes),
  )
}

export async function dismissEventReminders(eventId: string) {
  for (const reminder of await findEventReminders(eventId)) {
    await reminders.update(reminder.id, { status: 'dismissed', snoozed_until: null })
  }
}
