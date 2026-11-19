import type { OwnFields } from '@/db/repository'
import type { ReminderChoice } from '@/lib/reminder-moment'
import {
  dismissEventReminders,
  refreshEventReminders,
  setEventReminders,
} from '@/modules/calendar/reminder'
import {
  anyEvent,
  changedOccurrences,
  events as repo,
  removableEvents,
  skipOccurrence,
  unskipOccurrence,
  updateEvent,
  withReminder,
  type CalendarEvent,
} from '@/modules/calendar/repo'
import { daysBetween, moveRule, shiftDate, splitRule } from '@/modules/calendar/series-edit'

/**
 * Changing or deleting part of a series: one occurrence ("this"), it and the ones after
 * ("following"), or all of them ("all"). One changed on its own becomes a separate event
 * pointing at its series; the series skips its date.
 */
export type SeriesScope = 'this' | 'following' | 'all'

export type EventFields = OwnFields<CalendarEvent>

export type Undo = () => Promise<void>

/** What undo puts back: everything the form and the series operations change. */
const KEPT = [
  'title',
  'location',
  'description',
  'start_date',
  'start_time',
  'end_date',
  'end_time',
  'rrule',
  'exdates',
  'color',
  'series_id',
  'series_date',
  'deleted_with_series',
] as const

/**
 * Puts the events back as they were in `before` and removes the ones `created` since.
 * Reminders follow: those of created events go with them, the rest point at the next
 * occurrence again.
 */
function undoTo(before: readonly CalendarEvent[], created: readonly string[]): Undo {
  return () =>
    withReminder(async () => {
      // Links back to the old series first: removing a series unlinks what still points at it.
      for (const record of before) {
        const now = await anyEvent(record.id)
        if (!now || record.deleted_at !== null) {
          continue
        }
        if (now.deleted_at !== null) {
          await repo.restore(record.id)
        }
        const fields = Object.fromEntries(KEPT.map((field) => [field, record[field] ?? null]))
        await refreshEventReminders(await repo.update(record.id, fields))
      }
      for (const id of created) {
        await dismissEventReminders(id)
        await repo.softDelete(id)
        await repo.purge(id)
      }
    })
}

const withDate = (exdates: readonly string[] | null | undefined, date: string) =>
  [...new Set([...(exdates ?? []), date])].sort()

const orNull = (dates: readonly string[]) => (dates.length > 0 ? [...dates] : null)

/** The occurrence on `date` alone: a separate event in its place. */
async function changeThis(
  series: CalendarEvent,
  date: string,
  fields: EventFields,
  reminders: readonly ReminderChoice[],
) {
  return withReminder(async () => {
    await refreshEventReminders(
      await repo.update(series.id, { exdates: withDate(series.exdates, date) }),
    )
    const event = await repo.create({
      ...fields,
      rrule: null,
      exdates: null,
      series_id: series.id,
      series_date: date,
      deleted_with_series: false,
    })
    await setEventReminders(event, reminders)
    return { event, undo: undoTo([series], [event.id]) }
  })
}

/**
 * The whole series, with the form showing the occurrence on `date` (or the series' start).
 * A new date moves the series by as many days, with its skipped dates and the changed
 * occurrences' places; the rule follows unless it was changed by hand.
 */
async function changeAll(
  series: CalendarEvent,
  date: string,
  fields: EventFields,
  reminders: readonly ReminderChoice[],
) {
  const moved = daysBetween(date, fields.start_date)
  const start = shiftDate(series.start_date, moved)
  const end = shiftDate(start, daysBetween(fields.start_date, fields.end_date))
  const sameRule = fields.rrule === series.rrule
  const rrule =
    sameRule && fields.rrule ? moveRule(fields.rrule, series.start_date, start) : fields.rrule
  const occurrences = (await changedOccurrences(series.id)).filter(
    (occurrence) => occurrence.deleted_at === null && occurrence.series_date,
  )

  return withReminder(async () => {
    const event = await updateEvent(
      series.id,
      {
        ...fields,
        start_date: start,
        end_date: end,
        rrule,
        exdates: rrule ? orNull((series.exdates ?? []).map((day) => shiftDate(day, moved))) : null,
      },
      reminders,
    )
    if (moved !== 0) {
      for (const occurrence of occurrences) {
        await repo.update(occurrence.id, {
          series_date: shiftDate(occurrence.series_date!, moved),
        })
      }
    }
    return { event, undo: null }
  })
}

