import { format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { DayItems, TaskRow } from '@/modules/calendar/CalendarItems'
import {
  dayHeading,
  itemsByDay,
  overdueTasks,
  shiftDay,
  type CalendarSources,
} from '@/modules/calendar/days'
import type { CalendarSettings } from '@/modules/calendar/settings'
import { useCalendarView } from '@/modules/calendar/view'
import { dueLabel } from '@/modules/tasks/selectors'

const text = pl.calendar

/** Days added at a time, and how far ahead the agenda goes at most. */
const STEP_AHEAD = 60
const STEP_BACK = 30
const MAX_AHEAD = 730

const monthName = (date: string) => format(parseISO(date), 'LLLL yyyy', { locale: dateLocale })

/** Presses the button when it scrolls into view, so the list grows by itself. */
function useAutoPress(
  ref: React.RefObject<HTMLButtonElement | null>,
  enabled: boolean,
  // Watching again after each step: a button still in view after it grew presses again.
  step: string,
) {
  useEffect(() => {
    const button = ref.current
    if (!enabled || !button || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) button.click()
    })
    observer.observe(button)
    return () => observer.disconnect()
  }, [ref, enabled, step])
}

/** Day after day, only days with something on them (and today), with the overdue on top. */
export function AgendaView({
  sources,
  settings,
  today,
}: {
  sources: CalendarSources
  settings: CalendarSettings
  today: string
}) {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(() => shiftDay(today, STEP_AHEAD))
  const last = shiftDay(today, MAX_AHEAD)
  const todayRequests = useCalendarView((state) => state.todayRequests)
  const todayRef = useRef<HTMLElement>(null)
  const laterRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (todayRequests > 0) todayRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [todayRequests])

  const byDay = useMemo(
    () => itemsByDay(sources, settings, from, to),
    [sources, settings, from, to],
  )
  const overdue = useMemo(
    () => overdueTasks(sources.tasks, settings, today),
    [sources.tasks, settings, today],
  )
  const days = [...new Set([...byDay.keys(), today])].filter((day) => day >= from).sort()
  const atEnd = to >= last
  useAutoPress(laterRef, !atEnd, to)

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setFrom((day) => shiftDay(day, -STEP_BACK))}
      >
        {text.earlier}
      </Button>

      {days.map((day, index) => {
        const newMonth =
          day.slice(0, 7) !== (index === 0 ? today.slice(0, 7) : days[index - 1].slice(0, 7))
        const isToday = day === today

        return (
          <div key={day} className="flex flex-col gap-4">
            {newMonth && (
              <p className="flex items-center gap-3 text-xs font-semibold text-muted-foreground uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                {monthName(day)}
              </p>
            )}
            {isToday && overdue.length > 0 && (
              <details open className="rounded-lg">
                <summary className="mb-2 cursor-pointer text-sm font-semibold text-destructive">
                  {text.overdue} ({overdue.length})
                </summary>
                <ul className="flex flex-col gap-2">
                  {overdue.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      detail={dueLabel(task, today) ?? undefined}
                    />
                  ))}
                </ul>
              </details>
            )}
            <section
              ref={isToday ? todayRef : undefined}
              aria-label={dayHeading(day, today)}
              className="scroll-mt-[var(--app-bar,0px)]"
            >
              <h2
                className={`sticky top-[var(--app-bar,0px)] z-10 mb-2 bg-background py-1 text-sm font-semibold first-letter:uppercase ${isToday ? 'text-primary' : ''}`}
              >
                {dayHeading(day, today)}
              </h2>
              {byDay.get(day) ? (
                <DayItems items={byDay.get(day) ?? []} />
              ) : (
                <p className="px-3 text-sm text-muted-foreground">{text.nothingPlanned}</p>
              )}
            </section>
          </div>
        )
      })}

      {atEnd ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{text.noMore}</p>
      ) : (
        <Button
          ref={laterRef}
          type="button"
          variant="ghost"
          onClick={() =>
            setTo((day) => (shiftDay(day, STEP_AHEAD) < last ? shiftDay(day, STEP_AHEAD) : last))
          }
        >
          {text.later}
        </Button>
      )}
    </div>
  )
}
