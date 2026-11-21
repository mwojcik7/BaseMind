import { beforeEach, describe, expect, it } from 'vitest'
import { pl } from '@/i18n/pl'
import { useAuth, type Account } from '@/lib/auth'
import { events } from '@/modules/calendar/repo'
import { noteFolders, notes } from '@/modules/notes/repo'
import { createTask, removableTasks, taskLists, type Task } from '@/modules/tasks/repo'
import { daysLeft, trashSources } from '@/modules/trashRegistry'

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

const source = (id: string) => trashSources.find((candidate) => candidate.id === id)!

describe('trash', () => {
  beforeEach(() => {
    useAuth.setState({ status: 'authenticated', account: ACCOUNT })
  })

  it('shows a task once, with the subtasks that come back with it', async () => {
    const parent = await createTask(fields({ title: 'Remont' }))
    await createTask(fields({ title: 'Farba', parent_id: parent.id }))
    await createTask(fields({ title: 'Pędzel', parent_id: parent.id }))
    const alone = await createTask(fields({ title: 'Taśma', parent_id: parent.id }))
    await removableTasks.softDelete(alone.id)
    await removableTasks.softDelete(parent.id)

    const entries = await source('tasks').entries()

    expect(entries.map((entry) => [entry.title, entry.detail])).toEqual([
      ['Remont', pl.trash.withSubtasks(2)],
      ['Taśma', pl.trash.subtask('Remont')],
    ])
  })

  it('shows a deleted list with the tasks waiting for it', async () => {
    const list = await taskLists.create({ name: 'Dom' })
    await createTask(fields({ list_id: list.id }))
    await taskLists.softDelete(list.id)

    const [entry] = await source('task_lists').entries()

    expect(entry).toMatchObject({ id: list.id, title: 'Dom', detail: pl.trash.listTasks(1) })
  })

  it('shows a deleted event with when it was', async () => {
    const event = await events.create({
      title: 'Dentysta',
      location: null,
      description: null,
      start_date: '2026-11-20',
      start_time: '18:00',
      end_date: '2026-11-20',
      end_time: '19:00',
      rrule: null,
      exdates: null,
      color: null,
    })
    await events.softDelete(event.id)

    const [entry] = await source('events').entries()

    expect(entry).toMatchObject({ id: event.id, title: 'Dentysta', detail: '20.11.2026 18:00' })

    await source('events').restore(event.id)
    expect(await source('events').entries()).toEqual([])
  })

  it('shows a deleted note with its folder, the first line standing in for a title', async () => {
    const folder = await noteFolders.create({ name: 'Dom' })
    const note = (folderId: string | null, content: string) =>
      notes.create({ folder_id: folderId, title: null, content, pinned: false, archived: false })
    const inFolder = await note(folder.id, '# Pomysły\ntreść')
    const inInbox = await note(null, 'Zakupy')
    await notes.softDelete(inFolder.id)
    await notes.softDelete(inInbox.id)

    const entries = await source('notes').entries()

    expect(entries.map((entry) => [entry.title, entry.detail]).sort()).toEqual([
      ['Pomysły', 'Dom'],
      ['Zakupy', pl.notes.inbox],
    ])

    await source('notes').restore(inFolder.id)
    expect(await source('notes').entries()).toHaveLength(1)
  })

  it('shows a deleted note folder with the notes waiting for it in the inbox', async () => {
    const folder = await noteFolders.create({ name: 'Praca' })
    await notes.create({
      folder_id: folder.id,
      title: 'Plan',
      content: null,
      pinned: false,
      archived: false,
    })
    await noteFolders.softDelete(folder.id)

    const [entry] = await source('note_folders').entries()

    expect(entry).toMatchObject({ id: folder.id, title: 'Praca', detail: pl.trash.folderNotes(1) })
  })

  it('counts the days left until removal', () => {
    const now = new Date('2026-11-15T12:00:00Z')

    expect(daysLeft('2026-11-15T11:00:00Z', now)).toBe(30)
    expect(daysLeft('2026-10-16T13:00:00Z', now)).toBe(1)
    expect(daysLeft('2026-10-01T00:00:00Z', now)).toBe(0)
  })

  it('words the days left in Polish', () => {
    expect(pl.trash.daysLeft(1)).toBe('Został 1 dzień')
    expect(pl.trash.daysLeft(3)).toBe('Zostały 3 dni')
    expect(pl.trash.daysLeft(30)).toBe('Zostało 30 dni')
  })
})
