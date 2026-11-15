import { db } from '@/db/db'
import { createRepository, type OwnFields, type SyncedRecord } from '@/db/repository'
import {
  dismissEventReminder,
  refreshEventReminder,
  setEventReminder,
  type EventReminderOffset,
} from '@/modules/calendar/reminder'

/** Palette names; the server accepts the same list (App\Models\Event::COLORS). */
export const EVENT_COLORS = [
  'blue',
  'teal',
  'green',
  'yellow',
  'orange',
  'red',
  'pink',
  'purple',
] as const

export type EventColor = (typeof EVENT_COLORS)[number]

/**
 * A calendar event. Named so as not to clash with the DOM's Event. Dates and times are
 * wall time on the user's clock; without times the event lasts whole days.
 */
export interface CalendarEvent extends SyncedRecord {
  title: string
  location: string | null
  /** Markdown. */
  description: string | null
  /** 'yyyy-MM-dd' */
  start_date: string
  /** 'HH:mm'; null together with end_time for an all-day event. */
  start_time: string | null
  /** 'yyyy-MM-dd', the last day of the event (inclusive). */
  end_date: string
  /** 'HH:mm' */
  end_time: string | null
  /** RFC 5545 rule without DTSTART (the series starts at start_date); COUNT allowed. */
  rrule: string | null
  /** Start dates of skipped occurrences. */
  exdates: string[] | null
  /** Null means the accent colour. */
  color: EventColor | null
}

export const events = createRepository<CalendarEvent>('events')

export const isAllDay = (event: Pick<CalendarEvent, 'start_time'>) => event.start_time === null

// Everything below changes an event and its reminder together, or neither.
function withReminder<T>(work: () => Promise<T>) {
  return db.transaction('rw', db.table('events'), db.table('reminders'), db.outbox, work)
}

export function createEvent(fields: OwnFields<CalendarEvent>, offset: EventReminderOffset) {
  return withReminder(async () => {
    const event = await events.create(fields)
    await setEventReminder(event, offset)
    return event
  })
}

export function updateEvent(
  id: string,
  patch: Partial<OwnFields<CalendarEvent>>,
  offset: EventReminderOffset,
) {
  return withReminder(async () => {
    const event = await events.update(id, patch)
    await setEventReminder(event, offset)
    return event
  })
}

/** Leaves out one occurrence of a series; `start` is its start date. */
export function skipOccurrence(id: string, start: string) {
  return withReminder(async () => {
    const current = await events.get(id)
    if (!current) {
      return
    }
    const exdates = [...new Set([...(current.exdates ?? []), start])].sort()
    await refreshEventReminder(await events.update(id, { exdates }))
  })
}

/** Deleting and restoring (by undo or from the trash), with the reminder following. */
export const removableEvents = {
  softDelete: (id: string) =>
    withReminder(async () => {
      await events.softDelete(id)
      await dismissEventReminder(id)
    }),
  restore: (id: string) =>
    withReminder(async () => {
      await events.restore(id)
      const event = await events.get(id)
      if (event) {
        await refreshEventReminder(event)
      }
    }),
  purge: (id: string) => events.purge(id),
}
