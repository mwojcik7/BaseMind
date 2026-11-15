import { Link, Outlet } from '@tanstack/react-router'
import { addDays, format, parseISO } from 'date-fns'
import { CalendarDays, Plus, Repeat } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { useToday } from '@/lib/use-today'
import { colorClassOf } from '@/modules/calendar/colors'
import { events, type CalendarEvent } from '@/modules/calendar/repo'
import { occurrenceStarts } from '@/modules/calendar/series'
import { dayLabel } from '@/modules/tasks/selectors'

const text = pl.calendar
const DAYS_AHEAD = 60

interface Occurrence {
  event: CalendarEvent
  start: string
}

/** Occurrences in the next days, soonest first; all-day ones lead their day. */
function upcoming(all: CalendarEvent[], today: string): Occurrence[] {
  const last = format(addDays(parseISO(today), DAYS_AHEAD), 'yyyy-MM-dd')

  return all
    .flatMap((event) => occurrenceStarts(event, today, last).map((start) => ({ event, start })))
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) ||
        (a.event.start_time ?? '').localeCompare(b.event.start_time ?? ''),
    )
}

function OccurrenceRow({ occurrence }: { occurrence: Occurrence }) {
  const { event, start } = occurrence
  const time = event.start_time ? `${event.start_time}–${event.end_time}` : text.allDayShort

  return (
    <li>
      <Link
        to="/calendar/events/$eventId"
        params={{ eventId: event.id }}
        search={{ date: start }}
        className="flex min-h-14 items-center gap-3 rounded-lg bg-card px-3 py-2"
      >
        <span
          aria-hidden
          className={`h-9 w-1 shrink-0 rounded-full ${colorClassOf(event.color)}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{event.title}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {[time, event.location].filter(Boolean).join(' · ')}
          </span>
        </span>
        {event.rrule && <Repeat aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
      </Link>
    </li>
  )
}

/**
 * For now a plain list of what is coming; the Agenda and Month views replace it (plan.md, 2.2).
 */
export function CalendarPage() {
  const all = useRecords(events)
  const today = useToday()
  const items = all ? upcoming(all, today) : []
  const days = [...new Set(items.map((item) => item.start))]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <PageHeader title={pl.modules.calendar} description={text.upcomingHint} />
        <Button asChild size="sm">
          <Link to="/calendar/new" search={{}}>
            <Plus aria-hidden />
            {text.newEvent}
          </Link>
        </Button>
      </div>

      {all && items.length === 0 && (
        <EmptyState icon={CalendarDays} description={text.noUpcoming} />
      )}

      {days.map((day) => (
        <section key={day}>
          <h2 className="mb-2 text-sm font-semibold first-letter:uppercase">
            {dayLabel(day, today)}
          </h2>
          <ul className="flex flex-col gap-2">
            {items
              .filter((item) => item.start === day)
              .map((item) => (
                <OccurrenceRow key={`${item.event.id}:${item.start}`} occurrence={item} />
              ))}
          </ul>
        </section>
      ))}

      <Outlet />
    </div>
  )
}
