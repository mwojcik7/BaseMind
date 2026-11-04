import { describe, expect, it } from 'vitest'
import { formatAmount, formatMoney, parseAmount } from '@/lib/money'

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12.50', 1250],
    ['12,', 1200],
    ['0,07', 7],
    ['1 234,56', 123456],
    ['1 234,56', 123456],
    // The classic float traps.
    ['19,99', 1999],
    ['1,15', 115],
    ['4,35', 435],
  ])('parses %s', (text, minor) => {
    expect(parseAmount(text)).toBe(minor)
  })

  it.each(['', ',50', 'abc', '12,345', '-5', '1,2,3', '99999999999999999999'])(
    'rejects %j',
    (text) => {
      expect(parseAmount(text)).toBeNull()
    },
  )
})

describe('formatting', () => {
  it('formats a field value that parses back to the same amount', () => {
    for (const minor of [0, 7, 70, 1999, 123456]) {
      expect(parseAmount(formatAmount(minor))).toBe(minor)
    }
    expect(formatAmount(7)).toBe('0,07')
    expect(formatAmount(123456)).toBe('1234,56')
  })

  it('formats money for display', () => {
    const normalize = (text: string) => text.replace(/\s/g, ' ')

    expect(normalize(formatMoney(4599))).toBe('45,99 zł')
    expect(normalize(formatMoney(-4599))).toBe('-45,99 zł')
    expect(normalize(formatMoney(1234567))).toBe('12 345,67 zł')
    expect(normalize(formatMoney(1000, 'EUR'))).toBe('10,00 €')
  })
})
