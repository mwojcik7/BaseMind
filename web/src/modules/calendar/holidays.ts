import { addDays, format } from 'date-fns'

/**
 * Polish public holidays (days off by law), worked out in the app, so they need no data.
 * Christmas Eve is a day off since 2025.
 */

const FIXED: [month: number, day: number, name: string, since?: number][] = [
  [1, 1, 'Nowy Rok'],
  [1, 6, 'Trzech Króli'],
  [5, 1, 'Święto Pracy'],
  [5, 3, 'Święto Konstytucji 3 Maja'],
  [8, 15, 'Wniebowzięcie NMP'],
  [11, 1, 'Wszystkich Świętych'],
  [11, 11, 'Święto Niepodległości'],
  [12, 24, 'Wigilia', 2025],
  [12, 25, 'Boże Narodzenie'],
  [12, 26, 'Drugi dzień Bożego Narodzenia'],
]

/** Easter Sunday in the Gregorian calendar (anonymous algorithm). */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

const key = (date: Date) => format(date, 'yyyy-MM-dd')
const cache = new Map<number, Map<string, string>>()

/** The year's holidays: date ('yyyy-MM-dd') → name. */
export function holidaysIn(year: number): ReadonlyMap<string, string> {
  const known = cache.get(year)
  if (known) return known

  const easter = easterSunday(year)
  const days = new Map<string, string>()
  for (const [month, day, name, since] of FIXED) {
    if (!since || year >= since) days.set(key(new Date(year, month - 1, day)), name)
  }
  days.set(key(easter), 'Wielkanoc')
  days.set(key(addDays(easter, 1)), 'Poniedziałek Wielkanocny')
  days.set(key(addDays(easter, 49)), 'Zielone Świątki')
  days.set(key(addDays(easter, 60)), 'Boże Ciało')

  cache.set(year, days)
  return days
}

/** The holiday on that day ('yyyy-MM-dd'), if any. */
export function holidayOn(date: string): string | undefined {
  return holidaysIn(Number(date.slice(0, 4))).get(date)
}
