import { cn } from 'cn'
import { format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { DayItems } from '@/modules/calendar/CalendarItems'
import { colorClassOf } from '@/modules/calendar/colors'
import {
  dayHeading,
  itemsByDay,
  monthGrid,
  shiftMonth,
  type CalendarItem,
  type CalendarSources,
} from '@/modules/calendar/days'
import type { CalendarSettings } from '@/modules/calendar/settings'
import { selectDay, showMonth, useCalendarView } from '@/modules/calendar/view'

const text = pl.calendar

/** A finger moving sideways at least this far turns the month. */
const SWIPE_DISTANCE = 50
const MAX_MARKERS = 3

function Markers({ items }: { items: readonly CalendarItem[] }) {
  const marked = items.filter((item) => item.kind !== 'holiday').slice(0, MAX_MARKERS)

  return (
    <span aria-hidden className="flex h-1.5 gap-0.5">
      {marked.map((item) =>
        item.kind === 'event' ? (
          <span
            key={item.key}
            className={`size-1.5 rounded-full ${colorClassOf(item.event.color)}`}
          />
        ) : (
          <span key={item.key} className="size-1.5 rounded-full border border-muted-foreground" />
        ),
      )}
    </span>
  )
}

/** A month as a grid with dots, and the list of the picked day under it. */
export function MonthView({
  sources,
  settings,
  today,
}: {
  sources: CalendarSources
  settings: CalendarSettings
  today: string
}) {
  const state = useCalendarView()
  const selected = state.selected ?? today
  const month = state.month ?? selected.slice(0, 7)
  const weeks = useMemo(() => monthGrid(month), [month])
  const first = weeks[0][0]
  const last = weeks[weeks.length - 1][6]
  const byDay = useMemo(
    () => itemsByDay(sources, settings, first, last),
    [sources, settings, first, last],
  )
  const touch = useRef<{ x: number; y: number } | null>(null)
  const selectedItems = byDay.get(selected) ?? []
  const title = format(parseISO(`${month}-01`), 'LLLL yyyy', { locale: dateLocale })

  function swipe(event: React.PointerEvent) {
    const start = touch.current
    touch.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      showMonth(shiftMonth(month, dx < 0 ? 1 : -1), today)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={text.previousMonth}
          onClick={() => showMonth(shiftMonth(month, -1), today)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <h2 className="text-base font-semibold first-letter:uppercase" aria-live="polite">
          {title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={text.nextMonth}
          onClick={() => showMonth(shiftMonth(month, 1), today)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <div
        className="touch-pan-y select-none"
        onPointerDown={(event) => (touch.current = { x: event.clientX, y: event.clientY })}
        onPointerUp={swipe}
        onPointerCancel={() => (touch.current = null)}
      >
        <div
          aria-hidden
          className="grid grid-cols-7 pb-1 text-center text-xs text-muted-foreground"
        >
          {text.weekdays.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div role="group" aria-label={title} className="grid grid-cols-7 gap-y-1">
          {weeks.flat().map((day) => {
            const items = byDay.get(day) ?? []
            const holiday = items.some((item) => item.kind === 'holiday')
            const outside = !day.startsWith(month)
            const label = format(parseISO(day), 'EEEE d MMMM', { locale: dateLocale })

            return (
              <button
                key={day}
                type="button"
                aria-pressed={day === selected}
                aria-current={day === today ? 'date' : undefined}
                aria-label={text.dayCell(label, items.length)}
                onClick={() => selectDay(day)}
                className={cn(
                  'flex h-14 flex-col items-center gap-1 rounded-md pt-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  day === selected && 'bg-secondary',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-sm tabular-nums',
                    outside && 'text-muted-foreground/60',
                    holiday && 'text-destructive',
                    day === today && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <Markers items={items} />
              </button>
            )
          })}
        </div>
      </div>

      <section aria-label={dayHeading(selected, today)}>
        <h2 className="mb-2 text-sm font-semibold first-letter:uppercase">
          {dayHeading(selected, today)}
        </h2>
        {selectedItems.length > 0 ? (
          <DayItems items={selectedItems} />
        ) : (
          <p className="px-3 text-sm text-muted-foreground">{text.nothingPlanned}</p>
        )}
      </section>
    </div>
  )
}
