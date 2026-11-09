import { liveQuery } from 'dexie'
import { db } from '@/db/db'
import type { Reminder } from '@/db/reminders'

/** Shows on the app icon how many reminders went out and are still unanswered. */
export function startBadge() {
  if (!('setAppBadge' in navigator)) {
    return () => {}
  }

  const count = liveQuery(() =>
    db
      .table<Reminder>('reminders')
      .where('status')
      .equals('sent')
      .filter((reminder) => reminder.deleted_at === null)
      .count(),
  ).subscribe((unanswered) => {
    // Rejected when the app isn't installed, which simply means there is no icon to mark.
    void navigator.setAppBadge(unanswered).catch(() => {})
  })

  return () => count.unsubscribe()
}
