import { liveQuery } from 'dexie'
import { create } from 'zustand'
import { db, type OutboxEntry } from '@/db/db'
import type { SyncedRecord } from '@/db/repository'
import { api, ApiError, NetworkError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { DASHBOARD_LAYOUT_KEY, type DashboardLayout } from '@/lib/dashboard'
import { getTheme, setTheme, THEMES, type Theme } from '@/lib/theme'
import {
  BACKGROUND_SYNC_TAG,
  pushOutbox,
  SYNC_NOW_MESSAGE,
  type PushResult,
  type OutgoingOperation,
} from '@/sync/push'

interface SyncStatus {
  connection: 'ok' | 'offline' | 'error'
  /** Changes waiting to be sent. */
  pending: number
  /** Changes the server refused for good. */
  rejected: number
}

export const useSyncStatus = create<SyncStatus>(() => ({
  connection: 'ok',
  pending: 0,
  rejected: 0,
}))

interface PullPage {
  changes: { entity: string; record: SyncedRecord }[]
  cursor: number
  has_more: boolean
  settings: { theme: string | null; dashboard: DashboardLayout | null }
}

const CURSOR_KEY = 'sync_cursor'
const PENDING_THEME_KEY = 'pending_theme'
const PENDING_DASHBOARD_KEY = 'pending_dashboard_layout'
const PULL_PAGE_SIZE = 500

function postOperations(ops: OutgoingOperation[]) {
  return api.post<{ results: PushResult[] }>('/api/sync/push', { ops })
}

async function pushPendingSetting(key: string, field: 'theme' | 'dashboard') {
  const pending = (await db.meta.get(key))?.value
  if (!pending) {
    return
  }

  await api.post('/api/settings', { [field]: pending })

  // The user may have changed it again while the request was on its way.
  await db.transaction('rw', db.meta, async () => {
    if (JSON.stringify((await db.meta.get(key))?.value) === JSON.stringify(pending)) {
      await db.meta.delete(key)
    }
  })
}

/** The server's record, with this device's unsent changes kept on top of it. */
function withUnsentChanges(record: SyncedRecord, unsent: OutboxEntry[]): SyncedRecord {
  const edits = unsent.filter((entry) => entry.op !== 'create')
  const merged = { ...record, version: record.version + edits.length }

  for (const entry of edits) {
    if (entry.op === 'update') {
      Object.assign(merged, entry.payload)
    } else {
      merged.deleted_at = entry.op === 'delete' ? entry.client_ts : null
    }
  }

  return merged
}

/** Returns false when the account changed meanwhile and the page was dropped. */
async function applyPage(page: PullPage, userId: number): Promise<boolean> {
  const known = new Set(db.tables.map((table) => table.name))
  const unknown = page.changes.find((change) => !known.has(change.entity))
  if (unknown) {
    // An outdated app: stop here, so these records still arrive after it updates.
    throw new Error(`No local table for entity ${unknown.entity}`)
  }

  return db.transaction('rw', db.tables, async () => {
    // Checked inside the transaction: a sign-out's wipe runs either fully before or after it.
    if (useAuth.getState().account?.user.id !== userId) {
      return false
    }

    const unsent = (await db.outbox.toArray()).filter((entry) => !entry.rejected_reason)

    for (const { entity, record } of page.changes) {
      const own = unsent.filter((entry) => entry.entity === entity && entry.record_id === record.id)
      await db.table(entity).put(withUnsentChanges(record, own))
    }

    await db.meta.put({ key: CURSOR_KEY, value: page.cursor })

    if (page.settings.dashboard && !(await db.meta.get(PENDING_DASHBOARD_KEY))) {
      await db.meta.put({ key: DASHBOARD_LAYOUT_KEY, value: page.settings.dashboard })
    }

    return true
  })
}

async function applyServerTheme(theme: string | null) {
  const known: Theme | undefined = THEMES.find((candidate) => candidate === theme)
  if (known && known !== getTheme() && !(await db.meta.get(PENDING_THEME_KEY))) {
    setTheme(known)
  }
}

async function pull(userId: number) {
  for (;;) {
    const cursor = ((await db.meta.get(CURSOR_KEY))?.value as number | undefined) ?? 0
    const page = await api.get<PullPage>(`/api/sync/pull?cursor=${cursor}&limit=${PULL_PAGE_SIZE}`)

    if (!(await applyPage(page, userId))) {
      return
    }
    await applyServerTheme(page.settings.theme)

    if (!page.has_more) {
      return
    }
  }
}

/** Lets the browser finish sending after the app is closed (Android Chrome). */
function requestBackgroundSync() {
  type WithSync = ServiceWorkerRegistration & {
    sync?: { register(tag: string): Promise<void> }
  }

  navigator.serviceWorker?.ready
    .then((registration) => (registration as WithSync).sync?.register(BACKGROUND_SYNC_TAG))
    .catch(() => {
      // Not critical: the app sends the changes itself the next time it opens.
    })
}

async function runCycle() {
  const userId = useAuth.getState().account?.user.id
  if (userId === undefined) {
    return
  }

  try {
    await pushPendingSetting(PENDING_THEME_KEY, 'theme')
    await pushPendingSetting(PENDING_DASHBOARD_KEY, 'dashboard')
    await pushOutbox(postOperations)
    await pull(userId)
    useSyncStatus.setState({ connection: 'ok' })
  } catch (error) {
    if (error instanceof NetworkError) {
      useSyncStatus.setState({ connection: 'offline' })
      if ((await db.outbox.count()) > 0) {
        requestBackgroundSync()
      }
      return
    }

    // 401 is already handled: the API client has signed the user out.
    if (!(error instanceof ApiError && error.status === 401)) {
      console.error('Synchronisation failed', error)
      useSyncStatus.setState({ connection: 'error' })
    }
  }
}

let running: Promise<void> | null = null
let runAgain = false

/** Only one cycle runs at a time; a request during a cycle starts one more afterwards. */
export function runSync(): Promise<void> {
  if (running) {
    runAgain = true
    return running
  }

  running = runCycle().finally(() => {
    running = null
    if (runAgain) {
      runAgain = false
      void runSync()
    }
  })

  return running
}

/** Finishes after a full cycle begun after this call: one under way may miss the newest changes. */
export async function syncNow() {
  if (running) {
    await running
  }
  await runSync()
}

/** Applies the theme at once; the server hears about it whenever it can be reached. */
export async function saveTheme(theme: Theme) {
  setTheme(theme)
  try {
    await db.meta.put({ key: PENDING_THEME_KEY, value: theme })
  } catch {
    return // Still applied on this device.
  }
  void runSync()
}

/** Saved on this device at once; the server hears about it whenever it can be reached. */
export async function saveDashboardLayout(layout: DashboardLayout) {
  await db.meta.bulkPut([
    { key: DASHBOARD_LAYOUT_KEY, value: layout },
    { key: PENDING_DASHBOARD_KEY, value: layout },
  ])
  void runSync()
}

/**
 * Tries to send everything before signing out. Returns how many changes would be lost.
 * Signing out needs a connection anyway, so being offline is reported as an error.
 */
export async function sendChangesBeforeLogOut(): Promise<number> {
  if ((await db.outbox.count()) === 0) {
    return 0
  }

  await runSync()

  if (useSyncStatus.getState().connection === 'offline') {
    throw new NetworkError()
  }

  return db.outbox.count()
}

/** Call once at startup. Returns a function that stops all the triggers. */
export function startSync({ debounceMs = 2000, intervalMs = 60_000 } = {}) {
  let debounce: ReturnType<typeof setTimeout> | undefined
  let knownPending = 0

  function sync() {
    if (useAuth.getState().status === 'authenticated') {
      void runSync()
    }
  }

  function syncIfVisible() {
    if (document.visibilityState === 'visible') {
      sync()
    }
  }

  const outbox = liveQuery(() => db.outbox.toArray()).subscribe((entries) => {
    const rejected = entries.filter((entry) => entry.rejected_reason).length
    const pending = entries.length - rejected
    useSyncStatus.setState({ pending, rejected })

    if (pending > knownPending) {
      clearTimeout(debounce)
      debounce = setTimeout(sync, debounceMs)
    }
    knownPending = pending
  })

  const stopWatchingAuth = useAuth.subscribe((state, previous) => {
    if (state.status === 'guest') {
      clearTimeout(debounce)
      useSyncStatus.setState({ connection: 'ok' })
    } else if (state.account && state.account.user.id !== previous.account?.user.id) {
      sync()
    }
  })

  function syncOnWorkerRequest(event: MessageEvent<{ type?: string }>) {
    if (event.data?.type === SYNC_NOW_MESSAGE) {
      sync()
    }
  }

  window.addEventListener('online', sync)
  document.addEventListener('visibilitychange', syncIfVisible)
  navigator.serviceWorker?.addEventListener('message', syncOnWorkerRequest)
  const interval = setInterval(syncIfVisible, intervalMs)

  sync()

  return () => {
    clearTimeout(debounce)
    clearInterval(interval)
    outbox.unsubscribe()
    stopWatchingAuth()
    window.removeEventListener('online', sync)
    document.removeEventListener('visibilitychange', syncIfVisible)
    navigator.serviceWorker?.removeEventListener('message', syncOnWorkerRequest)
  }
}
