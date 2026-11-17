import { describe, expect, it } from 'vitest'
import { itemsByDay } from '@/modules/calendar/days'
import type { CalendarEvent } from '@/modules/calendar/repo'
import { DEFAULT_CALENDAR_SETTINGS } from '@/modules/calendar/settings'
import { splitDay, weekDays } from '@/modules/calendar/timeline'
import type { Task } from '@/modules/tasks/repo'

const common = {
  space_id: 's',
  created_by: 1,
  created_at: '',
  updated_at: '',
  deleted_at: null,
  version: 1,
}

const event = (id: string, fields: Partial<CalendarEvent> = {}): CalendarEvent =>
  ({
    ...common,
    id,
    title: id,
    location: null,
    description: null,
    start_date: '2026-12-07',
    start_time: '09:00',
    end_date: '2026-12-07',
    end_time: '10:00',
    rrule: null,
    exdates: null,
    color: null,
    ...fields,
  }) as CalendarEvent

const task = (id: string, fields: Partial<Task> = {}): Task =>
  ({
    ...common,
    id,
    list_id: null,
    parent_id: null,
    title: id,
    notes: null,
    priority: 4,
    status: 'todo',
    due_date: '2026-12-07',
    due_time: null,
    completed_at: null,
    ...fields,
  }) as Task

function day(events: CalendarEvent[], tasks: Task[] = [], date = '2026-12-07') {
  const items = itemsByDay({ events, tasks }, DEFAULT_CALENDAR_SETTINGS, date, date).get(date) ?? []
  return splitDay(items)
}

const placed = (blocks: ReturnType<typeof splitDay>['timed']) =>
  Object.fromEntries(
    blocks.map(({ item, start, end, column, columns }) => [
      item.kind === 'event' ? item.event.id : item.task.id,
      [start, end, column, columns],
    ]),
  )

describe('timeline', () => {
  it('puts all-day items in the strip and the rest on the axis', () => {
    const { allDay, timed } = day(
      [event('meeting'), event('trip', { start_time: null, end_time: null })],
      [task('call', { due_time: '12:00' }), task('shop')],
    )

    expect(allDay.map((item) => item.key)).toEqual(['trip:2026-12-07', 'shop'])
    expect(placed(timed)).toEqual({ meeting: [540, 600, 0, 1], call: [720, 750, 0, 1] })
  })

  it('places overlapping blocks side by side, and only those', () => {
    const { timed } = day([
      event('a', { start_time: '09:00', end_time: '11:00' }),
      event('b', { start_time: '09:30', end_time: '10:00' }),
      event('c', { start_time: '10:00', end_time: '10:30' }),
      event('d', { start_time: '12:00', end_time: '13:00' }),
    ])

    expect(placed(timed)).toEqual({
      a: [540, 660, 0, 2],
      b: [570, 600, 1, 2],
      // Starts as b ends, so it takes b's column.
      c: [600, 630, 1, 2],
      d: [720, 780, 0, 1],
    })
  })

  it('draws a short event tall enough to tap', () => {
    const { timed } = day([event('quick', { start_time: '09:00', end_time: '09:05' })])
    expect(placed(timed).quick).toEqual([540, 560, 0, 1])
  })

  it('runs a long timed event to midnight, across whole days, and from midnight', () => {
    const long = event('long', {
      start_date: '2026-12-06',
      end_date: '2026-12-08',
      start_time: '18:00',
      end_time: '12:00',
    })
    const late = event('late', {
      start_date: '2026-12-07',
      end_date: '2026-12-08',
      start_time: '23:00',
      end_time: '00:00',
    })

    expect(placed(day([long], [], '2026-12-06').timed).long).toEqual([1080, 1440, 0, 1])
    expect(day([long]).allDay.map((item) => item.key)).toEqual(['long:2026-12-06'])
    expect(placed(day([long], [], '2026-12-08').timed).long).toEqual([0, 720, 0, 1])
    expect(placed(day([late]).timed).late).toEqual([1380, 1440, 0, 1])
  })

  it('shows three days from the day on a phone and the whole week on a wide screen', () => {
    expect(weekDays('2026-12-09', false)).toEqual(['2026-12-09', '2026-12-10', '2026-12-11'])
    expect(weekDays('2026-12-09', true)).toEqual([
      '2026-12-07',
      '2026-12-08',
      '2026-12-09',
      '2026-12-10',
      '2026-12-11',
      '2026-12-12',
      '2026-12-13',
    ])
  })
})
