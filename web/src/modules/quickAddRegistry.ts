import { CalendarDays, CheckSquare, type LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { pl } from '@/i18n/pl'
import { EventQuickAddForm } from '@/modules/calendar/EventQuickAddForm'
import { TaskQuickAddForm } from '@/modules/tasks/TaskQuickAddForm'

export interface QuickAddType {
  id: string
  label: string
  icon: LucideIcon
  /** Saves the new item, then calls onDone. */
  Form: ComponentType<{ onDone: () => void }>
  /** Chosen first when the sheet opens on a screen under this path. */
  home?: string
}

/** Everything the [+] button can add; the first is the default. A module adds one entry here. */
export const quickAddTypes: readonly QuickAddType[] = [
  { id: 'task', label: pl.tasks.quickAddLabel, icon: CheckSquare, Form: TaskQuickAddForm },
  {
    id: 'event',
    label: pl.calendar.quickAddLabel,
    icon: CalendarDays,
    Form: EventQuickAddForm,
    home: '/calendar',
  },
]

/** The type to start with on the screen at `path`. */
export function quickAddTypeFor(path: string): QuickAddType {
  return (
    quickAddTypes.find(
      ({ home }) => home !== undefined && (path === home || path.startsWith(`${home}/`)),
    ) ?? quickAddTypes[0]
  )
}
