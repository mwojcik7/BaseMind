import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/db'
import { useAuth, type Account } from '@/lib/auth'
import { findTaskReminder } from '@/modules/tasks/reminder'
import cases from '@/modules/tasks/recurrence.cases.json'
import {
  describeRecurrence,
  firstDueDate,
  fromRrule,
  isValidRule,
  nextDueDate,
  toRrule,
  weekdayOf,
  weekdayPositionsOf,
  type RepeatFrom,
} from '@/modules/tasks/recurrence'
import {
  createTask,
  finishOccurrence,
  moveTask,
  subtasksOf,
  tasks,
  undoOccurrence,
  type Task,
} from '@/modules/tasks/repo'

describe('next due date (same cases as the server)', () => {
  it.each(cases)('$name', (c) => {
    expect(nextDueDate(c.rrule, c.from as RepeatFrom, c.anchor, c.remaining, c.today)).toBe(c.next)
  })
})

describe('recurrence rules', () => {
  it('finds where a new series starts', () => {
    expect(firstDueDate('FREQ=DAILY', '2026-11-14')).toBe('2026-11-14')
    expect(firstDueDate('FREQ=WEEKLY;BYDAY=MO', '2026-11-14')).toBe('2026-11-16')
    expect(firstDueDate('FREQ=MONTHLY;BYMONTHDAY=10', '2026-11-14')).toBe('2026-12-10')
  })

  it.each([
    'FREQ=DAILY',
    'FREQ=DAILY;INTERVAL=3',
    'FREQ=WEEKLY;BYDAY=MO,TH',
    'FREQ=WEEKLY;INTERVAL=2;BYDAY=SA;UNTIL=20271231',
    'FREQ=MONTHLY;BYMONTHDAY=-1',
    'FREQ=MONTHLY;BYDAY=-1FR',
    'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=15',
    'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=1',
  ])('reads and writes %s unchanged', (rule) => {
    const spec = fromRrule(rule)
    expect(spec).not.toBeNull()
    expect(toRrule(spec!)).toBe(rule)
  })

  it('leaves rules it cannot edit alone', () => {
    expect(fromRrule('FREQ=MONTHLY;BYDAY=MO,TU;BYSETPOS=1')).toBeNull()
    expect(fromRrule('FREQ=HOURLY')).toBeNull()
  })

  it('accepts only whole-day rules without a start or count', () => {
    expect(isValidRule('FREQ=WEEKLY;BYDAY=MO')).toBe(true)
    expect(isValidRule('FREQ=HOURLY')).toBe(false)
    expect(isValidRule('FREQ=DAILY;COUNT=3')).toBe(false)
    expect(isValidRule('co tydzień')).toBe(false)
  })

  it('knows the weekday and its place in the month', () => {
    expect(weekdayOf('2026-11-14')).toBe('SA')
    expect(weekdayPositionsOf('2026-11-10')).toEqual([2])
    expect(weekdayPositionsOf('2026-11-27')).toEqual([4, -1])
    expect(weekdayPositionsOf('2026-10-30')).toEqual([-1])
  })

  it.each([
    [{ rrule: 'FREQ=DAILY' }, 'Codziennie'],
    [
      { rrule: 'FREQ=DAILY;INTERVAL=3', repeat_from: 'completion' as const },
      'Co 3 dni od ukończenia',
    ],
    [{ rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' }, 'W dni robocze'],
    [{ rrule: 'FREQ=WEEKLY;BYDAY=MO,TH' }, 'Co tydzień: pon., czw.'],
    [{ rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=SA' }, 'Co 2 tygodnie: sob.'],
    [{ rrule: 'FREQ=MONTHLY;BYMONTHDAY=10' }, 'Co miesiąc, dnia 10.'],
    [{ rrule: 'FREQ=MONTHLY;BYMONTHDAY=-1' }, 'Co miesiąc, ostatniego dnia'],
    [{ rrule: 'FREQ=MONTHLY;BYDAY=-1FR' }, 'Co miesiąc, w ostatni piątek'],
    [{ rrule: 'FREQ=MONTHLY;BYDAY=2WE' }, 'Co miesiąc, w drugą środę'],
    [{ rrule: 'FREQ=MONTHLY;INTERVAL=5;BYMONTHDAY=1' }, 'Co 5 miesięcy, dnia 1.'],
    [{ rrule: 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=1' }, 'Co rok, 1 marca'],
    [
      { rrule: 'FREQ=DAILY;UNTIL=20261231', repeat_remaining: 4 },
      'Codziennie do 31.12.2026, zostało: 4',
    ],
    [{ rrule: null }, null],
  ])('describes %o', (task, text) => {
    expect(describeRecurrence(task)).toBe(text)
  })
})

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

function fields(overrides: Partial<Task> = {}) {
  return {
    list_id: null,
    parent_id: null,
    title: 'Podlać kwiaty',
    notes: 'Balkon',
    priority: 2,
    status: 'todo' as const,
    due_date: '2026-11-14',
    due_time: '18:00',
    completed_at: null,
    rrule: 'FREQ=WEEKLY;BYDAY=SA',
    repeat_from: 'due' as const,
    repeat_anchor: '2026-11-14',
    repeat_remaining: null,
    ...overrides,
  }
}

const get = async (id: string) => (await db.table<Task>('tasks').get(id))!

describe('finishing an occurrence', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 14, 12, 0))
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
  })
  afterEach(() => vi.useRealTimers())

  it('moves the task on and keeps a copy in history', async () => {
    const task = await createTask(fields({ repeat_remaining: 3 }), 30)

    const finished = await finishOccurrence(task.id)

    expect(finished.next).toBe('2026-11-21')
    const moved = await get(task.id)
    expect(moved).toMatchObject({
      status: 'todo',
      due_date: '2026-11-21',
      repeat_anchor: '2026-11-21',
      repeat_remaining: 2,
    })
    const copy = await get(finished.copyId!)
    expect(copy).toMatchObject({
      status: 'done',
      title: 'Podlać kwiaty',
      notes: 'Balkon',
      due_date: '2026-11-14',
      recurring_task_id: task.id,
    })
    expect(copy.rrule).toBeUndefined()
    // The reminder follows: 30 minutes before 18:00 a week later.
    expect(await findTaskReminder(task.id)).toMatchObject({
      status: 'scheduled',
      remind_at: new Date(2026, 10, 21, 17, 30).toISOString(),
    })
  })

  it('reopens the subtasks and moves their dates with the task', async () => {
    const task = await createTask(fields())
    const dated = await createTask(
      fields({
        rrule: null,
        parent_id: task.id,
        status: 'done',
        due_date: '2026-11-13',
        completed_at: 'x',
      }),
    )
    const undated = await createTask(fields({ rrule: null, parent_id: task.id, due_date: null }))

    await finishOccurrence(task.id)

    expect(await get(dated.id)).toMatchObject({
      status: 'todo',
      completed_at: null,
      due_date: '2026-11-20',
    })
    expect(await get(undated.id)).toMatchObject({ status: 'todo', due_date: null })
  })

  it('completes the task on the last occurrence', async () => {
    const task = await createTask(fields({ repeat_remaining: 1 }))

    const finished = await finishOccurrence(task.id)

    expect(finished).toMatchObject({ next: null, copyId: null })
    expect(await get(task.id)).toMatchObject({ status: 'done', due_date: '2026-11-14' })
  })

  it('records a skipped occurrence as cancelled', async () => {
    const task = await createTask(fields())

    const finished = await finishOccurrence(task.id, 'cancelled')

    expect((await get(finished.copyId!)).status).toBe('cancelled')
    expect((await get(task.id)).due_date).toBe('2026-11-21')
  })

  it('keeps the pattern when only this occurrence was moved', async () => {
    const task = await createTask(fields())
    await moveTask(task.id, '2026-11-15')

    await finishOccurrence(task.id)

    // Still Saturdays, not Sundays.
    expect((await get(task.id)).due_date).toBe('2026-11-21')
  })

  it('can be undone', async () => {
    const task = await createTask(fields({ repeat_remaining: 3 }), 30)
    const subtask = await createTask(
      fields({ rrule: null, parent_id: task.id, status: 'done', completed_at: 'x' }),
    )

    await undoOccurrence(await finishOccurrence(task.id))

    expect(await get(task.id)).toMatchObject({
      due_date: '2026-11-14',
      repeat_anchor: '2026-11-14',
      repeat_remaining: 3,
    })
    expect((await subtasksOf(task.id))[0]).toMatchObject({ id: subtask.id, status: 'done' })
    expect((await tasks.list()).filter((t) => t.recurring_task_id === task.id)).toEqual([])
    expect((await findTaskReminder(task.id))?.remind_at).toBe(
      new Date(2026, 10, 14, 17, 30).toISOString(),
    )
  })
})
