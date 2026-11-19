import { beforeEach, describe, expect, it } from 'vitest'
import { useAuth, type Account } from '@/lib/auth'
import { deleteSeries, saveSeries, type EventFields } from '@/modules/calendar/occurrence'
import { findEventReminders } from '@/modules/calendar/reminder'
import {
  anyEvent,
  createEvent,
  events,
  removableEvents,
  type CalendarEvent,
} from '@/modules/calendar/repo'
import { occurrenceStarts } from '@/modules/calendar/series'
import { trashSources } from '@/modules/trashRegistry'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

// Tuesdays from 2027-01-05; far enough ahead for every reminder to be still to come.
const WEEKLY = 'FREQ=WEEKLY;BYDAY=TU'

function fields(overrides: Partial<EventFields> = {}): EventFields {
  return {
    title: 'Basen',
    location: null,
    description: null,
    start_date: '2027-01-05',
    start_time: '18:00',
    end_date: '2027-01-05',
    end_time: '19:00',
    rrule: WEEKLY,
    exdates: null,
    color: null,
    ...overrides,
  }
}

const on = (date: string, overrides: Partial<EventFields> = {}) =>
  fields({ start_date: date, end_date: date, ...overrides })

const starts = (event: CalendarEvent) => occurrenceStarts(event, '2027-01-01', '2027-03-31')

async function live(id: string) {
  const event = await events.get(id)
  if (!event) throw new Error(`event ${id} is gone`)
  return event
}

/** A weekly series with one occurrence (Jan 19) already changed on its own. */
async function seriesWithChange(rrule = WEEKLY) {
  const series = await createEvent(fields({ rrule }), [1440])
  const { event: changed } = await saveSeries(
    'this',
    series,
    '2027-01-19',
    on('2027-01-20', { title: 'Basen (środa)' }),
    [60],
  )
  return { series: await live(series.id), changed }
}

describe('changing one occurrence of a series', () => {
  beforeEach(() => useAuth.setState({ status: 'authenticated', account: ACCOUNT }))

  it('makes a separate event in its place, and undo takes it back', async () => {
    const series = await createEvent(fields(), [1440])

    const { event, undo } = await saveSeries('this', series, '2027-01-12', on('2027-01-13'), [60])

    expect(event).toMatchObject({
      start_date: '2027-01-13',
      rrule: null,
      exdates: null,
      series_id: series.id,
      series_date: '2027-01-12',
    })
    expect((await live(series.id)).exdates).toEqual(['2027-01-12'])
    expect(starts(await live(series.id))).not.toContain('2027-01-12')
    expect((await findEventReminders(event.id)).map((r) => r.offset_minutes)).toEqual([60])

    await undo!()

    expect(await events.get(event.id)).toBeUndefined()
    // Removed for good, not left in the trash.
    expect(await anyEvent(event.id)).toBeUndefined()
    expect((await live(series.id)).exdates).toBeNull()
  })

  it('splits the series at "this and following", with the rest of the count', async () => {
    const series = await createEvent(fields({ rrule: `${WEEKLY};COUNT=6` }), [1440])
    await saveSeries('this', series, '2027-01-26', on('2027-01-27'), [])
    const skipped = await live(series.id)
    await events.update(series.id, { exdates: ['2027-01-12', '2027-01-26'] })

    const { event, undo } = await saveSeries(
      'following',
      { ...skipped, exdates: ['2027-01-12', '2027-01-26'] },
      '2027-01-19',
      on('2027-01-19', { rrule: `${WEEKLY};COUNT=6`, title: 'Basen 2' }),
      [0],
    )

    const old = await live(series.id)
    expect(old).toMatchObject({ rrule: `${WEEKLY};UNTIL=20270118`, exdates: ['2027-01-12'] })
    expect(event).toMatchObject({
      title: 'Basen 2',
      start_date: '2027-01-19',
      rrule: `${WEEKLY};COUNT=4`,
      exdates: ['2027-01-26'],
    })
    expect(starts(old)).toEqual(['2027-01-05'])
    expect(starts(event)).toEqual(['2027-01-19', '2027-02-02', '2027-02-09'])
    // The occurrence changed earlier now belongs to the new series.
    const [moved] = (await events.list()).filter((e) => e.series_date === '2027-01-26')
    expect(moved.series_id).toBe(event.id)

    await undo!()

    expect(await live(series.id)).toMatchObject({
      rrule: `${WEEKLY};COUNT=6`,
      exdates: ['2027-01-12', '2027-01-26'],
    })
    expect((await live(moved.id)).series_id).toBe(series.id)
    expect(await anyEvent(event.id)).toBeUndefined()
  })

  it('moves the series with its date at "this and following"', async () => {
    const { series, changed } = await seriesWithChange()

    const { event } = await saveSeries('following', series, '2027-01-12', on('2027-01-14'), [])

    expect(event.rrule).toBe('FREQ=WEEKLY;BYDAY=TH')
    expect(starts(event).slice(0, 3)).toEqual(['2027-01-14', '2027-01-28', '2027-02-04'])
    expect(await live(changed.id)).toMatchObject({ series_id: event.id, series_date: '2027-01-21' })
  })

  it('treats "this and following" at the first occurrence as all of them', async () => {
    const series = await createEvent(fields(), [])

    const { event } = await saveSeries(
      'following',
      series,
      '2027-01-05',
      on('2027-01-05', { title: 'Pływanie' }),
      [],
    )

    expect(event.id).toBe(series.id)
    expect((await events.list()).map((e) => e.title)).toEqual(['Pływanie'])
  })

  it('moves the whole series by the days the occurrence moved, keeping changed ones', async () => {
    const { series, changed } = await seriesWithChange()
    await events.update(series.id, { exdates: ['2027-01-12', '2027-01-19'] })

    const { event, undo } = await saveSeries(
      'all',
      await live(series.id),
      '2027-01-26',
      on('2027-01-27', { start_time: '17:00' }),
      [1440],
    )

    expect(undo).toBeNull()
    expect(event).toMatchObject({
      start_date: '2027-01-06',
      end_date: '2027-01-06',
      start_time: '17:00',
      rrule: 'FREQ=WEEKLY;BYDAY=WE',
      exdates: ['2027-01-13', '2027-01-20'],
    })
    // Changed occurrences keep their changes and follow the series.
    expect(await live(changed.id)).toMatchObject({
      title: 'Basen (środa)',
      start_date: '2027-01-20',
      series_date: '2027-01-20',
    })
  })
})

