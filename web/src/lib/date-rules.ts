import { addDays, addMonths, addWeeks, format, nextDay, startOfWeek, type Day } from 'date-fns'
import { wordPattern, type ParserRule } from '@/lib/quick-parser'
import { WORKDAYS, type RepeatFrom, type Weekday } from '@/modules/tasks/recurrence'

/**
 * Dates, times, repeats and reminders in quick-add text, shared by the modules: tasks
 * (modules/tasks/parse.ts) and events (modules/calendar/parse.ts) add rules of their own.
 */
export interface DateFields {
  date: string
  /** 'HH:mm' */
  time: string
  /** May need pinning to the date (see `pinToDate`): "co tydzień" alone has no day. */
  rrule: string
  repeat_from: RepeatFrom
  repeat_remaining: number
  /** Minutes before: 0, 30, 60 or a day (1440). */
  reminder_offset: number
}

const dateKey = (date: Date) => format(date, 'yyyy-MM-dd')

// Each weekday as typed: accusative ("w piątek"), nominative ("co środa") and short forms,
// also without Polish letters.
const WEEKDAYS: readonly (readonly [string, Day, Weekday])[] = [
  ['poniedzia[lł]ek|pon', 1, 'MO'],
  ['wtorek|wt', 2, 'TU'],
  ['[sś]rod[eęa]|[sś]r', 3, 'WE'],
  ['czwartek|czw', 4, 'TH'],
  ['pi[aą]tek|pt', 5, 'FR'],
  ['sobot[eęa]|sob', 6, 'SA'],
  ['niedziel[eęa]|niedz|nd', 0, 'SU'],
]

// The long forms only for dates: "w pt" is too easy to type by accident.
const DATE_WEEKDAYS = WEEKDAYS.map(([names]) => names.split('|')[0]).join('|')
const ANY_WEEKDAY = WEEKDAYS.map(([names]) => names).join('|')

function weekdayOf(name: string) {
  const found = WEEKDAYS.find(([pattern]) => new RegExp(`^(?:${pattern})$`, 'iu').test(name))
  return found ?? WEEKDAYS[6]
}

const MONTHS = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'wrze[sś]nia',
  'pa[zź]dziernika',
  'listopada',
  'grudnia',
]
const monthOf = (name: string) =>
  MONTHS.findIndex((pattern) => new RegExp(`^${pattern}$`, 'iu').test(name))

