import { describe, expect, it } from 'vitest'
import { parseQuickText, wordPattern, type ParserRule } from '@/lib/quick-parser'

interface Fields {
  day: string
  mark: number
}

const RULES: ParserRule<Fields>[] = [
  { pattern: wordPattern('dziś'), apply: () => ({ day: 'today' }) },
  { pattern: wordPattern('jutro'), apply: () => ({ day: 'tomorrow' }) },
  { pattern: /(?<!\S)#(\d)(?!\S)/, apply: (match) => ({ mark: Number(match[1]) }) },
]

const parse = (text: string) => parseQuickText(text, RULES, { now: new Date(2026, 10, 9) })

describe('parseQuickText', () => {
  it('leaves plain text alone', () => {
    expect(parse('kupić mleko')).toEqual({ text: 'kupić mleko', fields: {} })
  })

  it('takes out what it recognises and tidies the spaces', () => {
    expect(parse('kupić  jutro mleko #2')).toEqual({
      text: 'kupić mleko',
      fields: { day: 'tomorrow', mark: 2 },
    })
  })

  it('does not match inside longer words, also with Polish letters', () => {
    expect(parse('dziśniejsze pojutro')).toEqual({ text: 'dziśniejsze pojutro', fields: {} })
  })

  it('ignores letter case', () => {
    expect(parse('JUTRO mleko').fields).toEqual({ day: 'tomorrow' })
  })

  it('keeps a second value for the same field in the text', () => {
    expect(parse('dziś kupić jutro')).toEqual({ text: 'kupić jutro', fields: { day: 'today' } })
  })
})
