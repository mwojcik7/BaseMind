import { createRepository, type SyncedRecord } from '@/db/repository'

export interface Reminder extends SyncedRecord {
  /** The record it belongs to, if any. */
  entity_type: string | null
  entity_id: string | null
  title: string
  /** When it next goes out, in UTC. */
  remind_at: string
  /** RFC 5545 rule without COUNT or DTSTART, e.g. FREQ=MONTHLY;BYMONTHDAY=10. */
  rrule: string | null
  /** How long before each occurrence it goes out. */
  offset_minutes: number
  channels: ('push' | 'email')[]
  status: 'scheduled' | 'sent' | 'dismissed' | 'snoozed'
  snoozed_until: string | null
  /** Set by the server only, so it must not be sent when creating a reminder. */
  last_sent_at?: string | null
}

export const reminders = createRepository<Reminder>('reminders')
