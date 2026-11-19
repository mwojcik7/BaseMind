import { format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { pl } from '@/i18n/pl'
import type { SeriesScope } from '@/modules/calendar/occurrence'

const text = pl.calendar.seriesPrompt

/**
 * Asks which part of a series a change or deletion is about. Without `scopes` including
 * 'this' (a new repeat rule can't apply to one occurrence), that choice is left out.
 */
export function SeriesScopePrompt({
  action,
  date,
  scopes,
  onChoose,
  onCancel,
}: {
  /** What was asked for; null keeps the prompt closed. */
  action: 'save' | 'delete' | null
  /** The occurrence the series was opened at. */
  date: string
  scopes: readonly SeriesScope[]
  onChoose: (scope: SeriesScope) => void
  onCancel: () => void
}) {
  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action === 'delete' ? text.deleteTitle : text.saveTitle}</DialogTitle>
          <DialogDescription>
            {text.occurrence(format(parseISO(date), 'EEEE d MMMM', { locale: dateLocale }))}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          {scopes.map((scope, index) => (
            <Button
              key={scope}
              variant={index === 0 ? 'default' : 'secondary'}
              onClick={() => onChoose(scope)}
            >
              {text[scope]}
            </Button>
          ))}
          <Button variant="ghost" onClick={onCancel}>
            {pl.common.cancel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
