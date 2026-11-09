import { CheckSquare, type LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { pl } from '@/i18n/pl'
import { TaskQuickAddForm } from '@/modules/tasks/TaskQuickAddForm'

export interface QuickAddType {
  id: string
  label: string
  icon: LucideIcon
  /** Saves the new item, then calls onDone. */
  Form: ComponentType<{ onDone: () => void }>
}

/** Everything the [+] button can add. A module adds one entry here. */
export const quickAddTypes: readonly QuickAddType[] = [
  { id: 'task', label: pl.tasks.quickAddLabel, icon: CheckSquare, Form: TaskQuickAddForm },
]
