import { db } from '@/db/db'
import { normalize } from '@/search/engine'

// In the local database rather than localStorage, so signing out removes them with the rest.
const RECENT_KEY = 'recent_searches'
const MAX_RECENT = 8

export async function getRecentSearches(): Promise<string[]> {
  return ((await db.meta.get(RECENT_KEY))?.value as string[] | undefined) ?? []
}

export function rememberSearch(query: string) {
  return db.transaction('rw', db.meta, async () => {
    const others = (await getRecentSearches()).filter(
      (recent) => normalize(recent) !== normalize(query),
    )
    await db.meta.put({ key: RECENT_KEY, value: [query, ...others].slice(0, MAX_RECENT) })
  })
}

export function clearRecentSearches() {
  return db.meta.delete(RECENT_KEY)
}
