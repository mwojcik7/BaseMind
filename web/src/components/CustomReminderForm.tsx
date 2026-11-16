import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { DAY_MINUTES, MORNING, timingOf, type ReminderTiming } from '@/lib/reminder-moment'

const text = pl.reminders

type Unit = 'minutes' | 'hours' | 'days' | 'weeks'

const MINUTES_PER: Record<Unit, number> = {
  minutes: 1,
  hours: 60,
  days: DAY_MINUTES,
  weeks: 7 * DAY_MINUTES,
}

/** The server keeps reminders up to 366 days ahead. */
const MAX: Record<Unit, number> = { minutes: 1440, hours: 168, days: 365, weeks: 52 }

const takesTime = (unit: Unit) => unit === 'days' || unit === 'weeks'

/**
 * A reminder made by hand: a number and a unit, and for days and weeks a time of day.
 * `wholeDaysOnly` leaves out minutes and hours (all-day events have no hour to count
 * from); `sameDay` lets days start at 0, which only all-day things can use safely.
 */
export function CustomReminderForm({
  wholeDaysOnly = false,
  sameDay = false,
  onAdd,
  onCancel,
}: {
  wholeDaysOnly?: boolean
  sameDay?: boolean
  onAdd: (timing: ReminderTiming) => void
  onCancel: () => void
}) {
  const id = useId()
  const units: Unit[] = wholeDaysOnly ? ['days', 'weeks'] : ['minutes', 'hours', 'days', 'weeks']
  const [unit, setUnit] = useState<Unit>(wholeDaysOnly ? 'days' : 'minutes')
  const [amount, setAmount] = useState('')
  const [time, setTime] = useState(MORNING)
  const [error, setError] = useState<string | null>(null)

  const min = unit === 'days' && sameDay ? 0 : 1

  function add() {
    const count = Number(amount)
    if (amount.trim() === '' || !Number.isInteger(count) || count < min || count > MAX[unit]) {
      setError(text.amountRange(min, MAX[unit]))
      return
    }
    onAdd(
      timingOf({
        offset: count * MINUTES_PER[unit],
        time: takesTime(unit) && time ? time : null,
      }),
    )
  }

  return (
    <div
      role="group"
      aria-label={text.customTitle}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
    >
      <p className="text-sm font-medium">{text.customTitle}</p>
      <div className="flex gap-2">
        <div className="flex w-24 flex-col gap-1">
          <Label htmlFor={`${id}-amount`}>{text.amount}</Label>
          <Input
            id={`${id}-amount`}
            type="number"
            inputMode="numeric"
            min={min}
            max={MAX[unit]}
            value={amount}
            aria-invalid={error !== null}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => {
              setAmount(event.target.value)
              setError(null)
            }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={`${id}-unit`}>{text.unit}</Label>
          <Select
            value={unit}
            onValueChange={(next) => {
              setUnit(next as Unit)
              setError(null)
            }}
          >
            <SelectTrigger id={`${id}-unit`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((option) => (
                <SelectItem key={option} value={option}>
                  {text.units[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {takesTime(unit) && (
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-time`}>{text.time}</Label>
          <Input
            id={`${id}-time`}
            type="time"
            className="w-28"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {text.cancel}
        </Button>
        <Button type="button" onClick={add}>
          {text.add}
        </Button>
      </div>
    </div>
  )
}

/** The Select value that opens the form instead of choosing a reminder. */
export const CUSTOM_REMINDER = 'custom'
