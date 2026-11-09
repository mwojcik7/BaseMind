import { addDays, format, nextDay, type Day } from 'date-fns'
import { wordPattern, type ParserRule } from '@/lib/quick-parser'

export interface ParsedTaskFields {
  due_date: string
  priority: number
}

const dateKey = (date: Date) => format(date, 'yyyy-MM-dd')

// Accusative, as in "w piątek", also typed without Polish letters.
const WEEKDAYS: readonly (readonly [string, Day])[] = [
  ['poniedzia[lł]ek', 1],
  ['wtorek', 2],
  ['[sś]rod[eęa]', 3],
  ['czwartek', 4],
  ['pi[aą]tek', 5],
  ['sobot[eęa]', 6],
  ['niedziel[eęa]', 0],
]

const weekdayNames = WEEKDAYS.map(([name]) => name).join('|')

function weekdayOf(name: string): Day {
  const found = WEEKDAYS.find(([pattern]) => new RegExp(`^${pattern}$`, 'iu').test(name))
  return found ? found[1] : 0
}

export const taskRules: readonly ParserRule<ParsedTaskFields>[] = [
  {
    pattern: wordPattern('dzi[sś](?:iaj)?'),
    apply: (_match, { now }) => ({ due_date: dateKey(now) }),
  },
  {
    pattern: wordPattern('jutro'),
    apply: (_match, { now }) => ({ due_date: dateKey(addDays(now, 1)) }),
  },
  {
    // "w piątek" said on a Friday means next week's.
    pattern: wordPattern(`we?\\s+(${weekdayNames})`),
    apply: (match, { now }) => ({ due_date: dateKey(nextDay(now, weekdayOf(match[1]))) }),
  },
  {
    pattern: /(?<!\S)!([1-4])(?!\S)/,
    apply: (match) => ({ priority: Number(match[1]) }),
  },
]
