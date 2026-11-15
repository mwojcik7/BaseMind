import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { daysLeft, trashSources, type TrashEntry, type TrashSource } from '@/modules/trashRegistry'

interface Item extends TrashEntry {
  source: TrashSource
}

function dayLabel(deletedAt: string, now: Date) {
  const date = parseISO(deletedAt)
  const ago = differenceInCalendarDays(now, date)
  if (ago === 0) {
    return pl.trash.today
  }
  if (ago === 1) {
    return pl.trash.yesterday
  }
  return format(date, 'd MMMM', { locale: dateLocale })
}

async function loadItems(): Promise<Item[]> {
  const perSource = await Promise.all(
    trashSources.map(async (source) =>
      (await source.entries()).map((entry) => ({ ...entry, source })),
    ),
  )
  return perSource.flat().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
}

function groupByDay(items: Item[], now: Date) {
  const groups: { label: string; items: Item[] }[] = []
  for (const item of items) {
    const label = dayLabel(item.deletedAt, now)
    const last = groups.at(-1)
    if (last?.label === label) {
      last.items.push(item)
    } else {
      groups.push({ label, items: [item] })
    }
  }
  return groups
}

export function TrashPage() {
  const items = useLiveQuery(loadItems)
  const [purging, setPurging] = useState<Item | 'all' | null>(null)
  const [busy, setBusy] = useState(false)
  const now = new Date()

  async function run(work: () => Promise<unknown>, done: string) {
    setBusy(true)
    try {
      await work()
      toast.success(done)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function confirmPurge() {
    const target = purging
    setPurging(null)
    if (target === 'all') {
      void run(async () => {
        for (const item of items ?? []) {
          await item.source.purge(item.id)
        }
      }, pl.trash.emptied)
    } else if (target) {
      void run(() => target.source.purge(target.id), pl.trash.purged)
    }
  }

  return (
    <>
      <PageHeader title={pl.trash.title} description={pl.trash.description} />

      {items && items.length === 0 && (
        <EmptyState icon={Trash2} title={pl.trash.empty} description={pl.trash.emptyDescription} />
      )}

      {items && items.length > 0 && (
        <>
          <Button
            variant="secondary"
            className="mt-4 w-full sm:w-auto"
            disabled={busy}
            onClick={() => setPurging('all')}
          >
            <Trash2 aria-hidden />
            {pl.trash.emptyTrash}
          </Button>

          {groupByDay(items, now).map((group) => (
            <section key={group.label} className="mt-6">
              <h2 className="text-sm font-semibold text-muted-foreground">{group.label}</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {group.items.map((item) => {
                  const Icon = item.source.icon
                  return (
                    <li
                      key={`${item.source.id}:${item.id}`}
                      className="flex items-center gap-3 rounded-lg bg-card py-2 pr-1 pl-4 text-card-foreground"
                    >
                      <Icon
                        aria-label={item.source.label}
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[item.detail, pl.trash.daysLeft(daysLeft(item.deletedAt, now))]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run(() => item.source.restore(item.id), pl.trash.restored)
                        }
                      >
                        <RotateCcw aria-hidden />
                        {pl.trash.restore}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${pl.trash.purge}: ${item.title}`}
                        disabled={busy}
                        onClick={() => setPurging(item)}
                      >
                        <X aria-hidden />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </>
      )}

      <Dialog open={purging !== null} onOpenChange={(open) => !open && setPurging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {purging === 'all'
                ? pl.trash.emptyTrashTitle
                : pl.trash.purgeTitle(purging?.title ?? '')}
            </DialogTitle>
            <DialogDescription>
              {purging === 'all'
                ? pl.trash.emptyTrashDescription(items?.length ?? 0)
                : pl.trash.purgeDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="destructive" onClick={confirmPurge}>
              {purging === 'all' ? pl.trash.emptyTrash : pl.trash.purge}
            </Button>
            <Button variant="secondary" onClick={() => setPurging(null)}>
              {pl.common.cancel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
