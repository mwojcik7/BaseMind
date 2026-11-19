import { describe, expect, it } from 'vitest'
import {
  copyOf,
  copyTitle,
  defaultSpan,
  endsAfterStart,
  moveStart,
  repeatOf,
  rruleOf,
} from '@/modules/calendar/form'

const span = {
  start_date: '2026-11-20',
  start_time: '18:00',
  end_date: '2026-11-20',
  end_time: '19:30',
}

describe('event form', () => {
  it('starts a new event at the next full hour, for an hour', () => {
    expect(defaultSpan(new Date(2026, 10, 15, 14, 20))).toEqual({
      start_date: '2026-11-15',
      start_time: '15:00',
      end_date: '2026-11-15',
      end_time: '16:00',
    })
  })

  it('crosses midnight late in the evening', () => {
    expect(defaultSpan(new Date(2026, 10, 15, 23, 10))).toMatchObject({
      start_date: '2026-11-16',
      start_time: '00:00',
      end_time: '01:00',
    })
  })

  it('uses the chosen day', () => {
    expect(defaultSpan(new Date(2026, 10, 15, 14, 20), '2026-11-20')).toMatchObject({
      start_date: '2026-11-20',
      start_time: '15:00',
      end_date: '2026-11-20',
    })
  })

  it('moves the end with the start, keeping the length', () => {
    expect(moveStart(span, { date: '2026-11-21', time: '23:00' }, false)).toEqual({
      start_date: '2026-11-21',
      start_time: '23:00',
      end_date: '2026-11-22',
      end_time: '00:30',
    })
  })

  it('keeps the number of days of an all-day event', () => {
    const trip = { ...span, end_date: '2026-11-22' }

    expect(moveStart(trip, { date: '2026-12-04', time: '' }, true)).toMatchObject({
      start_date: '2026-12-04',
      end_date: '2026-12-06',
    })
  })

  it('refuses an end before the start', () => {
    expect(endsAfterStart(span, false)).toBe(true)
    expect(endsAfterStart({ ...span, end_time: '17:00' }, false)).toBe(false)
    expect(endsAfterStart({ ...span, end_date: '2026-11-19' }, true)).toBe(false)
    expect(endsAfterStart({ ...span, end_time: '17:00' }, true)).toBe(true)
  })

  it('moves the count between the rule and the editor', () => {
    expect(repeatOf('FREQ=WEEKLY;BYDAY=TU;COUNT=10')).toEqual({
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      repeat_from: 'due',
      repeat_remaining: 10,
    })
    expect(rruleOf(repeatOf('FREQ=WEEKLY;BYDAY=TU;COUNT=10'))).toBe('FREQ=WEEKLY;BYDAY=TU;COUNT=10')
    expect(rruleOf(repeatOf('FREQ=DAILY;UNTIL=20261231'))).toBe('FREQ=DAILY;UNTIL=20261231')
    expect(rruleOf(repeatOf(null))).toBeNull()
  })
})

describe('a duplicate', () => {
  it('is marked as a copy, within the title limit', () => {
    expect(copyTitle('Basen ')).toBe('Basen (kopia)')
    expect(copyTitle('a'.repeat(500))).toHaveLength(500)
    expect(copyTitle('a'.repeat(500)).endsWith(' (kopia)')).toBe(true)
  })

  it('keeps what the form shows, but not the repeat', () => {
    const values = {
      title: 'Basen',
      start_date: '2026-11-24',
      reminders: ['1440', '60'],
      repeat: { rrule: 'FREQ=WEEKLY;BYDAY=TU', repeat_from: 'due' as const, repeat_remaining: 5 },
    }

    expect(copyOf(values)).toEqual({
      title: 'Basen (kopia)',
      start_date: '2026-11-24',
      reminders: ['1440', '60'],
      repeat: { rrule: null, repeat_from: 'due', repeat_remaining: null },
    })
  })
})
