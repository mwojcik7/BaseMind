import type { SearchHit } from '@/search/engine'
import type { SearchRequest, SearchResponse } from '@/search/search.worker'

let worker: Worker | null = null
let nextId = 1
const waiting = new Map<number, (hits: SearchHit[]) => void>()

/** Started on the first search, so opening the app costs nothing. */
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' })

    worker.addEventListener('message', (event: MessageEvent<SearchResponse>) => {
      waiting.get(event.data.id)?.(event.data.hits)
      waiting.delete(event.data.id)
    })

    worker.addEventListener('error', (event) => {
      console.error('Search worker failed', event.message)
      waiting.forEach((resolve) => resolve([]))
      waiting.clear()
    })
  }

  return worker
}

export function search(query: string): Promise<SearchHit[]> {
  return new Promise((resolve) => {
    const request: SearchRequest = { id: nextId++, query }
    waiting.set(request.id, resolve)
    getWorker().postMessage(request)
  })
}
