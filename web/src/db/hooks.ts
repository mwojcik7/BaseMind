import { useLiveQuery } from 'dexie-react-hooks'
import type { Repository, SyncedRecord } from '@/db/repository'

// Both hooks re-render on any change to the data, including changes from synchronisation
// and other tabs. They return undefined while the first read is in progress.

export function useRecords<T extends SyncedRecord>(repository: Repository<T>) {
  return useLiveQuery(() => repository.list(), [repository])
}

/** Also undefined when the record doesn't exist or has been deleted. */
export function useRecord<T extends SyncedRecord>(repository: Repository<T>, id: string) {
  return useLiveQuery(() => repository.get(id), [repository, id])
}
