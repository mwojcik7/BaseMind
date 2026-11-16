import { describe, expect, it } from 'vitest'
import {
  daysBetween,
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
})
