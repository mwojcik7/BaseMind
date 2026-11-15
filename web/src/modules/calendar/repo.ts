import { createRepository, type SyncedRecord } from '@/db/repository'

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
