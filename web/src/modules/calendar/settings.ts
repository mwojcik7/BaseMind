import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

/**
 * What the calendar shows. Synchronised between devices through user_settings. Layers are
 * stored as the hidden ones, so a layer added by a later module starts out visible.
 */
export interface CalendarSettings {
  hidden_layers: string[]
  show_done: boolean
}

/** The layers the calendar can show: the "date providers" of the modules. */
export const CALENDAR_LAYERS = ['events', 'tasks', 'holidays'] as const
export type CalendarLayer = (typeof CALENDAR_LAYERS)[number]

export const CALENDAR_SETTINGS_KEY = 'calendar_settings'

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = { hidden_layers: [], show_done: false }

/** Undefined during the first read. */
export function useCalendarSettings(): CalendarSettings | undefined {
  return useLiveQuery(async () => {
    const saved = (await db.meta.get(CALENDAR_SETTINGS_KEY))?.value as
      Partial<CalendarSettings> | undefined
    return { ...DEFAULT_CALENDAR_SETTINGS, ...saved }
  })
}

export const layerShown = (settings: CalendarSettings, layer: CalendarLayer) =>
  !settings.hidden_layers.includes(layer)

export function withLayer(
  settings: CalendarSettings,
  layer: CalendarLayer,
  shown: boolean,
): CalendarSettings {
  const others = settings.hidden_layers.filter((hidden) => hidden !== layer)
  return { ...settings, hidden_layers: shown ? others : [...others, layer] }
}
