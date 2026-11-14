import { parseISO } from 'date-fns'
import { useState } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { pl } from '@/i18n/pl'
import {
  describeRecurrence,
  fromRrule,
  toRrule,
  WEEKDAYS,
  weekdayOf,
  weekdayPositionsOf,
  WORKDAYS,
  type Frequency,
  type MonthlyDay,
  type RecurrenceSpec,
  type RepeatFrom,
  type Weekday,
  type WeekdayPosition,
} from '@/modules/tasks/recurrence'

export interface RepeatValue {
  rrule: string | null
  repeat_from: RepeatFrom
  repeat_remaining: number | null
}

// Radix's Select can't have an empty value.
const NONE = 'none'
const CUSTOM = 'custom'
const FREQUENCIES: readonly Frequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
const text = pl.tasks.repeat

const withoutUntil = (rrule: string) => rrule.replace(/;?UNTIL=\d{8}/, '')

/** The quick choices, based on the task's date: "co tydzień w sobotę" for a Saturday. */
function presetsFor(date: string) {
  const day = parseISO(date)
  const weekday = weekdayOf(date)
  const weekdayIndex = WEEKDAYS.indexOf(weekday)

  return [
    { rule: 'FREQ=DAILY', label: text.daily },
    { rule: `FREQ=WEEKLY;BYDAY=${WORKDAYS.join(',')}`, label: text.workdays },
    {
      rule: `FREQ=WEEKLY;BYDAY=${weekday}`,
      label: `${text.everyN.WEEKLY(1)} ${text.onWeekday(weekdayIndex)}`,
    },
    {
      rule: `FREQ=MONTHLY;BYMONTHDAY=${day.getDate()}`,
      label: `${text.everyN.MONTHLY(1)}, ${text.monthDay(day.getDate())}`,
    },
    {
      rule: `FREQ=YEARLY;BYMONTH=${day.getMonth() + 1};BYMONTHDAY=${day.getDate()}`,
      label: `${text.everyN.YEARLY(1)}, ${text.yearDay(day.getDate(), day.getMonth() + 1)}`,
    },
  ]
}

/** What a new frequency starts with, taken from the task's date. */
function specFor(freq: Frequency, date: string, keep: RecurrenceSpec): RecurrenceSpec {
  const day = parseISO(date)
  return {
    ...keep,
    freq,
    weekdays: freq === 'WEEKLY' ? [weekdayOf(date)] : [],
    monthly: freq === 'MONTHLY' ? { kind: 'day', day: day.getDate() } : null,
    yearly: freq === 'YEARLY' ? { month: day.getMonth() + 1, day: day.getDate() } : null,
  }
}

const monthlyKey = (monthly: MonthlyDay) =>
  monthly.kind === 'day' ? `day:${monthly.day}` : `weekday:${monthly.position}:${monthly.weekday}`

function monthlyFromKey(key: string): MonthlyDay {
  const [kind, a, b] = key.split(':')
  return kind === 'day'
    ? { kind: 'day', day: Number(a) }
    : { kind: 'weekday', position: Number(a) as WeekdayPosition, weekday: b as Weekday }
}

/** A number field that can be cleared while typing; only whole numbers in range get through. */
function NumberField({
  id,
  value,
  min,
  max,
  label,
  onChange,
}: {
  id: string
  value: number
  min: number
  max: number
  label?: string
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))

  return (
    <Input
      id={id}
      aria-label={label}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      className="w-20"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value)
        const number = Number(event.target.value)
        if (Number.isInteger(number) && number >= min && number <= max) {
          onChange(number)
        }
      }}
      onBlur={() => setDraft(String(value))}
    />
  )
}