/**
 * The occurrence on `date` and the ones after: the series ends the day before, and a new
 * one takes over from there with the rest of the count, its skipped dates and changed
 * occurrences.
 */
async function changeFollowing(
  series: CalendarEvent,
  date: string,
  fields: EventFields,
  reminders: readonly ReminderChoice[],
) {
  if (!series.rrule || date <= series.start_date) {
    return changeAll(series, date, fields, reminders)
  }

  const moved = daysBetween(date, fields.start_date)
  const { before, after } = splitRule(series.rrule, series.start_date, date)
  const rrule =
    fields.rrule === series.rrule ? moveRule(after, date, fields.start_date) : fields.rrule
  const skipped = series.exdates ?? []
  const occurrences = (await changedOccurrences(series.id)).filter(
    (occurrence) =>
      occurrence.deleted_at === null && occurrence.series_date && occurrence.series_date >= date,
  )

  return withReminder(async () => {
    await refreshEventReminders(
      await repo.update(series.id, {
        rrule: before,
        exdates: orNull(skipped.filter((day) => day < date)),
      }),
    )
    const event = await repo.create({
      ...fields,
      rrule,
      exdates: rrule
        ? orNull(skipped.filter((day) => day >= date).map((day) => shiftDate(day, moved)))
        : null,
      series_id: null,
      series_date: null,
      deleted_with_series: false,
    })
    await setEventReminders(event, reminders)
    for (const occurrence of occurrences) {
      await repo.update(occurrence.id, {
        series_id: event.id,
        series_date: shiftDate(occurrence.series_date!, moved),
      })
    }
    return { event, undo: undoTo([series, ...occurrences], [event.id]) }
  })
}

/**
 * Saves the form of a series opened at the occurrence on `date` (or its start, when
 * opened without one). Gives back a way to undo, except for the whole series, which
 * saves as any event does.
 */
export function saveSeries(
  scope: SeriesScope,
  series: CalendarEvent,
  date: string,
  fields: EventFields,
  reminders: readonly ReminderChoice[],
): Promise<{ event: CalendarEvent; undo: Undo | null }> {
  switch (scope) {
    case 'this':
      return changeThis(series, date, fields, reminders)
    case 'following':
      return changeFollowing(series, date, fields, reminders)
    case 'all':
      return changeAll(series, date, fields, reminders)
  }
}

/** Ends the series the day before `date`; the changed occurrences from then on go too. */
async function deleteFollowing(series: CalendarEvent, date: string): Promise<Undo> {
  const occurrences = (await changedOccurrences(series.id)).filter(
    (occurrence) =>
      occurrence.deleted_at === null && occurrence.series_date && occurrence.series_date >= date,
  )

  return withReminder(async () => {
    await refreshEventReminders(
      await repo.update(series.id, {
        rrule: splitRule(series.rrule!, series.start_date, date).before,
        exdates: orNull((series.exdates ?? []).filter((day) => day < date)),
      }),
    )
    for (const occurrence of occurrences) {
      await dismissEventReminders(occurrence.id)
      await repo.softDelete(occurrence.id)
    }
    return undoTo([series, ...occurrences], [])
  })
}

/** Deletes part of the series opened at the occurrence on `date`; gives back the undo. */
export async function deleteSeries(
  scope: SeriesScope,
  series: CalendarEvent,
  date: string,
): Promise<Undo> {
  if (scope === 'this') {
    await skipOccurrence(series.id, date)
    return () => unskipOccurrence(series.id, date)
  }
  if (scope === 'following' && series.rrule && date > series.start_date) {
    return deleteFollowing(series, date)
  }
  await removableEvents.softDelete(series.id)
  return () => removableEvents.restore(series.id)
}
