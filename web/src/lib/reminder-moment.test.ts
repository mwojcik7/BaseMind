import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import {
  compareTimings,
  parseTimingKey,
  reminderMoment,
  timingKey,
  timingOf,
} from '@/lib/reminder-moment'
import cases from '@/lib/reminder-moment.cases.json'

// The server runs the same cases, so both sides remind at the same moment.
describe('reminder moment', () => {
  it.each(
    cases as {
      name: string
      date: string
      time: string | null
      offset: number
      at?: string
      moment: string
    }[],
  )('$name', ({ date, time, offset, at, moment }) => {
    expect(format(reminderMoment(date, time, offset, at ?? null), 'yyyy-MM-dd HH:mm')).toBe(moment)
  })
})

describe('reminder timing', () => {
  it('keeps 7:00 and times on partial days as no time of its own', () => {
    expect(timingOf({ offset: 1440, time: '07:00' })).toEqual({ offset: 1440, time: null })
    expect(timingOf({ offset: 90, time: '09:00' })).toEqual({ offset: 90, time: null })
    expect(timingOf(30)).toEqual({ offset: 30, time: null })
  })

  it('turns into a key and back', () => {
    expect(timingKey({ offset: 7200, time: '09:00' })).toBe('7200@09:00')
    expect(timingKey(1440)).toBe('1440')
    expect(parseTimingKey('7200@09:00')).toEqual({ offset: 7200, time: '09:00' })
    expect(parseTimingKey('15')).toEqual({ offset: 15, time: null })
  })

  it('sorts farthest ahead first', () => {
    const sorted = ['15', '1440', '1440@20:00', '2880', '0']
      .map(parseTimingKey)
      .sort(compareTimings)
    expect(sorted.map(timingKey)).toEqual(['2880', '1440', '1440@20:00', '15', '0'])
  })
})
