import { pl } from '@/i18n/pl'

const EVENING_FROM = 18
const MORNING_FROM = 5

/** Shown without a name when the account has none. */
export function greeting(now: Date, displayName?: string) {
  const hour = now.getHours()
  const text = hour >= MORNING_FROM && hour < EVENING_FROM ? pl.today.day : pl.today.evening
  const name = displayName?.trim()

  return name ? `${text}, ${name}` : text
}
