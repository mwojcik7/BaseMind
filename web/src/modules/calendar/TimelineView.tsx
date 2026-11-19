import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  type EventItem,
} from '@/modules/calendar/days'
import { droppedEvent, droppedTask, snapMinutes, type Drop } from '@/modules/calendar/drag'
import type { Span } from '@/modules/calendar/form'
import {
  moveEvent,
  moveOccurrence,
  type SeriesScope,
  type Undo,
} from '@/modules/calendar/occurrence'
import { SeriesScopePrompt } from '@/modules/calendar/SeriesScopePrompt'
import type { CalendarSettings } from '@/modules/calendar/settings'
import { minutesOf, splitDay, type TimedBlock, type TimedItem } from '@/modules/calendar/timeline'
import { openDay, shiftSelected } from '@/modules/calendar/view'
import { requestCompleteTask } from '@/modules/tasks/completion'
import { reopenTask, rescheduleTask, type Task } from '@/modules/tasks/repo'

const text = pl.calendar

/** Height of an hour on the axis, in pixels. */
const HOUR = 48
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
/** Where a day other than today opens. */
const MORNING_HOUR = 7
const SWIPE_DISTANCE = 50
/** Holding a block this long picks it up on a touch screen. */
const HOLD_MS = 400
/** A finger moving further while held is scrolling, not picking up. */
const HOLD_SLOP = 8
/** A mouse drags as soon as it moves this far. */
const MOUSE_SLOP = 4
/** Near the top or bottom of the axis, a dragged block scrolls it. */
const EDGE = 40
const EDGE_SPEED = 8
/** A block needs this many minutes to show the handle for its length. */
const RESIZABLE_MINUTES = 30

function report(error: unknown) {
  toast.error(errorMessage(error))
}

function offerUndo(message: string, undo: Undo) {
  toast.success(message, {
    action: { label: pl.common.undo, onClick: () => void undo().catch(report) },
  })
}

/** Where a block is dragged to, as it is being drawn. */
interface Moving extends Drop {
  key: string
  /** Width of a day's column, for drawing a move to another day. */
  columnWidth: number
}

/** The times a dragged block reads while moving. */
function movingLabel(item: TimedItem, drop: Drop) {
  if (item.kind === 'task') {
    return droppedTask(item.task, drop)?.due_time ?? item.task.due_time
  }
  const span = droppedEvent(item, drop)
  return span ? `${span.start_time}–${span.end_time}` : eventTime(item)
}

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

/** Whether a block can be picked up: timed events, and tasks with a time still to do. */
const draggable = (item: TimedItem) => item.kind === 'event' || item.task.status === 'todo'

/** Whether the block's bottom edge is the event's end, so it can change the length. */
const resizable = ({ item, start, end }: TimedBlock) =>
  item.kind === 'event' && item.day === item.days && end - start >= RESIZABLE_MINUTES

