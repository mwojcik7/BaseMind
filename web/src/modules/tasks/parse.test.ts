import { describe, expect, it } from 'vitest'
import { parseQuickText } from '@/lib/quick-parser'
import { taskRules } from '@/modules/tasks/parse'

// A Monday.
const now = new Date(2026, 10, 9, 12)
const parse = (text: string, at = now) => parseQuickText(text, taskRules, { now: at })

describe('task rules', () => {
  it.each([
    ['mleko dziś', '2026-11-09'],
    ['mleko dzis', '2026-11-09'],
    ['mleko dzisiaj', '2026-11-09'],
    ['mleko jutro', '2026-11-10'],
    ['mleko w środę', '2026-11-11'],
    ['mleko we wtorek', '2026-11-10'],
    ['mleko w srode', '2026-11-11'],
    ['mleko w piątek', '2026-11-13'],
    ['mleko w piatek', '2026-11-13'],
    ['mleko w niedzielę', '2026-11-15'],
  ])('reads the date in "%s"', (text, date) => {
    expect(parse(text)).toEqual({ text: 'mleko', fields: { due_date: date } })
  })

  it('means next week when the weekday is today', () => {
    expect(parse('w poniedziałek').fields.due_date).toBe('2026-11-16')
  })

  it.each([1, 2, 3, 4])('reads priority !%i', (priority) => {
    expect(parse(`mleko !${priority}`)).toEqual({ text: 'mleko', fields: { priority } })
  })

  it('ignores an exclamation mark that is not a priority', () => {
    expect(parse('mleko !5').fields).toEqual({})
    expect(parse('super!1').fields).toEqual({})
  })

  it('reads a date and a priority together', () => {
    expect(parse('!1 kupić jutro mleko')).toEqual({
      text: 'kupić mleko',
      fields: { due_date: '2026-11-10', priority: 1 },
    })
  })

  it('leaves words that only contain a date alone', () => {
    expect(parse('dzisiejsza gazeta').fields).toEqual({})
  })
})
