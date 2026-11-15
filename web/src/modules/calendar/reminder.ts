import { reminders } from '@/db/reminders'
import type { CalendarEvent } from '@/modules/calendar/repo'
import { nextReminderAt } from '@/modules/calendar/series'

/** Minutes before the event; null means no reminder. */
export type EventReminderOffset = number | null

export const EVENT_REMINDER_OFFSETS: readonly number[] = [0, 15, 30, 60, 1440]

/** What a new event gets unless changed: a day before, in the morning (user's decision). */
export const DEFAULT_EVENT_REMINDER = 1440

export async function findEventReminder(eventId: string) {
  return (await reminders.list()).find(
    (reminder) => reminder.entity_type === 'events' && reminder.entity_id === eventId,
  )
}

/**
 * Points the event's reminder at its next occurrence still to come. The reminder carries
 * no rule of its own: after each one goes out, the server finds the next occurrence the
 * same way. Must be called inside a transaction covering reminders and the outbox.
 */
export async function setEventReminder(event: CalendarEvent, offset: EventReminderOffset) {
  const existing = await findEventReminder(event.id)

  if (offset === null) {
    if (existing) {
      await reminders.softDelete(existing.id)
    }
    return
  }

  const next = nextReminderAt(event, offset, new Date())
  const fields = {
    title: event.title,
    // With nothing left to remind about, the choice is still remembered.
    remind_at: (next ?? new Date()).toISOString(),
    offset_minutes: offset,
    status: next ? ('scheduled' as const) : ('dismissed' as const),
    snoozed_until: null,
  }

  if (existing) {
    await reminders.update(existing.id, fields)
  } else {
    await reminders.create({
      ...fields,
      entity_type: 'events',
      entity_id: event.id,
      rrule: null,
      channels: ['push', 'email'],
    })
  }
}

/** Keeps the event's reminder, if it has one, in step with a change to the event. */
export async function refreshEventReminder(event: CalendarEvent) {
  const existing = await findEventReminder(event.id)
  if (existing) {
    await setEventReminder(event, existing.offset_minutes)
  }
}

export async function dismissEventReminder(eventId: string) {
  const existing = await findEventReminder(eventId)
  if (existing) {
    await reminders.update(existing.id, { status: 'dismissed', snoozed_until: null })
  }
}
