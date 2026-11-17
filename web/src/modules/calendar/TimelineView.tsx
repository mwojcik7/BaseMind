import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { useTimeNow } from '@/lib/use-today'
import { colorClassOf } from '@/modules/calendar/colors'
import {
  dayHeading,
  eventTime,
  itemsByDay,
  type CalendarItem,
  type CalendarSources,
} from '@/modules/calendar/days'
import type { CalendarSettings } from '@/modules/calendar/settings'
import { minutesOf, splitDay, type TimedBlock } from '@/modules/calendar/timeline'
import { openDay, shiftSelected } from '@/modules/calendar/view'
import { requestCompleteTask } from '@/modules/tasks/completion'
import { reopenTask, type Task } from '@/modules/tasks/repo'

const text = pl.calendar

/** Height of an hour on the axis, in pixels. */
const HOUR = 48
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
/** Where a day other than today opens. */
const MORNING_HOUR = 7
const SWIPE_DISTANCE = 50

const shortDay = (date: string) => format(parseISO(date), 'EEEEEE d', { locale: dateLocale })
const longDay = (date: string) => format(parseISO(date), 'd MMMM', { locale: dateLocale })

function toggleTask(task: Task) {
  const done = task.status !== 'todo'
  void (done ? reopenTask(task.id) : requestCompleteTask(task, { undo: true })).catch(
    (error: unknown) => toast.error(errorMessage(error)),
  )
}

/** A task's checkbox and title; used in the strip and on the axis. */
function TaskChip({ task }: { task: Task }) {
  const done = task.status !== 'todo'
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Checkbox
        aria-label={done ? pl.tasks.reopen(task.title) : pl.tasks.complete(task.title)}
        checked={done}
        // A clear frame: on a small block a faint one reads as decoration, not a box to tick.
        className="size-[18px] shrink-0 border-2 border-muted-foreground bg-background"
        onCheckedChange={() => toggleTask(task)}
      />
      <Link
        to="/tasks/$taskId"
        params={{ taskId: task.id }}
        className={cn('min-w-0 flex-1 truncate', done && 'text-muted-foreground line-through')}
      >
        {task.title}
      </Link>
    </span>
  )
}

function StripItem({ item }: { item: CalendarItem }) {
  if (item.kind === 'holiday') {
    return (
      <li className="flex items-center gap-1 truncate px-1 text-xs font-medium text-destructive">
        <Flag aria-hidden className="size-3 shrink-0" />
        <span className="sr-only">{text.holiday}: </span>
        <span className="truncate">{item.name}</span>
      </li>
    )
  }
  if (item.kind === 'task') {
    return (
      <li className="rounded-md bg-card px-1 py-0.5 text-xs">
        <TaskChip task={item.task} />
      </li>
    )
  }
  return (
    <li>
      <Link
        to="/calendar/events/$eventId"
        params={{ eventId: item.event.id }}
        search={{ date: item.start }}
        className="flex items-center gap-1 overflow-hidden rounded-md bg-card py-0.5 pr-1 text-xs"
      >
        <span
          aria-hidden
          className={`h-4 w-1 shrink-0 rounded-full ${colorClassOf(item.event.color)}`}
        />
        <span className="truncate font-medium">{item.event.title}</span>
        {item.days > 1 && (
          <span className="shrink-0 text-muted-foreground">{text.dayOf(item.day, item.days)}</span>
        )}
      </Link>
    </li>
  )
}

function Block({ block }: { block: TimedBlock }) {
  const { item, start, end, column, columns } = block
  const style = {
    top: (start / 60) * HOUR,
    height: ((end - start) / 60) * HOUR - 2,
    left: `${(column / columns) * 100}%`,
    width: `${100 / columns}%`,
  }
  // Room for a second line with the time.
  const tall = end - start >= 45

  if (item.kind === 'task') {
    return (
      <div
        style={style}
        className="absolute overflow-hidden rounded-md border bg-card px-1 text-xs shadow-sm"
      >
        <TaskChip task={item.task} />
      </div>
    )
  }

  return (
    <Link
      to="/calendar/events/$eventId"
      params={{ eventId: item.event.id }}
      search={{ date: item.start }}
      style={style}
      className="absolute flex overflow-hidden rounded-md border bg-card text-xs shadow-sm"
    >
      <span aria-hidden className={`w-1 shrink-0 ${colorClassOf(item.event.color)}`} />
      <span className="min-w-0 flex-1 px-1 py-0.5">
        <span className="block truncate font-medium">{item.event.title}</span>
        {tall && <span className="block truncate text-muted-foreground">{eventTime(item)}</span>}
      </span>
    </Link>
  )
}

