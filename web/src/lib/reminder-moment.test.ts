import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { reminderMoment } from '@/lib/reminder-moment'
import cases from '@/lib/reminder-moment.cases.json'

// The server runs the same cases, so both sides remind at the same moment.
describe('reminder moment', () => {
  it.each(cases)('$name', ({ date, time, offset, moment }) => {
    expect(format(reminderMoment(date, time, offset), 'yyyy-MM-dd HH:mm')).toBe(moment)
  })
})
