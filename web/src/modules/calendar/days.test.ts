import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  eventOverAt,
  eventsAhead,
  eventTime,
  itemsByDay,
  monthGrid,
  overdueTasks,
  shiftMonth,
  type CalendarItem,
} from '@/modules/calendar/days'
import type { CalendarEvent } from '@/modules/calendar/repo'
import { DEFAULT_CALENDAR_SETTINGS, type CalendarSettings } from '@/modules/calendar/settings'
import type { Task } from '@/modules/tasks/repo'

const common = {
  space_id: 's',
  created_by: 1,
  created_at: '',
  updated_at: '',
  deleted_at: null,
  version: 1,
}

function event(id: string, fields: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    ...common,
    id,
    title: id,
    location: null,
    description: null,
    start_date: '2026-11-16',
    start_time: '09:00',
    end_date: '2026-11-16',
    end_time: '10:00',
    rrule: null,
    exdates: null,
    color: null,
    ...fields,
  } as CalendarEvent
}

function task(id: string, fields: Partial<Task> = {}): Task {
  return {
    ...common,
    id,
    list_id: null,
    parent_id: null,
    title: id,
    notes: null,
    priority: 4,
    status: 'todo',
    due_date: '2026-11-16',
    due_time: null,
    completed_at: null,
    ...fields,
  } as Task
}

const keys = (items: CalendarItem[] | undefined) => (items ?? []).map((item) => item.key)
const settings = (fields: Partial<CalendarSettings> = {}) => ({
  ...DEFAULT_CALENDAR_SETTINGS,
  ...fields,
})

