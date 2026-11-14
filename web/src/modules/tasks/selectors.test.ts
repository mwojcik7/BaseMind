import { describe, expect, it } from 'vitest'
import { pl } from '@/i18n/pl'
import type { Task } from '@/modules/tasks/repo'
import {
  completedTasks,
  dayLabel,
  dueLabel,
  subtasksIn,
  taskContexts,
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
    parent_id: null,
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

describe('subtasks', () => {
  const parent = task({ id: 'parent', title: 'Remont łazienki' })
  const dated = task({ id: 's1', title: 'Kupić farbę', parent_id: 'parent', due_date: TODAY })
  const undated = task({ id: 's2', title: 'Wybrać kafelki', parent_id: 'parent' })
  const finished = task({ id: 's3', title: 'Zmierzyć', parent_id: 'parent', status: 'done' })
  // Its parent was deleted, e.g. on another device: it must not go missing.
  const orphan = task({ id: 'o', title: 'Sierota', parent_id: 'deleted-parent' })
  // Stored before subtasks existed: no parent_id at all.
  const legacy = { ...task({ id: 'l', title: 'Stare' }), parent_id: undefined } as unknown as Task
  const all = [parent, dated, undated, finished, orphan, legacy]

  it('lists only top-level tasks, keeping orphans and old records', () => {
    expect(titles(tasksInList(all, null, new Set()))).toEqual(
      expect.arrayContaining(['Remont łazienki', 'Sierota', 'Stare']),
    )
    expect(titles(tasksInList(all, null, new Set()))).toHaveLength(3)
  })

  it('shows a subtask in Today and Upcoming only with its own date', () => {
    expect(titles(todayTasks(all, TODAY).today)).toContain('Kupić farbę')
    const undatedTitles = upcomingTasks(all, TODAY).flatMap(({ tasks }) => titles(tasks))
    expect(undatedTitles).not.toContain('Wybrać kafelki')
    expect(undatedTitles).toEqual(expect.arrayContaining(['Remont łazienki', 'Sierota', 'Stare']))
  })

  it('gives a subtask its parent title and a parent its progress', () => {
    const contextOf = taskContexts(all)

    expect(contextOf(dated)).toEqual({ parentTitle: 'Remont łazienki', progress: undefined })
    expect(contextOf(parent)).toEqual({ parentTitle: undefined, progress: { done: 1, total: 3 } })
    expect(contextOf(orphan)).toEqual({ parentTitle: undefined, progress: undefined })
    expect(contextOf(legacy)).toEqual({ parentTitle: undefined, progress: undefined })
  })

  it('keeps subtasks in the order they were added', () => {
    expect(titles(subtasksIn(all, 'parent'))).toEqual(['Kupić farbę', 'Wybrać kafelki', 'Zmierzyć'])
  })
})
