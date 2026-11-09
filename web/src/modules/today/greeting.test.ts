import { describe, expect, it } from 'vitest'
import { pl } from '@/i18n/pl'
import { greeting } from '@/modules/today/greeting'

const at = (hour: number, minute = 0) => new Date(2026, 10, 9, hour, minute)

describe('greeting', () => {
  it.each([
    [at(4, 59), pl.today.evening],
    [at(5), pl.today.day],
    [at(17, 59), pl.today.day],
    [at(18), pl.today.evening],
    [at(23, 30), pl.today.evening],
  ])('picks the text for %s', (now, expected) => {
    expect(greeting(now)).toBe(expected)
  })

  it('adds the name', () => {
    expect(greeting(at(9), 'Marcin')).toBe(`${pl.today.day}, Marcin`)
  })

  it.each(['', '   ', undefined])('leaves out an empty name (%j)', (name) => {
    expect(greeting(at(9), name)).toBe(pl.today.day)
  })
})
