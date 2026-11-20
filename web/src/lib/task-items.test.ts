import { describe, expect, it } from 'vitest'
import {
  hasOpenTaskItems,
  normalizeTaskItems,
  taskItem,
  taskLines,
  toggleTaskLine,
} from '@/lib/task-items'

// Written as codes: invisible in the source otherwise.
const NBSP = String.fromCharCode(0xa0)
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b)

describe('taskItem', () => {
  it.each([
    ['- [ ] mleko', false, 'mleko'],
    ['* [x] mleko', true, 'mleko'],
    ['[ ] mleko', false, 'mleko'],
    ['[X] mleko', true, 'mleko'],
    ['- [] mleko', false, 'mleko'],
    ['[] mleko', false, 'mleko'],
    ['-[ ] mleko', false, 'mleko'],
    ['– [ ] mleko', false, 'mleko'],
    ['—[x] mleko', true, 'mleko'],
    [`-${NBSP}[${NBSP}]${NBSP}mleko`, false, 'mleko'],
    ['- [ ]', false, ''],
    ['[ ]', false, ''],
    ['  - [ ] podpunkt', false, 'podpunkt'],
  ])('%s', (line, checked, text) => {
    expect(taskItem(line)).toMatchObject({ checked, text })
  })

  it.each([
    ['[link](https://example.com)'],
    ['[x](https://example.com)'],
    ['[ab] tekst'],
    ['tekst [ ] w środku'],
    ['- zwykły punkt'],
    ['[ ]tekst bez spacji'],
  ])('%s is not a box', (line) => {
    expect(taskItem(line)).toBeNull()
  })
})

describe('normalizeTaskItems', () => {
  it('writes boxes the standard way and keeps the lines in place', () => {
    const text = 'Zakupy\n[ ] mleko\n– [x] chleb\n- [ ]\nkoniec'

    expect(normalizeTaskItems(text)).toBe(
      `Zakupy\n- [ ] mleko\n- [x] chleb\n- [ ] ${ZERO_WIDTH_SPACE}\nkoniec`,
    )
  })

  it('leaves code blocks alone', () => {
    const text = '```\n[ ] w kodzie\n```\n[ ] poza'

    expect(taskLines(text)).toEqual([3])
    expect(normalizeTaskItems(text)).toBe('```\n[ ] w kodzie\n```\n- [ ] poza')
  })
})

describe('toggleTaskLine', () => {
  it('flips only the mark, keeping the line as typed', () => {
    const text = 'Zakupy\n[ ] mleko\n- [x] chleb'

    expect(toggleTaskLine(text, 2)).toBe('Zakupy\n[x] mleko\n- [x] chleb')
    expect(toggleTaskLine(text, 3)).toBe('Zakupy\n[ ] mleko\n- [ ] chleb')
    expect(toggleTaskLine('- [] x', 1)).toBe('- [x] x')
  })

  it('changes nothing on a line without a box', () => {
    expect(toggleTaskLine('Zakupy\n[ ] mleko', 1)).toBe('Zakupy\n[ ] mleko')
  })
})

describe('hasOpenTaskItems', () => {
  it('finds a box still to tick, in any spelling', () => {
    expect(hasOpenTaskItems('[ ] mleko')).toBe(true)
    expect(hasOpenTaskItems('[x] mleko\n- [X] chleb')).toBe(false)
    expect(hasOpenTaskItems('```\n[ ] w kodzie\n```')).toBe(false)
    expect(hasOpenTaskItems(null)).toBe(false)
  })
})
