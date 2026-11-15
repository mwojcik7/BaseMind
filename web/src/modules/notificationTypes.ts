import { CalendarDays, CheckSquare, type LucideIcon } from 'lucide-react'
import { pl } from '@/i18n/pl'

export interface NotificationType {
  /** The reminder's entity_type, as listed in the API's config/notifications.php. */
  id: string
  label: string
  icon: LucideIcon
}

/** Kinds of reminders with their own channel settings. A module adds one entry here. */
export const notificationTypes: readonly NotificationType[] = [
  { id: 'tasks', label: pl.nav.tasks, icon: CheckSquare },
  { id: 'events', label: pl.search.groups.events, icon: CalendarDays },
]
