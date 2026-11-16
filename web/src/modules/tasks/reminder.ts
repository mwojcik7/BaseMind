import { reminders, timingOfReminder } from '@/db/reminders'
import { reminderMoment as momentFor, timingOf, type ReminderChoice } from '@/lib/reminder-moment'
import type { Task } from '@/modules/tasks/repo'

/** The task's reminder: minutes before the due moment, maybe with a time of day; null is none. */
export type ReminderSetting = ReminderChoice | null

export const REMINDER_OFFSETS: readonly number[] = [0, 30, 60, 1440]

export function reminderMoment(
  task: { due_date: string; due_time: string | null },
  choice: ReminderChoice,
) {
  const { offset, time } = timingOf(choice)
  return momentFor(task.due_date, task.due_time, offset, time)
}

export async function findTaskReminder(taskId: string) {
  return (await reminders.list()).find(
    (reminder) => reminder.entity_type === 'tasks' && reminder.entity_id === taskId,
  )
}

/** Must be called inside a transaction covering tasks, reminders and the outbox. */
export async function setTaskReminder(task: Task, choice: ReminderSetting) {
  const existing = await findTaskReminder(task.id)

  if (choice === null || !task.due_date) {
    if (existing) {
      await reminders.softDelete(existing.id)
    }
    return
  }

  const timing = timingOf(choice)
  const moment = reminderMoment({ due_date: task.due_date, due_time: task.due_time }, timing)
  const fields = {
    title: task.title,
    remind_at: moment.toISOString(),
    offset_minutes: timing.offset,
    remind_time: timing.time,
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
    await setTaskReminder(task, timingOfReminder(existing))
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
