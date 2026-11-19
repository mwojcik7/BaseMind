import { describe, expect, it } from 'vitest'
import { moveRule, occurrencesBefore, splitRule } from '@/modules/calendar/series-edit'
import { occurrenceStarts } from '@/modules/calendar/series'

describe('cutting a series', () => {
  it('counts the occurrences before a date, skipped ones too', () => {
    expect(occurrencesBefore('FREQ=WEEKLY;BYDAY=TU;COUNT=10', '2026-11-03', '2026-11-24')).toBe(3)
    expect(occurrencesBefore('FREQ=DAILY', '2026-11-03', '2026-11-03')).toBe(0)
  })

  it('ends the first part the day before and starts the rest there', () => {
    expect(splitRule('FREQ=WEEKLY;BYDAY=TU', '2026-11-03', '2026-11-24')).toEqual({
      before: 'FREQ=WEEKLY;BYDAY=TU;UNTIL=20261123',
      after: 'FREQ=WEEKLY;BYDAY=TU',
    })
  })

  it('leaves the rest of a count to the new part', () => {
    expect(splitRule('FREQ=WEEKLY;BYDAY=TU;COUNT=10', '2026-11-03', '2026-11-24')).toEqual({
      before: 'FREQ=WEEKLY;BYDAY=TU;UNTIL=20261123',
      after: 'FREQ=WEEKLY;BYDAY=TU;COUNT=7',
    })
  })

  it('keeps the end date for the new part', () => {
    expect(splitRule('FREQ=DAILY;UNTIL=20261231', '2026-11-01', '2026-11-10').after).toBe(
      'FREQ=DAILY;UNTIL=20261231',
    )
  })

  it('gives both parts together the occurrences of the whole', () => {
    const whole = { start_date: '2026-11-03', end_date: '2026-11-03', exdates: null }
    const rrule = 'FREQ=WEEKLY;BYDAY=TU;COUNT=10'
    const { before, after } = splitRule(rrule, whole.start_date, '2026-11-24')
    const all = (event: typeof whole & { rrule: string }) =>
      occurrenceStarts(event, '2026-01-01', '2027-12-31')

    expect([
      ...all({ ...whole, rrule: before }),
      ...all({ ...whole, start_date: '2026-11-24', end_date: '2026-11-24', rrule: after }),
    ]).toEqual(all({ ...whole, rrule }))
  })
})

describe('moving a series', () => {
  it.each([
    [
      'weekly days move along',
      'FREQ=WEEKLY;BYDAY=TU,TH',
      '2026-11-03',
      '2026-11-04',
      'FREQ=WEEKLY;BYDAY=WE,FR',
    ],
    [
      'back over the week start',
      'FREQ=WEEKLY;BYDAY=MO',
      '2026-11-02',
      '2026-11-01',
      'FREQ=WEEKLY;BYDAY=SU',
    ],
    [
      'the day of the month follows',
      'FREQ=MONTHLY;BYMONTHDAY=10',
      '2026-11-10',
      '2026-11-12',
      'FREQ=MONTHLY;BYMONTHDAY=12',
    ],
    [
      'the nth weekday follows',
      'FREQ=MONTHLY;BYDAY=2TU',
      '2026-11-10',
      '2026-11-19',
      'FREQ=MONTHLY;BYDAY=3TH',
    ],
    [
      'the last weekday stays the last',
      'FREQ=MONTHLY;BYDAY=-1FR',
      '2026-11-27',
      '2026-11-26',
      'FREQ=MONTHLY;BYDAY=-1TH',
    ],
    [
      'the yearly date follows',
      'FREQ=YEARLY;BYMONTH=11;BYMONTHDAY=20',
      '2026-11-20',
      '2026-12-01',
      'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=1',
    ],
    [
      'a count and an end stay',
      'FREQ=WEEKLY;BYDAY=TU;UNTIL=20261231;COUNT=5',
      '2026-11-03',
      '2026-11-04',
      'FREQ=WEEKLY;BYDAY=WE;UNTIL=20261231;COUNT=5',
    ],
    [
      'a daily rule needs nothing',
      'FREQ=DAILY;INTERVAL=2',
      '2026-11-03',
      '2026-11-05',
      'FREQ=DAILY;INTERVAL=2',
    ],
    [
      'a day chosen by hand stays',
      'FREQ=MONTHLY;BYMONTHDAY=1',
      '2026-11-10',
      '2026-11-12',
      'FREQ=MONTHLY;BYMONTHDAY=1',
    ],
    [
      'not moved at all',
      'FREQ=WEEKLY;BYDAY=TU',
      '2026-11-03',
      '2026-11-03',
      'FREQ=WEEKLY;BYDAY=TU',
    ],
  ])('%s', (_name, rrule, from, to, moved) => {
    expect(moveRule(rrule, from, to)).toBe(moved)
  })
})
