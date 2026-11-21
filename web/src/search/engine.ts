import MiniSearch, { type Query } from 'minisearch'

export interface SearchDocument {
  /** Unique across all entities: `entity:recordId`. */
  id: string
  entity: string
  title: string
  subtitle: string | null
  href: string | null
  /** Everything else that should be searchable. */
  text: string
}

/** A piece of the text under the title, with the matched word apart to show it in bold. */
export interface Snippet {
  before: string
  /** Empty when only the title matched: the snippet is then the start of the text. */
  match: string
  after: string
}

export type SearchHit = Omit<SearchDocument, 'text'> & { snippet?: Snippet | null }

const RESULT_LIMIT = 50

/** Characters of context around the matched word, and of the text when only the title matched. */
const SNIPPET_BEFORE = 30
const SNIPPET_AFTER = 50
const SNIPPET_LEAD = 80

/** Lets "zolc" find "żółć". NFD does not split "ł", so it needs its own replacement. */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

// The same separators MiniSearch uses when indexing.
const WORD_SEPARATOR = /[\n\r\p{Z}\p{P}]+/u

/**
 * Two swapped letters are the most common typo on a phone, yet they count as two
 * mistakes, more than a short word is allowed. So each possible swap is searched as well.
 */
function swappedLetters(word: string) {
  if (word.length < 4) {
    return []
  }

  const variants = new Set<string>()
  for (let i = 0; i < word.length - 1; i++) {
    variants.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2))
  }
  variants.delete(word)

  return [...variants]
}

const WORD = /[^\n\r\p{Z}\p{P}]+/gu

/** Cuts `text` to at most `length` characters at a space, with "…" where it was cut. */
function cutEnd(text: string, length: number) {
  if (text.length <= length) return text
  const cut = text.slice(0, length)
  const space = cut.lastIndexOf(' ')
  return `${(space > length / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

function cutStart(text: string, length: number) {
  if (text.length <= length) return text
  const cut = text.slice(text.length - length)
  const space = cut.indexOf(' ')
  return `…${(space >= 0 && space < length / 2 ? cut.slice(space) : cut).trimStart()}`
}

/**
 * The words around the first word of `text` among `terms` (normalised whole words, as the
 * index keeps them). Without one, the start of the text; null for no text.
 */
export function snippetFor(text: string, terms: readonly string[]): Snippet | null {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return null

  const wanted = new Set(terms)
  for (const word of flat.matchAll(WORD)) {
    if (wanted.has(normalize(word[0]))) {
      const start = word.index
      const end = start + word[0].length
      return {
        before: cutStart(flat.slice(0, start), SNIPPET_BEFORE),
        match: word[0],
        after: cutEnd(flat.slice(end), SNIPPET_AFTER),
      }
    }
  }

  return { before: cutEnd(flat, SNIPPET_LEAD), match: '', after: '' }
}

/** Full-text index in memory. Holds decrypted data, so it is never written anywhere. */
export class SearchIndex {
  private readonly index = new MiniSearch<SearchDocument>({
    fields: ['title', 'text'],
    storeFields: ['entity', 'title', 'subtitle', 'href'],
    processTerm: normalize,
  })

  // What each indexed document looked like, to re-index only what changed.
  private readonly indexed = new Map<string, string>()

  // The searchable text of each document, to cut snippets from.
  private readonly texts = new Map<string, string>()

  /** Makes the index match `documents`: adds, replaces and removes only what differs. */
  sync(documents: SearchDocument[]) {
    const stale = new Set(this.indexed.keys())

    for (const document of documents) {
      stale.delete(document.id)

      const signature = JSON.stringify(document)
      const previous = this.indexed.get(document.id)
      if (previous === signature) {
        continue
      }

      if (previous === undefined) {
        this.index.add(document)
      } else {
        this.index.replace(document)
      }
      this.indexed.set(document.id, signature)
      this.texts.set(document.id, document.text)
    }

    for (const id of stale) {
      this.index.discard(id)
      this.indexed.delete(id)
      this.texts.delete(id)
    }
  }

  search(query: string): SearchHit[] {
    const words = normalize(query).split(WORD_SEPARATOR).filter(Boolean)
    const everyWord: Query = {
      combineWith: 'AND',
      queries: words.map((word) => ({
        combineWith: 'OR',
        queries: [
          word,
          // Exact matches only: a typo on top of a swap would match too much.
          { combineWith: 'OR', fuzzy: false, queries: swappedLetters(word) },
        ],
      })),
    }

    return this.index
      .search(everyWord, {
        prefix: true,
        // Tolerating typos in very short words would match almost anything.
        fuzzy: (term) => (term.length >= 4 ? 0.2 : false),
        boost: { title: 2 },
      })
      .slice(0, RESULT_LIMIT)
      .map((result) => ({
        id: result.id as string,
        entity: result.entity as string,
        title: result.title as string,
        subtitle: result.subtitle as string | null,
        href: result.href as string | null,
        snippet: snippetFor(this.texts.get(result.id as string) ?? '', result.terms),
      }))
  }
}
