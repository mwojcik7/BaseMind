import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import { CUSTOM_REMINDER, CustomReminderForm } from '@/components/CustomReminderForm'
import { pl } from '@/i18n/pl'
import { reminderLabel } from '@/lib/reminder-label'
import { parseTimingKey, timingKey } from '@/lib/reminder-moment'
import { REMINDER_OFFSETS, type ReminderSetting } from '@/modules/tasks/reminder'

// Radix's Select can't have an empty value.
const NONE = 'none'

/**
 * No reminder, a ready-made one, or one made by hand ("Własne…"); a hand-made one shows
 * as one more choice. The form takes both grid columns where the select sits in a grid.
 */
export function ReminderSelect({
  id,
  value,
  disabled,
  onChange,
}: {
  id?: string
  value: ReminderSetting
  disabled?: boolean
  onChange: (value: ReminderSetting) => void
}) {
  const [custom, setCustom] = useState(false)

  if (custom) {
    return (
      <div className="col-span-2">
        <CustomReminderForm
          onAdd={(timing) => {
            onChange(timing)
            setCustom(false)
          }}
          onCancel={() => setCustom(false)}
        />
      </div>
    )
  }

  const current = value === null ? NONE : timingKey(value)
  const keys = REMINDER_OFFSETS.map(timingKey)
  if (current !== NONE && !keys.includes(current)) keys.push(current)

  return (
    <Select
      value={current}
      disabled={disabled}
      onValueChange={(next) => {
        if (next === CUSTOM_REMINDER) setCustom(true)
        else onChange(next === NONE ? null : parseTimingKey(next))
      }}
    >
      <SelectTrigger id={id} aria-label={pl.tasks.reminder} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{pl.tasks.reminderNone}</SelectItem>
        {keys.map((key) => (
          <SelectItem key={key} value={key}>
            {reminderLabel(parseTimingKey(key), 'task')}
          </SelectItem>
        ))}
        <SelectItem value={CUSTOM_REMINDER}>{pl.reminders.custom}</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function PrioritySelect({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger aria-label={pl.tasks.priority} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {[1, 2, 3, 4].map((priority) => (
          <SelectItem key={priority} value={String(priority)}>
            P{priority}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Null is the inbox. A list deleted meanwhile shows as the inbox too. */
export function ListSelect({
  id,
  value,
  lists,
  onChange,
}: {
  id?: string
  value: string | null
  lists: readonly { id: string; name: string }[]
  onChange: (value: string | null) => void
}) {
  const sorted = [...lists].sort((a, b) => a.name.localeCompare(b.name, 'pl'))

  return (
    <Select
      value={value && lists.some((list) => list.id === value) ? value : NONE}
      onValueChange={(next) => onChange(next === NONE ? null : next)}
    >
      <SelectTrigger id={id} aria-label={pl.tasks.list} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{pl.tasks.inbox}</SelectItem>
        {sorted.map((list) => (
          <SelectItem key={list.id} value={list.id}>
            {list.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
