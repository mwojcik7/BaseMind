import { addDays, format } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { reminders } from '@/db/reminders'
import { useAuth, type Account } from '@/lib/auth'
import { findEventReminders, offsetsAfterSwitch } from '@/modules/calendar/reminder'
import {
  createEvent,
  removableEvents,
  skipOccurrence,
  updateEvent,
  type CalendarEvent,
} from '@/modules/calendar/repo'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

const day = (days: number) => format(addDays(new Date(), days), 'yyyy-MM-dd')
const at = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString()
const moments = async (eventId: string) =>
  (await findEventReminders(eventId)).map((reminder) => reminder.remind_at)

function fields(overrides: Partial<CalendarEvent> = {}) {
  return {
    title: 'Dentysta',
    location: null,
    description: null,
    start_date: day(10),
    start_time: '18:00',
    end_date: day(10),
    end_time: '19:00',
    rrule: null,
    exdates: null,
    color: null,
    ...overrides,
  }
}

describe('event reminders', () => {
  beforeEach(() => useAuth.setState({ status: 'authenticated', account: ACCOUNT }))

  it('are created with the event, each linked to it', async () => {
    const event = await createEvent(fields(), [1440, 60])

    expect(await findEventReminders(event.id)).toMatchObject([
      { entity_type: 'events', entity_id: event.id, offset_minutes: 1440, rrule: null },
      { entity_type: 'events', entity_id: event.id, offset_minutes: 60, status: 'scheduled' },
    ])
    expect(await moments(event.id)).toEqual([at(day(9), '07:00'), at(day(10), '17:00')])
  })

  it('reach weeks ahead for an all-day event', async () => {
    const event = await createEvent(
      fields({ start_time: null, end_time: null }),
      [43200, 10080, 4320, 2880],
    )

    expect((await moments(event.id)).slice(1)).toEqual([
      at(day(3), '07:00'),
      at(day(7), '07:00'),
      at(day(8), '07:00'),
    ])
    // A month ahead of an event ten days away has passed: remembered, but not sent.
    expect(await findEventReminders(event.id)).toMatchObject([
      { offset_minutes: 43200, status: 'dismissed' },
      { status: 'scheduled' },
      { status: 'scheduled' },
      { status: 'scheduled' },
    ])
  })

  it('are none when none are chosen', async () => {
    await createEvent(fields(), [])

    expect(await reminders.list()).toHaveLength(0)
  })

  it('follow a change of date, and the list can change', async () => {
    const event = await createEvent(fields(), [60, 1440])
    const [dayBefore] = await findEventReminders(event.id)

    await updateEvent(event.id, { start_date: day(12), end_date: day(12) }, [1440, 15])

    const after = await findEventReminders(event.id)
    expect(after.map((reminder) => reminder.offset_minutes)).toEqual([1440, 15])
    // The one kept is the same record, moved.
    expect(after[0]).toMatchObject({ id: dayBefore.id, remind_at: at(day(11), '07:00') })
  })

  it('point at the next occurrence of a series, skipping a left-out one', async () => {
    const event = await createEvent(
      fields({ start_date: day(1), end_date: day(1), rrule: 'FREQ=DAILY' }),
      [0],
    )
    expect(await moments(event.id)).toEqual([at(day(1), '18:00')])

    await skipOccurrence(event.id, day(1))

    expect(await moments(event.id)).toEqual([at(day(2), '18:00')])
  })

  it('go quiet with the deleted event and come back with it', async () => {
    const event = await createEvent(fields(), [1440, 60])
    await removableEvents.softDelete(event.id)

    const statuses = async () =>
      (await findEventReminders(event.id)).map((reminder) => reminder.status)
    expect(await statuses()).toEqual(['dismissed', 'dismissed'])

    await removableEvents.restore(event.id)
    expect(await statuses()).toEqual(['scheduled', 'scheduled'])
  })

  it('keep what the other kind of event offers when switching', () => {
    expect(offsetsAfterSwitch([60, 1440], true)).toEqual([1440])
    expect(offsetsAfterSwitch([10080, 0], false)).toEqual([0])
    expect(offsetsAfterSwitch([10080], false)).toEqual([1440])
    expect(offsetsAfterSwitch([], true)).toEqual([])
  })
})
