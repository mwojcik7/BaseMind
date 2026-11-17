import { Link } from '@tanstack/react-router'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { useTimeNow, useToday } from '@/lib/use-today'
import { colorClassOf } from '@/modules/calendar/colors'
import { eventOverAt, eventsAhead, eventTime } from '@/modules/calendar/days'
import { events } from '@/modules/calendar/repo'

const MAX_SHOWN = 5

/** Today's and tomorrow's events on "Dziś"; today's that are over are greyed out. */
export function EventsWidget() {
  const all = useRecords(events)
  const today = useToday()
  const now = useTimeNow()

  if (all === undefined) {
    return null
  }

  const days = eventsAhead(all, today)
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">{pl.today.eventsEmpty}</p>
  }

  // The limit counts rows across both days, so tomorrow may be cut short or left out.
  const before = (index: number) =>
    days.slice(0, index).reduce((sum, { items }) => sum + items.length, 0)
  const shown = days
    .map(({ day, items }, index) => ({
      day,
      items: items.slice(0, Math.max(MAX_SHOWN - before(index), 0)),
    }))
    .filter(({ items }) => items.length > 0)
  const hidden = before(days.length) - MAX_SHOWN

  return (
    <>
      {shown.map(({ day, items }) => (
        <section
          key={day}
          aria-label={day === today ? pl.today.eventsToday : pl.today.eventsTomorrow}
        >
          <h3 className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {day === today ? pl.today.eventsToday : pl.today.eventsTomorrow}
          </h3>
          <ul>
            {items.map((item) => {
              const over = day === today && eventOverAt(item, now)
              return (
                <li key={item.key}>
                  <Link
                    to="/calendar/events/$eventId"
                    params={{ eventId: item.event.id }}
                    search={{ date: item.start }}
                    className={`flex min-h-11 items-center gap-3 py-2 text-sm ${over ? 'opacity-50' : ''}`}
                    data-over={over || undefined}
                  >
                    <span
                      aria-hidden
                      className={`size-2.5 shrink-0 rounded-full ${colorClassOf(item.event.color)}`}
                    />
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {eventTime(item)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {item.event.title}
                      {item.event.location && (
                        <span className="text-muted-foreground"> · {item.event.location}</span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <Link to="/calendar" className="mt-1 inline-block py-2 text-sm font-medium text-brand-text">
        {hidden > 0 ? pl.today.eventsMore(hidden) : pl.today.eventsCalendar}
      </Link>
    </>
  )
}