function Block({
  block,
  moving,
  onPickUp,
  onClickCapture,
}: {
  block: TimedBlock
  /** Where it is being dragged, while it is. */
  moving: Moving | null
  onPickUp: (event: React.PointerEvent<HTMLElement>, block: TimedBlock) => void
  onClickCapture: (event: React.MouseEvent) => void
}) {
  const { item, start, end, column, columns } = block
  const grow = moving?.mode === 'resize' ? (moving.minutes / 60) * HOUR : 0
  const style: React.CSSProperties = {
    top: (start / 60) * HOUR,
    height: Math.max(((end - start) / 60) * HOUR - 2 + grow, HOUR / 4 - 2),
    left: `${(column / columns) * 100}%`,
    width: `${100 / columns}%`,
    ...(moving?.mode === 'move' && {
      transform: `translate(${moving.days * moving.columnWidth}px, ${(moving.minutes / 60) * HOUR}px)`,
    }),
  }
  // Room for a second line with the time.
  const tall = end - start >= 45
  const handlers = draggable(item)
    ? {
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => onPickUp(event, block),
        onClickCapture,
        // A long press would otherwise open the browser's menu for the link.
        onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
      }
    : {}
  const className = cn(
    'absolute overflow-hidden rounded-md border bg-card text-xs shadow-sm [-webkit-touch-callout:none]',
    moving && 'z-20 shadow-raised ring-2 ring-ring',
  )
  const label = moving && movingLabel(item, moving)

  if (item.kind === 'task') {
    return (
      <div style={style} className={cn(className, 'px-1')} {...handlers}>
        <TaskChip task={item.task} />
        {label && <span className="block truncate font-medium tabular-nums">{label}</span>}
      </div>
    )
  }

  return (
    <Link
      to="/calendar/events/$eventId"
      params={{ eventId: item.event.id }}
      search={{ date: item.start }}
      draggable={false}
      style={style}
      className={cn(className, 'flex')}
      {...handlers}
    >
      <span aria-hidden className={`w-1 shrink-0 ${colorClassOf(item.event.color)}`} />
      <span className="min-w-0 flex-1 px-1 py-0.5">
        <span className="block truncate font-medium">{item.event.title}</span>
        {(tall || label) && (
          <span
            className={cn(
              'block truncate tabular-nums',
              label ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {label || eventTime(item)}
          </span>
        )}
      </span>
      {resizable(block) && (
        <span
          aria-hidden
          data-resize
          className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-end justify-center pb-0.5"
        >
          <span className="h-0.5 w-6 rounded-full bg-muted-foreground/60" />
        </span>
      )}
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
  const [moving, setMoving] = useState<Moving | null>(null)
  const [asked, setAsked] = useState<{ item: EventItem; span: Span } | null>(null)
  const drag = useRef<{
    block: TimedBlock
    mode: Drop['mode']
    pointerId: number
    mouse: boolean
    startX: number
    startY: number
    startScroll: number
    x: number
    y: number
    columnWidth: number
    dayIndex: number
    lifted: boolean
    timer: number | undefined
    frame: number | undefined
    stop: () => void
  } | null>(null)
  const suppressClick = useRef(false)
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

  // Once a block is picked up, the finger moves it instead of scrolling the axis.
  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const hold = (event: TouchEvent) => {
      if (drag.current?.lifted) event.preventDefault()
    }
    element.addEventListener('touchmove', hold, { passive: false })
    return () => element.removeEventListener('touchmove', hold)
  }, [])

  // Leaving the view mid-drag ends the drag.
  useEffect(() => () => drag.current?.stop(), [])

  function dropOf(): Drop {
    const state = drag.current!
    const dy = state.y - state.startY + (scroller.current?.scrollTop ?? 0) - state.startScroll
    const moved = Math.round((state.x - state.startX) / state.columnWidth)
    return {
      mode: state.mode,
      minutes: snapMinutes((dy / HOUR) * 60),
      days:
        single || state.mode === 'resize'
          ? 0
          : Math.min(days.length - 1 - state.dayIndex, Math.max(-state.dayIndex, moved)),
    }
  }

  function redraw() {
    const state = drag.current
    if (!state?.lifted) return
    const drop = dropOf()
    setMoving((current) =>
      current &&
      current.minutes === drop.minutes &&
      current.days === drop.days &&
      current.key === state.block.item.key
        ? current
        : { ...drop, key: state.block.item.key, columnWidth: state.columnWidth },
    )
  }

  /** Scrolls the axis while the block is held near its top or bottom. */
  function scrollNearEdges() {
    const state = drag.current
    const element = scroller.current
    if (!state?.lifted || !element) return
    const box = element.getBoundingClientRect()
    // Only towards where the block is going: one picked up near an edge stays put.
    if (state.y < box.top + EDGE && state.y < state.startY) element.scrollTop -= EDGE_SPEED
    else if (state.y > box.bottom - EDGE && state.y > state.startY) {
      element.scrollTop += EDGE_SPEED
    }
    redraw()
    state.frame = requestAnimationFrame(scrollNearEdges)
  }

  function lift() {
    const state = drag.current
    if (!state) return
    state.lifted = true
    if (!state.mouse) navigator.vibrate?.(15)
    redraw()
    state.frame = requestAnimationFrame(scrollNearEdges)
  }

  function pickUp(event: React.PointerEvent<HTMLElement>, block: TimedBlock) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    drag.current?.stop()
    const section = event.currentTarget.closest('section')
    const resize = (event.target as HTMLElement).closest('[data-resize]') !== null
    if (resize && !resizable(block)) return

    const onMove = (move: PointerEvent) => {
      const state = drag.current
      if (!state || move.pointerId !== state.pointerId) return
      state.x = move.clientX
      state.y = move.clientY
      if (state.lifted) return redraw()
      const distance = Math.hypot(state.x - state.startX, state.y - state.startY)
      if (state.mouse && distance > MOUSE_SLOP) lift()
      // Moving before the hold is up: the finger is scrolling or swiping.
      else if (!state.mouse && distance > HOLD_SLOP) state.stop()
    }
    const onUp = (up: PointerEvent) => {
      const state = drag.current
      if (!state || up.pointerId !== state.pointerId) return
      const drop = state.lifted ? dropOf() : null
      state.stop()
      if (drop) {
        // The click that follows a drag must not open the block.
        suppressClick.current = true
        window.setTimeout(() => (suppressClick.current = false), 300)
        void place(block.item, drop)
      }
    }
    const onCancel = (cancel: PointerEvent) => {
      if (drag.current && cancel.pointerId === drag.current.pointerId) drag.current.stop()
    }
    const stop = () => {
      const state = drag.current
      if (!state) return
      window.clearTimeout(state.timer)
      if (state.frame !== undefined) cancelAnimationFrame(state.frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      drag.current = null
      setMoving(null)
    }

    drag.current = {
      block,
      mode: resize ? 'resize' : 'move',
      pointerId: event.pointerId,
      mouse: event.pointerType === 'mouse',
      startX: event.clientX,
      startY: event.clientY,
      startScroll: scroller.current?.scrollTop ?? 0,
      x: event.clientX,
      y: event.clientY,
      columnWidth: section?.getBoundingClientRect().width || 1,
      dayIndex: Math.max(0, days.indexOf(section?.dataset.day ?? first)),
      lifted: false,
      timer: event.pointerType === 'mouse' ? undefined : window.setTimeout(lift, HOLD_MS),
      frame: undefined,
      stop,
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  function swallowClickAfterDrag(event: React.MouseEvent) {
    if (suppressClick.current) {
      suppressClick.current = false
      event.preventDefault()
      event.stopPropagation()
    }
  }

  /** Saves where a block was dropped; a series asks which of its occurrences move. */
  async function place(item: TimedItem, drop: Drop) {
    try {
      if (item.kind === 'task') {
        const term = droppedTask(item.task, drop)
        if (!term) return
        const before = { due_date: item.task.due_date!, due_time: item.task.due_time }
        await rescheduleTask(item.task.id, term)
        offerUndo(text.taskMoved, () => rescheduleTask(item.task.id, before))
        return
      }
      const span = droppedEvent(item, drop)
      if (!span) return
      if (item.event.rrule) {
        setAsked({ item, span })
        return
      }
      offerUndo(text.moved, await moveEvent(item.event, span))
    } catch (error) {
      report(error)
    }
  }

  async function answer(scope: SeriesScope) {
    if (!asked) return
    const { item, span } = asked
    setAsked(null)
    try {
      offerUndo(text.moved, await moveOccurrence(scope, item.event, item.start, span))
    } catch (error) {
      report(error)
    }
  }

  function swipe(event: React.PointerEvent) {
    const start = touch.current
    touch.current = null
    // A block dragged sideways moves to another day; it doesn't turn the page.
    if (!start || drag.current?.lifted) return
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
                data-day={day}
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
                    <Block
                      key={block.item.key}
                      block={block}
                      moving={moving?.key === block.item.key ? moving : null}
                      onPickUp={pickUp}
                      onClickCapture={swallowClickAfterDrag}
                    />
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
      <SeriesScopePrompt
        action={asked ? 'save' : null}
        date={asked?.item.start ?? first}
        scopes={['this', 'following', 'all']}
        onChoose={(scope) => void answer(scope)}
        onCancel={() => setAsked(null)}
      />
    </div>
  )
}
