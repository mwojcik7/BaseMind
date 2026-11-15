import type { EventColor } from '@/modules/calendar/repo'

/** Spelled out in full, so Tailwind finds the classes (tokens in index.css). */
export const EVENT_COLOR_CLASS: Record<EventColor, string> = {
  blue: 'bg-event-blue',
  cyan: 'bg-event-cyan',
  green: 'bg-event-green',
  yellow: 'bg-event-yellow',
  orange: 'bg-event-orange',
  red: 'bg-event-red',
  purple: 'bg-event-purple',
  gray: 'bg-event-gray',
}

export const colorClassOf = (color: EventColor | null) => EVENT_COLOR_CLASS[color ?? 'blue']
