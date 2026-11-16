import { describe, expect, it } from 'vitest'
import { easterSunday, holidayOn, holidaysIn } from '@/modules/calendar/holidays'

describe('Polish public holidays', () => {
  it('finds Easter', () => {
    expect(easterSunday(2024)).toEqual(new Date(2024, 2, 31))
    expect(easterSunday(2026)).toEqual(new Date(2026, 3, 5))
    expect(easterSunday(2027)).toEqual(new Date(2027, 2, 28))
  })

  it('moves the feasts that follow Easter with it', () => {
    expect(holidayOn('2026-04-06')).toBe('Poniedziałek Wielkanocny')
    expect(holidayOn('2026-05-24')).toBe('Zielone Świątki')
    expect(holidayOn('2026-06-04')).toBe('Boże Ciało')
  })

  it('has Christmas Eve off only since 2025', () => {
    expect(holidayOn('2024-12-24')).toBeUndefined()
    expect(holidayOn('2025-12-24')).toBe('Wigilia')
    expect(holidaysIn(2024).size).toBe(13)
    expect(holidaysIn(2026).size).toBe(14)
  })

  it('knows an ordinary day is not one', () => {
    expect(holidayOn('2026-11-16')).toBeUndefined()
    expect(holidayOn('2026-11-11')).toBe('Święto Niepodległości')
  })
})
