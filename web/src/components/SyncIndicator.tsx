import { CloudCheck, CloudOff, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import { pl } from '@/i18n/pl'
import { useSyncStatus } from '@/sync/engine'

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
  const { Icon, label, alert } = describe(connection, pending, rejected)

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={`flex size-11 shrink-0 items-center justify-center ${alert ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      <Icon aria-hidden className="size-5" />
    </span>
  )
}
