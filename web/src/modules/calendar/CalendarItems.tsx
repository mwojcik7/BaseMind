import { Link } from '@tanstack/react-router'
import { Flag, Repeat } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { colorClassOf } from '@/modules/calendar/colors'
import type { CalendarItem } from '@/modules/calendar/days'
import { requestCompleteTask } from '@/modules/tasks/completion'
import { reopenTask, type Task } from '@/modules/tasks/repo'

const text = pl.calendar

type EventItem = Extract<CalendarItem, { kind: 'event' }>

/** The times as they read on this day of the event. */
function eventTime({ event, day, days }: EventItem) {
  let time: string
  if (days === 1) {
    time = event.start_time ? `${event.start_time}–${event.end_time}` : text.allDayShort
  } else if (day === 1 && event.start_time) {
    time = text.from(event.start_time)
  } else if (day === days && event.end_time) {
    time = text.until(event.end_time)
  } else {
    time = text.allDayShort
  }
  return days > 1 ? `${time} (${text.dayOf(day, days)})` : time
}

function EventRow({ item }: { item: EventItem }) {
  const { event, start } = item

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
            {[eventTime(item), event.location].filter(Boolean).join(' · ')}
          </span>
        </span>
        {event.rrule && (
          <Repeat aria-label={text.series} className="size-4 shrink-0 text-muted-foreground" />
        )}
      </Link>
    </li>
  )
}

/** `detail` replaces the time, e.g. with the date of an overdue task. */
export function TaskRow({ task, detail }: { task: Task; detail?: string }) {
  const done = task.status !== 'todo'
  const line = detail ?? task.due_time

  return (
    <li className="flex min-h-14 items-center gap-3 rounded-lg bg-card px-3 py-2">
      <Checkbox
        aria-label={done ? pl.tasks.reopen(task.title) : pl.tasks.complete(task.title)}
        checked={done}
        onCheckedChange={() =>
          void (done ? reopenTask(task.id) : requestCompleteTask(task, { undo: true })).catch(
            (error: unknown) => toast.error(errorMessage(error)),
          )
        }
      />
      <Link
        to="/tasks/$taskId"
        params={{ taskId: task.id }}
        className="min-w-0 flex-1 self-stretch content-center"
      >
        <span
          className={`block truncate ${done ? 'text-muted-foreground line-through' : 'font-medium'}`}
        >
          {task.title}
        </span>
        {line && (
          <span
            className={`block truncate text-sm ${detail ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {line}
          </span>
        )}
      </Link>
    </li>
  )
}

function HolidayRow({ name }: { name: string }) {
  return (
    <li className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-destructive">
      <Flag aria-hidden className="size-4" />
      <span>
        <span className="sr-only">{text.holiday}: </span>
        {name}
      </span>
    </li>
  )
}

export function DayItems({ items }: { items: readonly CalendarItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        if (item.kind === 'holiday') return <HolidayRow key={item.key} name={item.name} />
        if (item.kind === 'event') return <EventRow key={item.key} item={item} />
        return <TaskRow key={item.key} task={item.task} />
      })}
    </ul>
  )
}
