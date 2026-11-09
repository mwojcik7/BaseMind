import { describe, expect, it } from 'vitest'
import { pl } from '@/i18n/pl'
import type { Task } from '@/modules/tasks/repo'
import {
  completedTasks,
  dayLabel,
  dueLabel,
  tasksInList,
  todayTasks,
  upcomingTasks,
} from '@/modules/tasks/selectors'

const TODAY = '2026-11-09'

let nextId = 0

function task(fields: Partial<Task>): Task {
  return {
    id: `id-${nextId++}`,
    space_id: 'space',
    created_by: 1,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    rev: null,
    version: 1,
    list_id: null,
    title: 'Zadanie',
    notes: null,
    priority: 4,
    status: 'todo',
    due_date: null,
    due_time: null,
    completed_at: null,
    ...fields,
  }
}

const titles = (tasks: Task[]) => tasks.map((item) => item.title)

describe('todayTasks', () => {
  it('splits overdue from today and leaves out the rest', () => {
    const result = todayTasks(
      [
        task({ title: 'wczoraj', due_date: '2026-11-08' }),
        task({ title: 'dziś', due_date: TODAY }),
        task({ title: 'jutro', due_date: '2026-11-10' }),
        task({ title: 'bez daty' }),
        task({ title: 'zrobione', due_date: TODAY, status: 'done' }),
      ],
      TODAY,
    )

    expect(titles(result.overdue)).toEqual(['wczoraj'])
    expect(titles(result.today)).toEqual(['dziś'])
  })

  it('sorts by priority, then time, with untimed tasks after timed ones', () => {
    const { today } = todayTasks(
      [
        task({ title: 'P4', due_date: TODAY }),
        task({ title: 'P1 bez godziny', due_date: TODAY, priority: 1 }),
        task({ title: 'P1 późno', due_date: TODAY, priority: 1, due_time: '18:00' }),
        task({ title: 'P1 rano', due_date: TODAY, priority: 1, due_time: '08:00' }),
      ],
      TODAY,
    )

    expect(titles(today)).toEqual(['P1 rano', 'P1 późno', 'P1 bez godziny', 'P4'])
  })
})

describe('upcomingTasks', () => {
  it('groups by day, soonest first, with undated tasks last', () => {
    const groups = upcomingTasks(
      [
        task({ title: 'bez daty' }),
        task({ title: 'za tydzień', due_date: '2026-11-16' }),
        task({ title: 'jutro', due_date: '2026-11-10' }),
        task({ title: 'dziś', due_date: TODAY }),
      ],
      TODAY,
    )

    expect(groups.map((group) => group.date)).toEqual(['2026-11-10', '2026-11-16', null])
  })
})

describe('completedTasks', () => {
  it('shows the most recent first and only finished tasks', () => {
    const result = completedTasks([
      task({ title: 'starsze', status: 'done', completed_at: '2026-11-01T10:00:00Z' }),
      task({ title: 'nowsze', status: 'done', completed_at: '2026-11-09T10:00:00Z' }),
      task({ title: 'otwarte' }),
    ])

    expect(titles(result)).toEqual(['nowsze', 'starsze'])
  })
})

describe('tasksInList', () => {
  const all = [
    task({ title: 'w skrzynce' }),
    task({ title: 'w liście', list_id: 'dom' }),
    task({ title: 'po usuniętej liście', list_id: 'stara' }),
    task({ title: 'zrobione', list_id: 'dom', status: 'done' }),
  ]

  it('shows open tasks of the list', () => {
    expect(titles(tasksInList(all, 'dom', new Set(['dom'])))).toEqual(['w liście'])
  })

  it('takes tasks of a deleted list into the inbox', () => {
    expect(titles(tasksInList(all, null, new Set(['dom'])))).toEqual([
      'w skrzynce',
      'po usuniętej liście',
    ])
  })
})

describe('labels', () => {
  it('names today and tomorrow, and spells out other days', () => {
    expect(dayLabel(TODAY, TODAY)).toBe(pl.tasks.today)
    expect(dayLabel('2026-11-10', TODAY)).toBe(pl.tasks.tomorrow)
    expect(dayLabel('2026-11-13', TODAY)).toBe('piątek, 13 listopada')
  })

  it('adds the time when there is one', () => {
    expect(dueLabel(task({ due_date: TODAY, due_time: '14:30' }), TODAY)).toBe(
      `${pl.tasks.today}, 14:30`,
    )
    expect(dueLabel(task({}), TODAY)).toBeNull()
  })
})
