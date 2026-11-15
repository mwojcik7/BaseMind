import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import cases from '@/modules/calendar/series.cases.json'
import { nextReminderAt, occurrenceStarts } from '@/modules/calendar/series'

// The server runs the same cases (EventSeriesTest), so both sides agree.
describe('event occurrences', () => {
  it.each(cases.occurrences)('$name', ({ event, from, to, starts }) => {
    expect(occurrenceStarts(event, from, to)).toEqual(starts)
  })
})

describe('next event reminder', () => {
  it.each(cases.reminders)('$name', ({ event, offset, after, next }) => {
    const moment = nextReminderAt(event, offset, new Date(after.replace(' ', 'T')))

    expect(moment && format(moment, 'yyyy-MM-dd HH:mm')).toBe(next)
  })
})
