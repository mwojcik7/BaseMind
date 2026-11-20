import { describe, expect, it } from 'vitest'
import { pl } from '@/i18n/pl'
import type { Note } from '@/modules/notes/repo'
import {
  cardLines,
  changedLabel,
  filterNotes,
  hasOpenItems,
  isEmptyNote,
  isFiltering,
  NO_FILTER,
  noteHeading,
  notesInFolder,
  plainLine,
  sortNotes,
} from '@/modules/notes/selectors'

let counter = 0
function note(fields: Partial<Note> = {}): Note {
  counter += 1
  return {
    id: `n${counter}`,
    space_id: 's',
    created_by: 1,
    created_at: '2026-11-20T10:00:00.000Z',
    updated_at: '2026-11-20T10:00:00.000Z',
    deleted_at: null,
    rev: null,
    version: 1,
    folder_id: null,
    title: null,
    content: null,
    pinned: false,
    archived: false,
    ...fields,
  }
}

describe('plainLine', () => {
  it.each([
    ['# Zakupy', 'Zakupy'],
    ['### Plan **na** weekend', 'Plan na weekend'],
    ['- [ ] mleko', 'mleko'],
    ['- [x] chleb', 'chleb'],
    ['1. pierwszy', 'pierwszy'],
    ['> cytat', 'cytat'],
    ['zobacz [stronę](https://example.com) i [[Pomysły]]', 'zobacz stronę i Pomysły'],
    ['*kursywa* i _też_ oraz `kod`', 'kursywa i też oraz kod'],
    ['snake_case_name zostaje', 'snake_case_name zostaje'],
  ])('%s → %s', (line, plain) => {
    expect(plainLine(line)).toBe(plain)
  })
})

describe('heading and card', () => {
  it('use the title, and show the lines under it as a card does', () => {
    const withTitle = note({
      title: 'Prezenty',
      content: '# Dla mamy\n\n- szal\n- [ ] książka\n- [x] kwiaty\n2. **perfumy**',
    })

    expect(noteHeading(withTitle)).toBe('Prezenty')
    expect(cardLines(withTitle)).toEqual([
      'Dla mamy',
      '• szal',
      '☐ książka',
      '☑ kwiaty',
      '2. perfumy',
    ])
  })

  it('fall back to the first line without repeating it', () => {
    const untitled = note({ title: '  ', content: '\n---\n# Dla mamy\n- szal' })

    expect(noteHeading(untitled)).toBe('Dla mamy')
    expect(cardLines(untitled)).toEqual(['• szal'])
  })

  it('name an empty note and keep a card to a dozen lines', () => {
    expect(noteHeading(note())).toBe(pl.notes.untitled)
    expect(cardLines(note({ title: 'T', content: 'a\n'.repeat(30) }))).toHaveLength(12)
  })

  it('know an empty note and one with boxes left to tick', () => {
    expect(isEmptyNote(note({ title: ' ', content: '\n' }))).toBe(true)
    expect(isEmptyNote(note({ content: 'x' }))).toBe(false)
    expect(hasOpenItems(note({ content: '- [x] zrobione\n  - [ ] jeszcze nie' }))).toBe(true)
    expect(hasOpenItems(note({ content: '- [x] zrobione\ntekst [ ] w środku' }))).toBe(false)
  })
})

describe('order', () => {
  const old = note({
    title: 'Żaglówka',
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-11-20T10:00:00.000Z',
  })
  const recent = note({
    title: 'ćwiczenia',
    created_at: '2026-11-15T10:00:00.000Z',
    updated_at: '2026-11-16T10:00:00.000Z',
  })
  const middle = note({
    title: 'Auto',
    created_at: '2026-11-01T10:00:00.000Z',
    updated_at: '2026-11-02T10:00:00.000Z',
  })
  const pinned = note({
    title: 'Zz przypięta',
    pinned: true,
    created_at: '2026-01-01T10:00:00.000Z',
    updated_at: '2026-01-01T10:00:00.000Z',
  })
  const all = [middle, old, pinned, recent]

  it.each([
    ['changed', [pinned, old, recent, middle]],
    ['created', [pinned, recent, middle, old]],
    // As Polish sorts: "ć" after "c", "Ż" at the end, case aside.
    ['title', [pinned, middle, recent, old]],
    ['oldest', [pinned, old, middle, recent]],
  ] as const)('%s keeps pinned notes first', (order, expected) => {
    expect(sortNotes(all, order)).toEqual(expected)
  })
})

describe('folders and filters', () => {
  const inInbox = note()
  const orphan = note({ folder_id: 'gone', pinned: true })
  const inFolder = note({ folder_id: 'f', content: '- [ ] kupić' })
  const archived = note({ folder_id: 'f', archived: true })
  const all = [inInbox, orphan, inFolder, archived]
  const live = new Set(['f'])

  it('keeps notes of a missing folder in the inbox and leaves archived ones out', () => {
    expect(notesInFolder(all, null, live)).toEqual([inInbox, orphan])
    expect(notesInFolder(all, 'f', live)).toEqual([inFolder])
  })

  it('filters by folder, the inbox included, by pin and by boxes to tick', () => {
    expect(filterNotes(all, NO_FILTER, live)).toEqual(all)
    expect(filterNotes(all, { ...NO_FILTER, folder: null }, live)).toEqual([inInbox, orphan])
    expect(filterNotes(all, { ...NO_FILTER, folder: 'f' }, live)).toEqual([inFolder, archived])
    expect(filterNotes(all, { ...NO_FILTER, pinnedOnly: true }, live)).toEqual([orphan])
    expect(filterNotes(all, { ...NO_FILTER, openItemsOnly: true }, live)).toEqual([inFolder])
    expect(isFiltering(NO_FILTER)).toBe(false)
    expect(isFiltering({ ...NO_FILTER, folder: null })).toBe(true)
  })
})
describe('changedLabel', () => {
  const now = new Date(2026, 10, 20, 18, 0)

  it.each([
    [new Date(2026, 10, 20, 14, 30), 'dziś 14:30'],
    [new Date(2026, 10, 19, 23, 0), 'wczoraj'],
    [new Date(2026, 10, 18, 9, 0), '18 lis'],
    [new Date(2025, 10, 18, 9, 0), '18 lis 2025'],
  ])('%s', (at, label) => {
    expect(changedLabel(at.toISOString(), now)).toBe(label)
  })
})