/**
 * Days on an hour axis: one in the Day view, three or seven in the Week view. All-day
 * items sit in a strip above; tapping an empty hour starts a new event there.
 */
export function TimelineView({
  sources,
  settings,
  today,
  days,
  step,
}: {
  sources: CalendarSources
  settings: CalendarSettings
  today: string
  /** The days shown, in order. */
  days: readonly string[]
  /** How far the arrows and a swipe move, in days. */
  step: number
}) {
  const navigate = useNavigate()
  const now = useTimeNow()
  const first = days[0]
  const last = days[days.length - 1]
  const byDay = useMemo(
    () => itemsByDay(sources, settings, first, last),
    [sources, settings, first, last],
  )
  const split = useMemo(
    () => new Map(days.map((day) => [day, splitDay(byDay.get(day) ?? [])])),
    [days, byDay],
  )
  const hasStrip = days.some((day) => (split.get(day)?.allDay.length ?? 0) > 0)
  const scroller = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const showsToday = days.includes(today)
  const single = days.length === 1
  const title = single
    ? dayHeading(first, today)
    : `${longDay(first)} – ${longDay(last)} ${last.slice(0, 4)}`

  // Opens at the current hour on today, else in the morning; again after moving to other days.
  useEffect(() => {
    const hour = showsToday ? Math.max(0, minutesOf(now) / 60 - 1) : MORNING_HOUR
    // A little above the hour, so its label is not cut off.
    scroller.current?.scrollTo({ top: Math.max(0, hour * HOUR - 12) })
    // Only when the days change, not every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, showsToday])

  function swipe(event: React.PointerEvent) {
    const start = touch.current
    touch.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      shiftSelected(first, dx < 0 ? step : -step)
    }
  }

  function newEventAt(day: string, event: React.MouseEvent<HTMLDivElement>) {
    // Only the empty column itself: blocks and their checkboxes handle their own taps.
    if (event.target !== event.currentTarget) return
    const offset = event.clientY - event.currentTarget.getBoundingClientRect().top
    const hour = Math.min(23, Math.max(0, Math.floor(offset / HOUR)))
    void navigate({
      to: '/calendar/new',
      search: { date: day, time: `${String(hour).padStart(2, '0')}:00` },
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={single ? text.previousDay : text.previousDays}
          onClick={() => shiftSelected(first, -step)}
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
          aria-label={single ? text.nextDay : text.nextDays}
          onClick={() => shiftSelected(first, step)}
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
        {!single && (
          <div className="flex pl-10">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                aria-current={day === today ? 'date' : undefined}
                aria-label={dayHeading(day, today)}
                onClick={() => openDay(day)}
                className={cn(
                  'flex-1 truncate rounded-md py-1 text-center text-xs first-letter:uppercase',
                  day === today ? 'font-semibold text-brand-text' : 'text-muted-foreground',
                )}
              >
                {shortDay(day)}
              </button>
            ))}
          </div>
        )}

        {hasStrip && (
          <div className="flex border-b pb-1 pl-10" role="group" aria-label={text.allDay}>
            {days.map((day) => (
              <ul key={day} className="flex min-w-0 flex-1 flex-col gap-0.5 px-0.5">
                {split.get(day)?.allDay.map((item) => (
                  <StripItem key={item.key} item={item} />
                ))}
              </ul>
            ))}
          </div>
        )}

        {/* A scroll container of its own: without pan-y here the browser takes a sideways
            swipe on the axis for itself and cancels it, so it never turns the day. */}
        <div ref={scroller} className="h-[60dvh] min-h-80 touch-pan-y overflow-y-auto">
          <div className="relative flex" style={{ height: 24 * HOUR }}>
            <div aria-hidden className="w-10 shrink-0">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ height: HOUR }}
                  className="-translate-y-2 pr-1 text-right text-[0.65rem] text-muted-foreground tabular-nums"
                >
                  {hour > 0 && `${hour}:00`}
                </div>
              ))}
            </div>
            {days.map((day) => (
              <section
                key={day}
                aria-label={dayHeading(day, today)}
                className="relative min-w-0 flex-1 border-l"
              >
                {/* Hour lines; the column under them takes the taps on empty hours. */}
                <div
                  data-testid={`hours-${day}`}
                  className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)]"
                  style={{ backgroundSize: `100% ${HOUR}px` }}
                  onClick={(event) => newEventAt(day, event)}
                />
                <div className="pointer-events-none absolute inset-0 *:pointer-events-auto">
                  {split.get(day)?.timed.map((block) => (
                    <Block key={block.item.key} block={block} />
                  ))}
                </div>
                {day === today && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 h-0.5 bg-destructive"
                    style={{ top: (minutesOf(now) / 60) * HOUR }}
                  />
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
