import type { ComponentType } from 'react'
import { pl } from '@/i18n/pl'
import { EventsWidget } from '@/modules/calendar/EventsWidget'
import { QuickNoteWidget } from '@/modules/notes/QuickNoteWidget'
import { TasksWidget } from '@/modules/tasks/TasksWidget'
import { ExpensesWidget } from '@/modules/today/PlaceholderWidgets'

export interface DashboardWidget {
  /** Saved in the user's layout, so it must not change once published. */
  id: string
  title: string
  defaultVisible: boolean
  Component: ComponentType
}

/** Every widget of the "Dziś" screen, in the default order. A module adds one entry here. */
export const dashboardWidgets: readonly DashboardWidget[] = [
  { id: 'tasks', title: pl.today.tasks, defaultVisible: true, Component: TasksWidget },
  { id: 'events', title: pl.today.events, defaultVisible: true, Component: EventsWidget },
  { id: 'quick_note', title: pl.today.quickNote, defaultVisible: true, Component: QuickNoteWidget },
  { id: 'expenses', title: pl.today.expenses, defaultVisible: true, Component: ExpensesWidget },
]
