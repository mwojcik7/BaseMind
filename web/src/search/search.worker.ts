import { liveQuery } from 'dexie'
import { db } from '@/db/db'
import type { SyncedRecord } from '@/db/repository'
import { SearchIndex, type SearchDocument } from '@/search/engine'
import { searchSources, toDocument } from '@/search/sources'

export interface SearchRequest {
  id: number
  query: string
}

export interface SearchResponse {
  id: number
  hits: ReturnType<SearchIndex['search']>
}

const index = new SearchIndex()

let markReady: () => void = () => {}
const ready = new Promise<void>((resolve) => (markReady = resolve))

async function readDocuments() {
  const documents: SearchDocument[] = []

  for (const from of searchSources) {
    const records = await db
      .table<SyncedRecord>(from.entity)
      .filter((record) => record.deleted_at === null)
      .toArray()
    documents.push(...records.map((record) => toDocument(from, record)))
  }

  return documents
}

// Also sees changes made in the app, including wiping the data when signing out.
liveQuery(readDocuments).subscribe({
  next(documents) {
    index.sync(documents)
    markReady()
  },
  error(error) {
    console.error('Could not read data for the search index', error)
    markReady()
  },
})

self.addEventListener('message', (event: MessageEvent<SearchRequest>) => {
  void ready.then(() => {
    const response: SearchResponse = {
      id: event.data.id,
      hits: index.search(event.data.query),
    }
    self.postMessage(response)
  })
})
