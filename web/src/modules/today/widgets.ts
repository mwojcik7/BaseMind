import type { ComponentType } from 'react'
import { pl } from '@/i18n/pl'
import { TasksWidget } from '@/modules/tasks/TasksWidget'
import { EventsWidget, ExpensesWidget } from '@/modules/today/PlaceholderWidgets'

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
  { id: 'expenses', title: pl.today.expenses, defaultVisible: true, Component: ExpensesWidget },
]