/** A day and month without a year means the next one to come. */
function upcomingDate(day: number, month: number, year: number | null, now: Date) {
  const date = new Date(year ?? now.getFullYear(), month, day)
  // Rolled over (e.g. 31.02) means there's no such day.
  if (date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  if (year === null && dateKey(date) < dateKey(now)) {
    date.setFullYear(date.getFullYear() + 1)
  }
  return dateKey(date)
}

/** 'HH:mm', with "wieczorem" and the like moving the hour past noon; null when no such time. */
export function clockTime(hour: number, minute: number, partOfDay: string | undefined) {
  let h = hour
  if (partOfDay && /wiecz|po po[lł]udniu|popo[lł]udniu/iu.test(partOfDay) && h < 12) {
    h += 12
  }
  if (h > 23 || minute > 59) {
    return null
  }
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** One capture group. */
export const PART_OF_DAY = '(rano|wieczorem|wiecz[oó]r|po po[lł]udniu|popo[lł]udniu)'
const INTERVAL_UNITS: readonly (readonly [string, string])[] = [
  ['dni|dzie[nń]', 'DAILY'],
  ['tygodni[eu]?|tydzie[nń]|tyg', 'WEEKLY'],
  ['miesi[aą]c[ea]?|miesi[eę]cy', 'MONTHLY'],
  ['lat[a]?|rok', 'YEARLY'],
]
const freqOf = (unit: string) =>
  INTERVAL_UNITS.find(([pattern]) => new RegExp(`^(?:${pattern})$`, 'iu').test(unit))?.[1] ??
  'DAILY'

/** Before the dates: "w każdy piątek" must not be read as the date "w piątek". */
export const repeatRules: readonly ParserRule<DateFields>[] = [
  {
    // Before "co dzień", which it starts with.
    pattern: wordPattern('w\\s+dni\\s+(?:robocze|powszednie)|co\\s+dzie[nń]\\s+roboczy'),
    apply: () => ({ rrule: `FREQ=WEEKLY;BYDAY=${WORKDAYS.join(',')}` }),
  },
  {
    pattern: wordPattern('codziennie|co\\s+dzie[nń]|ka[zż]dego\\s+dnia'),
    apply: () => ({ rrule: 'FREQ=DAILY' }),
  },
  {
    // "w ostatni piątek miesiąca", "co ostatni piątek"
    pattern: wordPattern(`(?:co|w|we)\\s+ostatni[aą]?\\s+(${ANY_WEEKDAY})(?:\\s+miesi[aą]ca)?`),
    apply: (match) => ({ rrule: `FREQ=MONTHLY;BYDAY=-1${weekdayOf(match[1])[2]}` }),
  },
  {
    // "co poniedziałek", "w każdy wtorek", "co pon i czw", "co wt, pt"
    pattern: wordPattern(
      `(?:co|w\\s+ka[zż]d[yąa]|we\\s+ka[zż]d[yąa])\\s+((?:${ANY_WEEKDAY})(?:\\s*(?:,|i|oraz)\\s*(?:${ANY_WEEKDAY}))*)`,
    ),
    apply: (match) => {
      const days = match[1].split(/\s*(?:,|\s+i\s+|\s+oraz\s+)\s*/u).map((day) => weekdayOf(day)[2])
      const ordered = WORKDAYS.concat(['SA', 'SU']).filter((day) => days.includes(day))
      return { rrule: `FREQ=WEEKLY;BYDAY=${ordered.join(',')}` }
    },
  },
  {
    // "co 3 dni", "co 2 tygodnie", "co 6 miesięcy"
    pattern: wordPattern(`co\\s+(\\d{1,2})\\s+(${INTERVAL_UNITS.map(([u]) => u).join('|')})`),
    apply: (match) => {
      const interval = Number(match[1])
      const freq = freqOf(match[2])
      return { rrule: interval > 1 ? `FREQ=${freq};INTERVAL=${interval}` : `FREQ=${freq}` }
    },
  },
  {
    // "co 10." is the day of the month; the dot tells it from "co 10 dni".
    pattern: /(?<![\p{L}\p{N}])co\s+(\d{1,2})\.(?!\d)/iu,
    apply: (match) => {
      const day = Number(match[1])
      return day >= 1 && day <= 31 ? { rrule: `FREQ=MONTHLY;BYMONTHDAY=${day}` } : {}
    },
  },
  {
    pattern: wordPattern('co\\s+tydzie[nń]|ka[zż]dego\\s+tygodnia|cotygodniowo'),
    apply: () => ({ rrule: 'FREQ=WEEKLY' }),
  },
  {
    pattern: wordPattern('co\\s+miesi[aą]c|ka[zż]dego\\s+miesi[aą]ca|comiesi[eę]cznie'),
    apply: () => ({ rrule: 'FREQ=MONTHLY' }),
  },
  {
    pattern: wordPattern('co\\s+rok|co\\s+roku|ka[zż]dego\\s+roku|corocznie'),
    apply: () => ({ rrule: 'FREQ=YEARLY' }),
  },
  {
    pattern: wordPattern('(?:od|po)\\s+(?:uko[nń]czeniu|uko[nń]czenia|zrobieniu|zrobienia)'),
    apply: () => ({ repeat_from: 'completion' as const }),
  },
  {
    pattern: wordPattern('(\\d{1,3})\\s+razy'),
    apply: (match) => (Number(match[1]) >= 1 ? { repeat_remaining: Number(match[1]) } : {}),
  },
]

export const dateRules: readonly ParserRule<DateFields>[] = [
  {
    pattern: wordPattern('dzi[sś](?:iaj)?'),
    apply: (_match, { now }) => ({ date: dateKey(now) }),
  },
  {
    pattern: wordPattern('pojutrze'),
    apply: (_match, { now }) => ({ date: dateKey(addDays(now, 2)) }),
  },
  {
    pattern: wordPattern('jutro'),
    apply: (_match, { now }) => ({ date: dateKey(addDays(now, 1)) }),
  },
  {
    // "za 3 dni", "za tydzień", "za 2 tygodnie", "za miesiąc"
    pattern: wordPattern(
      `za\\s+(?:(\\d{1,3})\\s+)?(${INTERVAL_UNITS.slice(0, 3)
        .map(([u]) => u)
        .join('|')})`,
    ),
    apply: (match, { now }) => {
      const count = Number(match[1] ?? 1)
      const freq = freqOf(match[2])
      const date =
        freq === 'WEEKLY'
          ? addWeeks(now, count)
          : freq === 'MONTHLY'
            ? addMonths(now, count)
            : addDays(now, count)
      return { date: dateKey(date) }
    },
  },
  {
    // "w przyszły wtorek" is the one in the coming week, even if this week's is still ahead.
    pattern: wordPattern(`we?\\s+(?:przysz[lł][yąa]|nast[eę]pn[yąa])\\s+(${DATE_WEEKDAYS})`),
    apply: (match, { now }) => {
      const [, day] = weekdayOf(match[1])
      const nextMonday = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1)
      return { date: dateKey(addDays(nextMonday, (day + 6) % 7)) }
    },
  },
  {
    // "w piątek" said on a Friday means next week's.
    pattern: wordPattern(`we?\\s+(${DATE_WEEKDAYS})`),
    apply: (match, { now }) => ({ date: dateKey(nextDay(now, weekdayOf(match[1])[1])) }),
  },
  {
    // "15 listopada", "15 listopada 2027"
    pattern: wordPattern(`(\\d{1,2})\\s+(${MONTHS.join('|')})(?:\\s+(\\d{4}))?`),
    apply: (match, { now }) => {
      const date = upcomingDate(
        Number(match[1]),
        monthOf(match[2]),
        match[3] ? Number(match[3]) : null,
        now,
      )
      return date ? { date } : {}
    },
  },
  {
    // "15.11", "15.11.2027"
    pattern: /(?<![\p{L}\p{N}.:])(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?(?![\p{L}\p{N}]|\.\d)/u,
    apply: (match, { now }) => {
      const date = upcomingDate(
        Number(match[1]),
        Number(match[2]) - 1,
        match[3] ? Number(match[3]) : null,
        now,
      )
      return date ? { date } : {}
    },
  },
]

/** Before the dates: after "o", "18.30" is a time. */
export const timeAfterO: ParserRule<DateFields> = {
  // "o 18", "o 18:30", "o 7 rano", "o 8 wieczorem"
  pattern: wordPattern(`o\\s+(\\d{1,2})(?:[:.](\\d{2}))?(?:\\s+${PART_OF_DAY})?`),
  apply: (match) => {
    const value = clockTime(Number(match[1]), Number(match[2] ?? 0), match[3])
    return value ? { time: value } : {}
  },
}

/** After the dates. */
export const timeAndReminderRules: readonly ParserRule<DateFields>[] = [
  {
    // "18:30" on its own needs the colon: "18.30" could be a date.
    pattern: /(?<![\p{L}\p{N}:.])(\d{1,2}):(\d{2})(?![\p{L}\p{N}:])/u,
    apply: (match) => {
      const value = clockTime(Number(match[1]), Number(match[2]), undefined)
      return value ? { time: value } : {}
    },
  },
  {
    // "przypomnij", "przypomnij 30 min", "przypomnij godzinę przed", "przypomnij dzień wcześniej"
    pattern: wordPattern(
      'przypomnij(?:\\s+(?:(30)\\s*min(?:ut)?|(?:1\\s*)?(godz(?:in[eęa])?\\.?|h)|(?:1\\s*)?(dzie[nń]|dob[eę])))?(?:\\s+(?:przed|wcze[sś]niej))?',
    ),
    apply: (match) => ({
      reminder_offset: match[1] ? 30 : match[2] ? 60 : match[3] ? 1440 : 0,
    }),
  },
]
