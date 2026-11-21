import { describe, expect, it } from 'vitest'
import { normalize, SearchIndex, snippetFor, type SearchDocument } from '@/search/engine'
import {
  clearRecentSearches,
  getRecentSearches,
  rememberSearch,
  removeRecentSearch,
} from '@/search/recent'
import { searchSources, toDocument } from '@/search/sources'
import type { SyncedRecord } from '@/db/repository'

function document(id: string, title: string, text = ''): SearchDocument {
  return { id: `notes:${id}`, entity: 'notes', title, subtitle: null, href: null, text }
}

function indexOf(...documents: SearchDocument[]) {
  const index = new SearchIndex()
  index.sync(documents)
  return index
}

const titles = (index: SearchIndex, query: string) => index.search(query).map((hit) => hit.title)

describe('normalize', () => {
  it('removes Polish characters, including ł', () => {
    expect(normalize('Zażółć GĘŚLĄ jaźń Łódź')).toBe('zazolc gesla jazn lodz')
  })
})

describe('search index', () => {
  it('ignores case and Polish characters in both directions', () => {
    const index = indexOf(document('1', 'Żółty samochód'))

    expect(titles(index, 'zolty')).toEqual(['Żółty samochód'])
    expect(titles(index, 'SAMOCHÓD')).toEqual(['Żółty samochód'])
  })

  it('finds words by their beginning', () => {
    expect(titles(indexOf(document('1', 'Ubezpieczenie auta')), 'ubez')).toHaveLength(1)
  })

  it('tolerates a typo in a longer word', () => {
    expect(titles(indexOf(document('1', 'Ubezpieczenie')), 'ubezpieczanie')).toHaveLength(1)
  })

  it('tolerates two swapped letters, also in a short word', () => {
    const index = indexOf(document('1', 'Żółty dom'))

    expect(titles(index, 'zolyt')).toHaveLength(1)
    expect(titles(index, 'ozlty')).toHaveLength(1)
    expect(titles(index, 'żółyt dom')).toHaveLength(1)
  })

  it('still ranks the word as typed above a swapped match', () => {
    const index = indexOf(document('1', 'Tarka'), document('2', 'Traka'))

    expect(titles(index, 'trak')[0]).toBe('Traka')
  })

  it('finds nothing for a query made only of punctuation', () => {
    expect(titles(indexOf(document('1', 'Dom')), '...')).toEqual([])
  })

  it('does not guess at very short words', () => {
    expect(titles(indexOf(document('1', 'Kot')), 'kit')).toEqual([])
  })

  it('requires every word of the query', () => {
    const index = indexOf(document('1', 'Przegląd auta'), document('2', 'Mycie auta'))

    expect(titles(index, 'auta przegląd')).toEqual(['Przegląd auta'])
  })

  it('searches the body too, ranking title matches first', () => {
    const index = indexOf(document('1', 'Lista', 'prezent dla Ani'), document('2', 'Prezent'))

    expect(titles(index, 'prezent')).toEqual(['Prezent', 'Lista'])
  })

  it('follows added, changed and removed documents', () => {
    const index = indexOf(document('1', 'Stary tytuł'), document('2', 'Drugi'))

    index.sync([document('1', 'Nowy tytuł'), document('3', 'Trzeci')])

    expect(titles(index, 'stary')).toEqual([])
    expect(titles(index, 'nowy')).toEqual(['Nowy tytuł'])
    expect(titles(index, 'drugi')).toEqual([])
    expect(titles(index, 'trzeci')).toEqual(['Trzeci'])
  })

  it('can add a document again after removing it', () => {
    const index = indexOf(document('1', 'Powrót'))

    index.sync([])
    index.sync([document('1', 'Powrót')])

    expect(titles(index, 'powrot')).toHaveLength(1)
  })

  it('empties when the data is gone', () => {
    const index = indexOf(document('1', 'Tajne'))

    index.sync([])

    expect(titles(index, 'tajne')).toEqual([])
  })

  it('returns what the results screen needs: a snippet instead of the whole body', () => {
    const [hit] = indexOf({ ...document('1', 'Tytuł', 'treść'), href: '/notes' }).search('tytul')

    expect(hit).toEqual({
      id: 'notes:1',
      entity: 'notes',
      title: 'Tytuł',
      subtitle: null,
      href: '/notes',
      snippet: { before: 'treść', match: '', after: '' },
    })
  })

  it('caps the number of results', () => {
    const many = Array.from({ length: 80 }, (_, i) => document(String(i), `Wspólny ${i}`))

    expect(indexOf(...many).search('wspolny')).toHaveLength(50)
  })
})

