import { reminders } from '@/db/reminders'
import { reminderMoment as momentFor } from '@/lib/reminder-moment'
import type { Task } from '@/modules/tasks/repo'

/** Minutes before the due moment; null means no reminder. */
export type ReminderOffset = number | null

export const REMINDER_OFFSETS: readonly number[] = [0, 30, 60, 1440]

export function reminderMoment(
  task: { due_date: string; due_time: string | null },
  offset: number,
) {
  return momentFor(task.due_date, task.due_time, offset)
}

export async function findTaskReminder(taskId: string) {
  return (await reminders.list()).find(
    (reminder) => reminder.entity_type === 'tasks' && reminder.entity_id === taskId,
  )
}

/** Must be called inside a transaction covering tasks, reminders and the outbox. */
export async function setTaskReminder(task: Task, offset: ReminderOffset) {
  const existing = await findTaskReminder(task.id)

  if (offset === null || !task.due_date) {
    if (existing) {
      await reminders.softDelete(existing.id)
    }
    return
  }

  const moment = reminderMoment({ due_date: task.due_date, due_time: task.due_time }, offset)
  const fields = {
    title: task.title,
    remind_at: moment.toISOString(),
    offset_minutes: offset,
    // A moment already gone must not fire at once; the choice is still remembered.
    status: moment.getTime() > Date.now() ? ('scheduled' as const) : ('dismissed' as const),
    snoozed_until: null,
  }

  if (existing) {
    await reminders.update(existing.id, fields)
  } else {
    await reminders.create({
      ...fields,
      entity_type: 'tasks',
      entity_id: task.id,
      rrule: null,
      channels: ['push', 'email'],
    })
  }
}

/** Keeps the task's reminder, if it has one, in step with a change to the task. */
export async function refreshTaskReminder(task: Task) {
  const existing = await findTaskReminder(task.id)
  if (!existing) {
    return
  }

  if (task.status === 'todo') {
    await setTaskReminder(task, existing.offset_minutes)
  } else {
    await reminders.update(existing.id, { status: 'dismissed', snoozed_until: null })
  }
}

/** Must be called inside a transaction covering reminders and the outbox. */
export async function dismissTaskReminder(taskId: string) {
  const existing = await findTaskReminder(taskId)
  if (existing) {
    await reminders.update(existing.id, { status: 'dismissed', snoozed_until: null })
  }
}