describe('calendar days', () => {
  it('orders a day: holiday, all-day, by time, tasks without a time last', () => {
    const days = itemsByDay(
      {
        events: [
          event('meeting', {
            start_date: '2026-11-11',
            end_date: '2026-11-11',
            start_time: '12:00',
          }),
          event('trip', {
            start_date: '2026-11-11',
            end_date: '2026-11-11',
            start_time: null,
            end_time: null,
          }),
        ],
        tasks: [
          task('call', { due_date: '2026-11-11', due_time: '08:00' }),
          task('shop', { due_date: '2026-11-11' }),
        ],
      },
      settings(),
      '2026-11-11',
      '2026-11-11',
    )

    expect(keys(days.get('2026-11-11'))).toEqual([
      '2026-11-11',
      'trip:2026-11-11',
      'call',
      'meeting:2026-11-11',
      'shop',
    ])
  })

  it('shows a long event on each of its days, and only days with something', () => {
    const days = itemsByDay(
      {
        events: [
          event('leave', {
            start_date: '2026-11-15',
            end_date: '2026-11-17',
            start_time: null,
            end_time: null,
          }),
        ],
        tasks: [],
      },
      settings({ hidden_layers: ['holidays'] }),
      '2026-11-16',
      '2026-11-20',
    )

    expect([...days.keys()]).toEqual(['2026-11-16', '2026-11-17'])
    expect(days.get('2026-11-16')?.[0]).toMatchObject({ start: '2026-11-15', day: 2, days: 3 })
  })

  it('repeats a series and leaves out a skipped occurrence', () => {
    const days = itemsByDay(
      {
        events: [event('gym', { rrule: 'FREQ=WEEKLY', exdates: ['2026-11-23'] })],
        tasks: [],
      },
      settings(),
      '2026-11-16',
      '2026-12-01',
    )

    expect([...days.keys()]).toEqual(['2026-11-16', '2026-11-30'])
  })

  it('hides layers and done tasks unless asked', () => {
    const sources = {
      events: [event('meeting')],
      tasks: [
        task('open'),
        task('done', { status: 'done' }),
        task('skip', { status: 'cancelled' }),
      ],
    }

    expect(
      keys(itemsByDay(sources, settings(), '2026-11-16', '2026-11-16').get('2026-11-16')),
    ).toEqual(['meeting:2026-11-16', 'open'])
    expect(
      keys(
        itemsByDay(
          sources,
          settings({ show_done: true, hidden_layers: ['events'] }),
          '2026-11-16',
          '2026-11-16',
        ).get('2026-11-16'),
      ),
    ).toEqual(['done', 'open'])
  })

  it('lists overdue open tasks, oldest first', () => {
    const tasks = [
      task('late', { due_date: '2026-11-14' }),
      task('later', { due_date: '2026-11-10' }),
      task('today'),
      task('done', { due_date: '2026-11-01', status: 'done' }),
    ]

    expect(overdueTasks(tasks, settings(), '2026-11-16').map((item) => item.id)).toEqual([
      'later',
      'late',
    ])
    expect(overdueTasks(tasks, settings({ hidden_layers: ['tasks'] }), '2026-11-16')).toEqual([])
  })

  it('lays out a month in whole weeks from Monday', () => {
    const weeks = monthGrid('2026-11')

    expect(weeks).toHaveLength(6)
    expect(weeks[0][0]).toBe('2026-10-26')
    expect(weeks[0][6]).toBe('2026-11-01')
    expect(weeks[5][6]).toBe('2026-12-06')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(daysBetween('2026-12-30', '2027-01-02')).toHaveLength(4)
  })

  it('gives the widget the events of today and tomorrow, whatever the layers', () => {
    const days = eventsAhead(
      [
        event('today', { start_date: '2026-11-16', end_date: '2026-11-16' }),
        event('tomorrow', {
          start_date: '2026-11-17',
          end_date: '2026-11-17',
          start_time: null,
          end_time: null,
        }),
        event('later', { start_date: '2026-11-18', end_date: '2026-11-18' }),
        event('weekly', { start_date: '2026-11-03', end_date: '2026-11-03', rrule: 'FREQ=WEEKLY' }),
      ],
      '2026-11-16',
    )

    expect(days.map(({ day, items }) => [day, keys(items)])).toEqual([
      ['2026-11-16', ['today:2026-11-16']],
      ['2026-11-17', ['tomorrow:2026-11-17', 'weekly:2026-11-17']],
    ])
    expect(eventsAhead([], '2026-11-16')).toEqual([])
  })

  it('tells when an event is over and how its time reads on each day', () => {
    const [today] = eventsAhead(
      [
        event('short', { start_time: '09:00', end_time: '10:00' }),
        event('long', {
          start_date: '2026-11-15',
          end_date: '2026-11-17',
          start_time: '18:00',
          end_time: '12:00',
        }),
        event('allDay', { start_time: null, end_time: null }),
      ],
      '2026-11-16',
    ).map(({ items }) => items)
    const byId = (id: string) => today.find((item) => item.event.id === id)!

    expect(eventOverAt(byId('short'), '09:59')).toBe(false)
    expect(eventOverAt(byId('short'), '10:00')).toBe(true)
    // An inner day of a long event and an all-day one last until midnight.
    expect(eventOverAt(byId('long'), '23:59')).toBe(false)
    expect(eventOverAt(byId('allDay'), '23:59')).toBe(false)
    expect(eventTime(byId('short'))).toBe('09:00–10:00')
    expect(eventTime(byId('long'))).toBe('cały dzień (dzień 2/3)')
  })

  it('does not show an event ending at midnight on the next day', () => {
    const late = event('late', {
      start_date: '2026-11-16',
      end_date: '2026-11-17',
      start_time: '23:00',
      end_time: '00:00',
    })
    const long = event('long', {
      start_date: '2026-11-15',
      end_date: '2026-11-17',
      start_time: '18:00',
      end_time: '00:00',
    })
    const days = itemsByDay(
      { events: [late, long], tasks: [] },
      settings(),
      '2026-11-15',
      '2026-11-17',
    )

    expect(keys(days.get('2026-11-16'))).toEqual(['long:2026-11-15', 'late:2026-11-16'])
    expect(days.get('2026-11-17')).toBeUndefined()
    const [, today] = eventsAhead([late, long], '2026-11-15').map(({ items }) => items)
    const byId = (id: string) => today.find((item) => item.event.id === id)!
    expect(eventTime(byId('late'))).toBe('23:00–00:00')
    expect(eventTime(byId('long'))).toBe('do 24:00 (dzień 2/2)')
    // Lasts until midnight, so it is never over during its day.
    expect(eventOverAt(byId('late'), '23:59')).toBe(false)
  })
})
