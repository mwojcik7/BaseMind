import { addDays, format } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { reminders } from '@/db/reminders'
import { useAuth, type Account } from '@/lib/auth'
import { findEventReminder } from '@/modules/calendar/reminder'
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

function fields(overrides: Partial<CalendarEvent> = {}) {
  return {
    title: 'Dentysta',
    location: null,
    description: null,
    start_date: day(3),
    start_time: '18:00',
    end_date: day(3),
    end_time: '19:00',
    rrule: null,
    exdates: null,
    color: null,
    ...overrides,
  }
}

describe('event reminders', () => {
  beforeEach(() => useAuth.setState({ status: 'authenticated', account: ACCOUNT }))

  it('is created with the event, a day before in the morning', async () => {
    const event = await createEvent(fields(), 1440)

    expect(await findEventReminder(event.id)).toMatchObject({
      entity_type: 'events',
      entity_id: event.id,
      title: 'Dentysta',
      offset_minutes: 1440,
      rrule: null,
      status: 'scheduled',
      remind_at: at(day(2), '07:00'),
    })
  })

  it('is not created when not chosen', async () => {
    await createEvent(fields(), null)

    expect(await reminders.list()).toHaveLength(0)
  })

  it('follows a change of date and can be turned off', async () => {
    const event = await createEvent(fields(), 60)
    await updateEvent(event.id, { start_date: day(5), end_date: day(5) }, 60)

    expect((await findEventReminder(event.id))?.remind_at).toBe(at(day(5), '17:00'))

    await updateEvent(event.id, {}, null)
    expect(await findEventReminder(event.id)).toBeUndefined()
  })

  it('points at the next occurrence of a series, skipping a left-out one', async () => {
    const event = await createEvent(
      fields({ start_date: day(1), end_date: day(1), rrule: 'FREQ=DAILY' }),
      0,
    )
    expect((await findEventReminder(event.id))?.remind_at).toBe(at(day(1), '18:00'))

    await skipOccurrence(event.id, day(1))

    expect((await findEventReminder(event.id))?.remind_at).toBe(at(day(2), '18:00'))
  })

  it('remembers the choice for an event already over', async () => {
    const event = await createEvent(fields({ start_date: day(-2), end_date: day(-2) }), 60)

    expect(await findEventReminder(event.id)).toMatchObject({ status: 'dismissed' })
  })

  it('goes quiet with the deleted event and comes back with it', async () => {
    const event = await createEvent(fields(), 1440)
    await removableEvents.softDelete(event.id)

    expect(await findEventReminder(event.id)).toMatchObject({ status: 'dismissed' })

    await removableEvents.restore(event.id)
    expect(await findEventReminder(event.id)).toMatchObject({ status: 'scheduled' })
  })
})