function CustomRule({
  spec,
  date,
  onChange,
}: {
  spec: RecurrenceSpec
  date: string
  onChange: (spec: RecurrenceSpec) => void
}) {
  const day = parseISO(date)
  const weekday = weekdayOf(date)
  const monthlyOptions: MonthlyDay[] = [
    { kind: 'day', day: day.getDate() },
    ...weekdayPositionsOf(date).map((position) => ({
      kind: 'weekday' as const,
      position,
      weekday,
    })),
    { kind: 'day', day: -1 },
  ]
  // A rule made elsewhere may use another day; it stays on the list.
  if (
    spec.monthly &&
    !monthlyOptions.some((option) => monthlyKey(option) === monthlyKey(spec.monthly!))
  ) {
    monthlyOptions.unshift(spec.monthly)
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-input p-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="repeat-interval">{text.every}</Label>
        <NumberField
          id="repeat-interval"
          value={spec.interval}
          min={1}
          max={99}
          onChange={(interval) => onChange({ ...spec, interval })}
        />
        <Select
          value={spec.freq}
          onValueChange={(freq) => onChange(specFor(freq as Frequency, date, spec))}
        >
          <SelectTrigger aria-label={text.customTitle} className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((freq) => (
              <SelectItem key={freq} value={freq}>
                {text.unit[freq](spec.interval)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {spec.freq === 'WEEKLY' && (
        <fieldset>
          <legend className="text-sm font-medium">{text.weekdaysLabel}</legend>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((code, index) => {
              const on = spec.weekdays.includes(code)
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={on}
                  aria-label={text.weekdayAccusative[index]}
                  // At least one day stays chosen.
                  onClick={() =>
                    (!on || spec.weekdays.length > 1) &&
                    onChange({
                      ...spec,
                      weekdays: on
                        ? spec.weekdays.filter((d) => d !== code)
                        : [...spec.weekdays, code],
                    })
                  }
                  className="h-11 rounded-md bg-secondary text-xs font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {text.weekdayShort[index]}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {spec.freq === 'MONTHLY' && spec.monthly && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="repeat-monthly">{text.monthlyOn}</Label>
          <Select
            value={monthlyKey(spec.monthly)}
            onValueChange={(key) => onChange({ ...spec, monthly: monthlyFromKey(key) })}
          >
            <SelectTrigger id="repeat-monthly" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthlyOptions.map((option) => (
                <SelectItem key={monthlyKey(option)} value={monthlyKey(option)}>
                  {option.kind === 'day'
                    ? option.day === -1
                      ? text.monthlyLastDay
                      : text.monthlyByDay(option.day)
                    : text.monthlyByWeekday(option.position, WEEKDAYS.indexOf(option.weekday))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

type Ending = 'never' | 'on' | 'after'

/**
 * The repeat choice in the task's editor. `date` is the task's date, or today for a task
 * without one: the quick choices and new rules are based on it.
 */
export function RepeatField({
  value,
  date,
  onChange,
}: {
  value: RepeatValue
  date: string
  onChange: (value: RepeatValue) => void
}) {
  const presets = presetsFor(date)
  const base = value.rrule ? withoutUntil(value.rrule) : null
  const [custom, setCustom] = useState(
    () => base !== null && !presets.some((preset) => preset.rule === base),
  )
  const spec = value.rrule ? fromRrule(value.rrule) : null
  const until = spec?.until ?? null
  const ending: Ending = until ? 'on' : value.repeat_remaining ? 'after' : 'never'

  const setRule = (rrule: string | null) =>
    onChange({ ...value, rrule, repeat_remaining: rrule ? value.repeat_remaining : null })
  const setSpec = (next: RecurrenceSpec) => setRule(toRrule(next))

  function choose(choice: string) {
    if (choice === NONE) {
      setCustom(false)
      setRule(null)
    } else if (choice === CUSTOM) {
      setCustom(true)
      setRule(value.rrule ?? `FREQ=WEEKLY;BYDAY=${weekdayOf(date)}`)
    } else {
      setCustom(false)
      setRule(until ? `${choice};UNTIL=${until.replaceAll('-', '')}` : choice)
    }
  }

  function setEnding(next: Ending) {
    if (!spec) {
      return
    }
    onChange({
      ...value,
      rrule: toRrule({ ...spec, until: next === 'on' ? (until ?? date) : null }),
      repeat_remaining: next === 'after' ? (value.repeat_remaining ?? 5) : null,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="task-repeat">{text.label}</Label>
        <Select
          value={!value.rrule ? NONE : custom ? CUSTOM : (base ?? NONE)}
          onValueChange={choose}
        >
          <SelectTrigger id="task-repeat" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{text.none}</SelectItem>
            {presets.map((preset) => (
              <SelectItem key={preset.rule} value={preset.rule}>
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>
              {custom && value.rrule ? describeRecurrence({ rrule: base }) : text.custom}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {custom && spec && <CustomRule spec={spec} date={date} onChange={setSpec} />}

      {value.rrule && spec && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="repeat-ends">{text.ends}</Label>
            <div className="flex items-center gap-2">
              <Select value={ending} onValueChange={(next) => setEnding(next as Ending)}>
                <SelectTrigger id="repeat-ends" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">{text.endsNever}</SelectItem>
                  <SelectItem value="on">{text.endsOn}</SelectItem>
                  <SelectItem value="after">{text.endsAfter}</SelectItem>
                </SelectContent>
              </Select>
              {ending === 'after' && (
                <NumberField
                  id="repeat-times"
                  label={text.timesLabel}
                  value={value.repeat_remaining ?? 5}
                  min={1}
                  max={999}
                  onChange={(times) => onChange({ ...value, repeat_remaining: times })}
                />
              )}
            </div>
            {ending === 'on' && (
              <DatePicker
                id="repeat-until"
                value={until}
                onChange={(next) => setSpec({ ...spec, until: next })}
              />
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-medium">{text.fromLabel}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['due', 'completion'] as const).map((from) => (
                <label
                  key={from}
                  className="flex h-11 cursor-pointer items-center justify-center rounded-md bg-secondary text-sm font-medium outline-2 outline-transparent has-checked:outline-primary has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  {from === 'due' ? text.fromDue : text.fromCompletionOption}
                  <input
                    type="radio"
                    className="sr-only"
                    name="repeat-from"
                    checked={value.repeat_from === from}
                    onChange={() => onChange({ ...value, repeat_from: from })}
                  />
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{text.fromHint}</p>
          </fieldset>
        </>
      )}
    </div>
  )
}
