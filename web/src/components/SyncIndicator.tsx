import { CloudCheck, CloudOff, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { syncNow, useSyncStatus } from '@/sync/engine'

// A sync can take a fraction of a second; without this a tap would seem to do nothing.
const MIN_SPIN_MS = 600

function describe(
  connection: 'ok' | 'offline' | 'error',
  pending: number,
  rejected: number,
): { Icon: LucideIcon; label: string; alert?: boolean } {
  if (rejected > 0) {
    return { Icon: TriangleAlert, label: pl.sync.rejected(rejected), alert: true }
  }
  if (connection === 'error') {
    return { Icon: TriangleAlert, label: pl.sync.error, alert: true }
  }
  if (connection === 'offline') {
    return {
      Icon: CloudOff,
      label: pending > 0 ? pl.sync.offlinePending(pending) : pl.sync.offline,
    }
  }
  if (pending > 0) {
    return { Icon: RefreshCw, label: pl.sync.pending(pending) }
  }
  return { Icon: CloudCheck, label: pl.sync.synced }
}

export function SyncIndicator() {
  const { connection, pending, rejected } = useSyncStatus()
  const [syncing, setSyncing] = useState(false)
  const { Icon, label, alert } = syncing
    ? { Icon: RefreshCw, label: pl.sync.syncing, alert: false }
    : describe(connection, pending, rejected)

  async function handleClick() {
    if (syncing) {
      return
    }

    setSyncing(true)
    await Promise.all([syncNow(), new Promise((done) => setTimeout(done, MIN_SPIN_MS))])
    setSyncing(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={pl.sync.syncNow}
        aria-busy={syncing}
        title={label}
        className={alert ? 'text-destructive' : 'text-muted-foreground'}
        onClick={() => void handleClick()}
      >
        <Icon aria-hidden className={`size-5 ${syncing ? 'animate-spin' : ''}`} />
      </Button>
      <span role="status" aria-label={label} className="sr-only">
        {label}
      </span>
    </>
  )
}
