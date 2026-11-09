import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

/** How the user arranged the widgets on the "Dziś" screen. Synchronised between devices. */
export interface DashboardLayout {
  order: string[]
  hidden: string[]
}

export const DASHBOARD_LAYOUT_KEY = 'dashboard_layout'

/** Undefined during the first read, null when the user has not arranged anything yet. */
export function useDashboardLayout(): DashboardLayout | null | undefined {
  return useLiveQuery(
    async () => ((await db.meta.get(DASHBOARD_LAYOUT_KEY))?.value as DashboardLayout) ?? null,
  )
}

/**
 * Applies a saved layout to the widgets this version of the app has. Ids the app doesn't
 * know are ignored, and widgets the layout doesn't know (added by a later module) go last
 * with their default visibility.
 */
export function arrangeWidgets<T extends { id: string; defaultVisible: boolean }>(
  widgets: readonly T[],
  layout: DashboardLayout | null,
): (T & { visible: boolean })[] {
  const order = layout?.order ?? []
  const hidden = layout?.hidden ?? []

  const rank = (id: string) => {
    const index = order.indexOf(id)
    return index === -1 ? order.length : index
  }

  return [...widgets]
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map((widget) => ({
      ...widget,
      visible: order.includes(widget.id) ? !hidden.includes(widget.id) : widget.defaultVisible,
    }))
}

export function toDashboardLayout(
  widgets: readonly { id: string; visible: boolean }[],
): DashboardLayout {
  return {
    order: widgets.map((widget) => widget.id),
    hidden: widgets.filter((widget) => !widget.visible).map((widget) => widget.id),
  }
}
