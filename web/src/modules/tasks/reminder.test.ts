import { addDays, format, subDays } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { reminders } from '@/db/reminders'
import { useAuth, type Account } from '@/lib/auth'
import { findTaskReminder, reminderMoment } from '@/modules/tasks/reminder'
import {
  completeTask,
  createTask,
  moveTask,
  removableTasks,
  reopenTask,
  updateTask,
  type Task,
} from '@/modules/tasks/repo'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

function fields(overrides: Partial<Task> = {}) {
  return {
    list_id: null,
    title: 'Zadzwonić',
    notes: null,
    priority: 4,
    status: 'todo' as const,
    due_date: tomorrow,
    due_time: '14:30',
    completed_at: null,
    ...overrides,
  }
}

describe('task reminders', () => {
  beforeEach(() => useAuth.setState({ status: 'authenticated', account: ACCOUNT }))

  it('goes out the chosen time before the due moment', () => {
    const task = { due_date: '2026-11-12', due_time: '14:30' }

    expect(reminderMoment(task, 30)).toEqual(new Date(2026, 10, 12, 14, 0))
    expect(reminderMoment(task, 1440)).toEqual(new Date(2026, 10, 11, 14, 30))
  })

  it('uses the morning for a task without a time', () => {
    expect(reminderMoment({ due_date: '2026-11-12', due_time: null }, 0)).toEqual(
      new Date(2026, 10, 12, 9, 0),
    )
  })

  it('is created with the task, linked to it', async () => {
    const task = await createTask(fields(), 60)

    expect(await findTaskReminder(task.id)).toMatchObject({
      entity_type: 'tasks',
      entity_id: task.id,
      title: 'Zadzwonić',
      offset_minutes: 60,
      status: 'scheduled',
      remind_at: reminderMoment(task, 60).toISOString(),
    })
  })

  it('is not created when not chosen', async () => {
    await createTask(fields())

    expect(await reminders.list()).toHaveLength(0)
  })

  it('does not fire at once for a moment already gone', async () => {
    const task = await createTask(
      fields({ due_date: format(subDays(new Date(), 1), 'yyyy-MM-dd') }),
      0,
    )

    expect((await findTaskReminder(task.id))?.status).toBe('dismissed')
  })

  it('follows a change of the date and the title', async () => {
    const task = await createTask(fields(), 30)
    const later = format(addDays(new Date(), 3), 'yyyy-MM-dd')

    await updateTask(task.id, { title: 'Nowy', due_date: later }, 30)

    expect(await findTaskReminder(task.id)).toMatchObject({
      title: 'Nowy',
      remind_at: reminderMoment({ due_date: later, due_time: '14:30' }, 30).toISOString(),
    })
  })

  it('moves with the task', async () => {
    const task = await createTask(fields(), 0)
    const later = format(addDays(new Date(), 2), 'yyyy-MM-dd')

    await moveTask(task.id, later)

    expect((await findTaskReminder(task.id))?.remind_at).toBe(
      reminderMoment({ due_date: later, due_time: '14:30' }, 0).toISOString(),
    )
  })

  it('is removed when the choice is cleared or the date is gone', async () => {
    const first = await createTask(fields(), 0)
    const second = await createTask(fields(), 0)

    await updateTask(first.id, {}, null)
    await updateTask(second.id, { due_date: null, due_time: null }, 0)

    expect(await reminders.list()).toHaveLength(0)
  })

  it('stops when the task is completed and returns when reopened', async () => {
    const task = await createTask(fields(), 0)

    await completeTask(task.id)
    expect((await findTaskReminder(task.id))?.status).toBe('dismissed')

    await reopenTask(task.id)
    expect((await findTaskReminder(task.id))?.status).toBe('scheduled')
  })

  it('stops when the task is deleted and returns with undo', async () => {
    const task = await createTask(fields(), 0)

    await removableTasks.softDelete(task.id)
    expect((await findTaskReminder(task.id))?.status).toBe('dismissed')

    await removableTasks.restore(task.id)
    expect((await findTaskReminder(task.id))?.status).toBe('scheduled')
  })
})
