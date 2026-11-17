import {
  clockTime,
  dateRules,
  PART_OF_DAY,
  repeatRules,
  timeAfterO,
  timeAndReminderRules,
  type DateFields,
} from '@/lib/date-rules'
import type { ParserRule } from '@/lib/quick-parser'

/** `date` and `time` are where the event starts; `end_time` comes from a range ("10-12"). */
export interface ParsedEventFields extends DateFields {
  end_time: string
}

// Minutes only after a colon: with a dot, "15.12-17.12" would read as 15:12–17:12.
const HOUR = '(\\d{1,2})(?::(\\d{2}))?'
const BEFORE = '(?<![\\p{L}\\p{N}:.])'
const AFTER = `(?:\\s+${PART_OF_DAY})?(?![\\p{L}\\p{N}:]|\\.\\d)`

function range(match: RegExpExecArray): Partial<ParsedEventFields> {
  const [, startHour, startMinute, endHour, endMinute, partOfDay] = match
  const time = clockTime(Number(startHour), Number(startMinute ?? 0), partOfDay)
  const end = clockTime(Number(endHour), Number(endMinute ?? 0), partOfDay)
  return time && end ? { time, end_time: end } : {}
}

/** "10-12", "o 9:30-11", "od 10 do 12:30", "6-8 wieczorem". */
const rangeRules: readonly ParserRule<ParsedEventFields>[] = [
  {
    pattern: new RegExp(`${BEFORE}(?:od\\s+|o\\s+)?${HOUR}\\s*[-–]\\s*${HOUR}${AFTER}`, 'iu'),
    apply: range,
  },
  {
    pattern: new RegExp(`${BEFORE}od\\s+${HOUR}\\s+do\\s+${HOUR}${AFTER}`, 'iu'),
    apply: range,
  },
]

/** The quick-add rules for events: a time range first, then what tasks understand too. */
export const eventRules: readonly ParserRule<ParsedEventFields>[] = [
  ...rangeRules,
  ...repeatRules,
  timeAfterO,
  ...dateRules,
  ...timeAndReminderRules,
]