describe('search sources', () => {
  it('turn a tag into a document', () => {
    const tags = searchSources.find((source) => source.entity === 'tags')!

    expect(toDocument(tags, { id: 'x', name: 'Dom' } as unknown as SyncedRecord)).toEqual({
      id: 'tags:x',
      entity: 'tags',
      title: 'Dom',
      subtitle: null,
      href: null,
      text: '',
    })
  })

  it('turn an event into a document, searching its place and description too', () => {
    const events = searchSources.find((source) => source.entity === 'events')!
    const event = {
      id: 'e',
      title: 'Dentysta',
      location: 'Gabinet Uśmiech',
      description: null,
      start_date: '2026-11-20',
      start_time: '18:00',
    }

    expect(toDocument(events, event as unknown as SyncedRecord)).toEqual({
      id: 'events:e',
      entity: 'events',
      title: 'Dentysta',
      subtitle: '20.11.2026 18:00',
      href: '/calendar/events/e',
      text: 'Gabinet Uśmiech',
    })
  })

  it('turn a note into a document: plain text, the first line as the title when untitled', () => {
    const notes = searchSources.find((source) => source.entity === 'notes')!
    const note = (fields: object) =>
      toDocument(notes, {
        id: 'n',
        title: null,
        archived: false,
        ...fields,
      } as unknown as SyncedRecord)

    expect(note({ content: '# Zakupy\n- **mleko**\n- [ ] [[chleb]]' })).toEqual({
      id: 'notes:n',
      entity: 'notes',
      title: 'Zakupy',
      subtitle: null,
      href: '/notes/n',
      text: 'mleko chleb',
    })
    expect(note({ title: 'Lista', content: 'jeden', archived: true })).toMatchObject({
      title: 'Lista',
      subtitle: 'Archiwum',
      text: 'jeden',
    })
    expect(note({ content: '' }).title).toBe('Pusta notatka')
  })
})

describe('snippets', () => {
  const hit = (title: string, text: string, query: string) =>
    indexOf(document('1', title, text)).search(query)[0]

  it('show the matched word in its words, cut at spaces', () => {
    const text = `${'słowo '.repeat(10)}kupić mleko i masło do ciasta ${'dalej '.repeat(15)}`

    expect(hit('Zakupy', text, 'masło').snippet).toEqual({
      before: '…słowo słowo kupić mleko i ',
      match: 'masło',
      after: ' do ciasta dalej dalej dalej dalej dalej dalej…',
    })
  })

  it('find the word whatever the case, Polish letters or a typo', () => {
    expect(hit('Zakupy', 'Kupić MASŁO', 'maslo').snippet?.match).toBe('MASŁO')
    expect(hit('Zakupy', 'ubezpieczenie auta', 'ubezpieczanie').snippet?.match).toBe(
      'ubezpieczenie',
    )
  })

  it('show the start of the text when only the title matched', () => {
    expect(hit('Zakupy', 'mleko, chleb', 'zakupy').snippet).toEqual({
      before: 'mleko, chleb',
      match: '',
      after: '',
    })
  })

  it('are left out without text', () => {
    expect(hit('Zakupy', '', 'zakupy').snippet).toBeNull()
  })

  it('cut the start of a long text', () => {
    expect(snippetFor('a '.repeat(100), [])?.before).toMatch(/…$/)
  })
})

describe('recent searches', () => {
  it('keep the newest first and do not repeat', async () => {
    await rememberSearch('auto')
    await rememberSearch('dom')
    await rememberSearch('AUTO')

    expect(await getRecentSearches()).toEqual(['AUTO', 'dom'])
  })

  it('keep only the last eight', async () => {
    for (let i = 0; i < 10; i++) {
      await rememberSearch(`szukane ${i}`)
    }

    const recent = await getRecentSearches()
    expect(recent).toHaveLength(8)
    expect(recent[0]).toBe('szukane 9')
  })

  it('can be removed one at a time', async () => {
    await rememberSearch('auto')
    await rememberSearch('dom')

    await removeRecentSearch('auto')

    expect(await getRecentSearches()).toEqual(['dom'])
  })

  it('can be cleared', async () => {
    await rememberSearch('auto')

    await clearRecentSearches()

    expect(await getRecentSearches()).toEqual([])
  })
})
