import { describe, expect, it } from 'vitest'
import { parseQuickText } from '@/lib/quick-parser'
import { eventRules } from '@/modules/calendar/parse'
import { quickEventDraft } from '@/modules/calendar/quick-add'

// A Monday, 12:20.
const now = new Date(2026, 10, 9, 12, 20)
const parse = (text: string) => parseQuickText(text, eventRules, { now })
const draft = (text: string, picks = {}, day = '2026-11-09') =>
  quickEventDraft(parse(text).fields, picks, { now, day })

describe('event rules', () => {
  it.each([
    ['dentysta 10-12', '10:00', '12:00'],
    ['dentysta 9:30-11', '09:30', '11:00'],
    ['dentysta 9:30 – 11:15', '09:30', '11:15'],
    ['dentysta o 10-12', '10:00', '12:00'],
    ['dentysta od 10 do 12:30', '10:00', '12:30'],
    ['dentysta 6-8 wieczorem', '18:00', '20:00'],
  ])('reads the time range in "%s"', (text, time, end) => {
    expect(parse(text)).toEqual({ text: 'dentysta', fields: { time, end_time: end } })
  })

  it('leaves dates and hours that do not exist alone', () => {
    expect(parse('urlop 15.12-17.12').fields.time).toBeUndefined()
    expect(parse('pokój 12-25').fields).toEqual({})
  })

  it('reads the day, time, repeat and reminder as tasks do', () => {
    expect(parse('jutro 18:00 dentysta przypomnij godzinę przed')).toEqual({
      text: 'dentysta',
      fields: { date: '2026-11-10', time: '18:00', reminder_offset: 60 },
    })
    expect(parse('w piątek 10-12 przegląd auta')).toEqual({
      text: 'przegląd auta',
      fields: { date: '2026-11-13', time: '10:00', end_time: '12:00' },
    })
    expect(parse('co wtorek 18:00 basen').fields).toEqual({
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      time: '18:00',
    })
  })
})

describe('quick event draft', () => {
  it('lasts an hour from the time typed, with the usual reminder a day before', () => {
    expect(draft('jutro 18:00 dentysta')).toEqual({
      start_date: '2026-11-10',
      start_time: '18:00',
      end_date: '2026-11-10',
      end_time: '19:00',
      allDay: false,
      rrule: null,
      reminder: 1440,
    })
  })

  it('is all-day without a time, on the given day', () => {
    expect(draft('urodziny Ani', {}, '2026-11-20')).toMatchObject({
      start_date: '2026-11-20',
      end_date: '2026-11-20',
      allDay: true,
    })
  })

  it('ends the next day when the end comes before the start', () => {
    expect(draft('sylwester 22-1')).toMatchObject({
      start_date: '2026-11-09',
      end_date: '2026-11-10',
      end_time: '01:00',
    })
    expect(draft('pociąg 23:30')).toMatchObject({ end_date: '2026-11-10', end_time: '00:30' })
  })

  it('starts a series on its first occurrence and keeps the count in the rule', () => {
    expect(draft('basen co wtorek 18:00 5 razy')).toMatchObject({
      start_date: '2026-11-10',
      rrule: 'FREQ=WEEKLY;BYDAY=TU;COUNT=5',
    })
    expect(draft('spotkanie co tydzień').rrule).toBe('FREQ=WEEKLY;BYDAY=MO')
  })

  it('lets a pick win over the text, and a new start move the typed end', () => {
    expect(draft('kino 18-21', { start: '19:00' })).toMatchObject({
      start_time: '19:00',
      end_time: '20:00',
    })
    expect(draft('kino 18-21', { allDay: true })).toMatchObject({ allDay: true })
    expect(draft('kino 18-21', { reminder: null }).reminder).toBeNull()
    // Opened at 12:20, switched to timed: the next full hour, as on the event screen.
    expect(draft('urlop', { allDay: false })).toMatchObject({
      start_time: '13:00',
      end_time: '14:00',
    })
  })

  it('takes a typed reminder only when it suits the kind of event', () => {
    expect(draft('kino 18:00 przypomnij 30 min').reminder).toBe(30)
    expect(draft('urlop przypomnij 30 min').reminder).toBe(1440)
    expect(draft('urlop przypomnij').reminder).toBe(0)
  })
})
