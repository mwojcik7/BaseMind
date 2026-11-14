import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { useAuth, type Account } from '@/lib/auth'
import {
  answerCompletionPrompt,
  requestCompleteTask,
  useCompletionPrompt,
} from '@/modules/tasks/completion'
import {
  completeTaskWithSubtasks,
  createTask,
  removableTasks,
  reopenTasks,
  tasks,
  type Task,
} from '@/modules/tasks/repo'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

function fields(overrides: Partial<Task> = {}) {
  return {
    list_id: null,
    parent_id: null,
    title: 'Zadanie',
    notes: null,
    priority: 4,
    status: 'todo' as const,
    due_date: null,
    due_time: null,
    completed_at: null,
    ...overrides,
  }
}

async function family() {
  const parent = await createTask(fields({ title: 'Remont' }))
  const open = await createTask(fields({ title: 'Farba', parent_id: parent.id }))
  const finished = await createTask(
    fields({ title: 'Pomiar', parent_id: parent.id, status: 'done', completed_at: '2026-11-01' }),
  )
  return { parent, open, finished }
}

const status = async (id: string) => (await db.table<Task>('tasks').get(id))?.status
const isDeleted = async (id: string) => (await db.table<Task>('tasks').get(id))?.deleted_at !== null

describe('subtasks', () => {
  beforeEach(() => {
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
    useCompletionPrompt.setState({ task: null, openSubtasks: 0 })
  })

  it('completes a task without open subtasks at once', async () => {
    const { finished } = await family()
    const lone = await createTask(fields({ title: 'Sam' }))

    await requestCompleteTask(lone)
    await requestCompleteTask((await tasks.get(finished.id))!)

    expect(await status(lone.id)).toBe('done')
    expect(useCompletionPrompt.getState().task).toBeNull()
  })

  it('asks first when the task has open subtasks', async () => {
    const { parent } = await family()

    await requestCompleteTask(parent)

    expect(useCompletionPrompt.getState()).toMatchObject({
      task: { id: parent.id },
      openSubtasks: 1,
    })
    expect(await status(parent.id)).toBe('todo')
  })

  it('completes only the task when asked to', async () => {
    const { parent, open } = await family()
    await requestCompleteTask(parent)

    await answerCompletionPrompt(false)

    expect(await status(parent.id)).toBe('done')
    expect(await status(open.id)).toBe('todo')
  })

  it('completes the task with its open subtasks and undoes just those', async () => {
    const { parent, open, finished } = await family()

    const ids = await completeTaskWithSubtasks(parent.id)
    expect(ids).toEqual([parent.id, open.id])
    expect(await status(open.id)).toBe('done')

    await reopenTasks(ids)
    expect(await status(parent.id)).toBe('todo')
    expect(await status(open.id)).toBe('todo')
    // It was done before and stays so.
    expect(await status(finished.id)).toBe('done')
  })

  it('deletes subtasks with their task and brings back only those', async () => {
    const { parent, open, finished } = await family()
    const deletedEarlier = await createTask(fields({ title: 'Stare', parent_id: parent.id }))
    await removableTasks.softDelete(deletedEarlier.id)

    await removableTasks.softDelete(parent.id)
    expect(await isDeleted(parent.id)).toBe(true)
    expect(await isDeleted(open.id)).toBe(true)
    expect(await isDeleted(finished.id)).toBe(true)

    await removableTasks.restore(parent.id)
    expect(await isDeleted(parent.id)).toBe(false)
    expect(await isDeleted(open.id)).toBe(false)
    expect(await isDeleted(finished.id)).toBe(false)
    expect(await isDeleted(deletedEarlier.id)).toBe(true)
  })
})
