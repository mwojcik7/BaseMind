import { db } from '@/db/db'
import { createRepository, type OwnFields, type SyncedRecord } from '@/db/repository'
import type { ReminderChoice } from '@/lib/reminder-moment'
import {
  dismissEventReminders,
  refreshEventReminders,
  setEventReminders,
} from '@/modules/calendar/reminder'

/** Palette names; the server accepts the same list (App\Models\Event::COLORS). */
export const EVENT_COLORS = [
  'blue',
  'cyan',
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'gray',
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
  /**
   * An occurrence changed on its own: the series it belongs to, and the start date of the
   * occurrence it stands in for (the series skips that date).
   */
  series_id?: string | null
  series_date?: string | null
  /** Went to the trash together with its series, and comes back with it. */
  deleted_with_series?: boolean
}

export const events = createRepository<CalendarEvent>('events')

export const isAllDay = (event: Pick<CalendarEvent, 'start_time'>) => event.start_time === null

// Everything below changes an event and its reminder together, or neither.
export function withReminder<T>(work: () => Promise<T>) {
  return db.transaction('rw', db.table('events'), db.table('reminders'), db.outbox, work)
}

/** Deleted ones too, which the trash and undo need. */
export function anyEvent(id: string) {
  return db.table<CalendarEvent, string>('events').get(id)
}

/** Occurrences of the series changed on their own, deleted ones too. */
export function changedOccurrences(seriesId: string) {
  return db.table<CalendarEvent, string>('events').where('series_id').equals(seriesId).toArray()
}

async function restoreOne(id: string) {
  await events.restore(id)
  let event = await events.get(id)
  if (event?.deleted_with_series) {
    event = await events.update(id, { deleted_with_series: false })
  }
  if (event) {
    await refreshEventReminders(event)
  }
}

export function createEvent(fields: OwnFields<CalendarEvent>, offsets: readonly ReminderChoice[]) {
  return withReminder(async () => {
    const event = await events.create(fields)
    await setEventReminders(event, offsets)
    return event
  })
}

export function updateEvent(
  id: string,
  patch: Partial<OwnFields<CalendarEvent>>,
  offsets: readonly ReminderChoice[],
) {
  return withReminder(async () => {
    const event = await events.update(id, patch)
    await setEventReminders(event, offsets)
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
    await refreshEventReminders(await events.update(id, { exdates }))
  })
}

/** Brings a skipped occurrence back (the undo of `skipOccurrence`). */
export function unskipOccurrence(id: string, start: string) {
  return withReminder(async () => {
    const current = await events.get(id)
    if (!current) {
      return
    }
    const exdates = (current.exdates ?? []).filter((date) => date !== start)
    await refreshEventReminders(
      await events.update(id, { exdates: exdates.length ? exdates : null }),
    )
  })
}

/**
 * Deleting and restoring (by undo or from the trash), with reminders following. A series
 * takes its changed occurrences along, and brings back just those when restored.
 */
export const removableEvents = {
  softDelete: (id: string) =>
    withReminder(async () => {
      for (const occurrence of await changedOccurrences(id)) {
        if (occurrence.deleted_at === null) {
          await events.update(occurrence.id, { deleted_with_series: true })
          await events.softDelete(occurrence.id)
          await dismissEventReminders(occurrence.id)
        }
      }
      await events.softDelete(id)
      await dismissEventReminders(id)
    }),
  restore: (id: string) =>
    withReminder(async () => {
      await restoreOne(id)
      for (const occurrence of await changedOccurrences(id)) {
        if (occurrence.deleted_at !== null && occurrence.deleted_with_series) {
          await restoreOne(occurrence.id)
        }
      }
    }),
  /**
   * Removes it for good, with its changed occurrences in the trash; one brought back on
   * its own stays as a plain event (the server does the same).
   */
  purge: (id: string) =>
    withReminder(async () => {
      for (const occurrence of await changedOccurrences(id)) {
        if (occurrence.deleted_at !== null) {
          await events.purge(occurrence.id)
        } else {
          await events.update(occurrence.id, { series_id: null, series_date: null })
        }
      }
      await events.purge(id)
    }),
}