describe('deleting part of a series', () => {
  beforeEach(() => useAuth.setState({ status: 'authenticated', account: ACCOUNT }))

  it('skips just the one occurrence, with undo', async () => {
    const series = await createEvent(fields(), [])

    const undo = await deleteSeries('this', series, '2027-01-12')
    expect((await live(series.id)).exdates).toEqual(['2027-01-12'])

    await undo()
    expect((await live(series.id)).exdates).toBeNull()
  })

  it('ends the series before the occurrence, with the changed ones after it', async () => {
    const { series, changed } = await seriesWithChange(`${WEEKLY};COUNT=8`)

    const undo = await deleteSeries('following', series, '2027-01-12')

    expect(await live(series.id)).toMatchObject({
      rrule: `${WEEKLY};UNTIL=20270111`,
      exdates: null,
    })
    expect(await events.get(changed.id)).toBeUndefined()
    expect((await findEventReminders(changed.id))[0].status).toBe('dismissed')

    await undo()

    expect(await live(series.id)).toMatchObject({
      rrule: `${WEEKLY};COUNT=8`,
      exdates: ['2027-01-19'],
    })
    expect((await findEventReminders(changed.id))[0].status).toBe('scheduled')
  })

  it('takes the changed occurrences along with the series, also into the trash', async () => {
    const { series, changed } = await seriesWithChange()

    const undo = await deleteSeries('all', series, '2027-01-12')

    expect(await events.list()).toEqual([])
    const trash = await trashSources.find((source) => source.id === 'events')!.entries()
    expect(trash.map((entry) => entry.id)).toEqual([series.id])

    await undo()

    expect((await events.list()).map((e) => e.id).sort()).toEqual([series.id, changed.id].sort())
    expect((await live(changed.id)).deleted_with_series).toBe(false)
  })

  it('removes the changed ones for good with the series; one brought back stays', async () => {
    const { series, changed } = await seriesWithChange()
    const { event: other } = await saveSeries('this', series, '2027-02-02', on('2027-02-02'), [])
    await removableEvents.softDelete(series.id)
    await removableEvents.restore(other.id)

    await removableEvents.purge(series.id)

    expect(await anyEvent(series.id)).toBeUndefined()
    expect(await anyEvent(changed.id)).toBeUndefined()
    expect(await live(other.id)).toMatchObject({ series_id: null, series_date: null })
  })
})
