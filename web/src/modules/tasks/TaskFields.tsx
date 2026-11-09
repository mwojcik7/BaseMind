import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { pl } from '@/i18n/pl'
import { REMINDER_OFFSETS, type ReminderOffset } from '@/modules/tasks/reminder'

// Radix's Select can't have an empty value.
const NONE = 'none'

export function ReminderSelect({
  id,
  value,
  disabled,
  onChange,
}: {
  id?: string
  value: ReminderOffset
  disabled?: boolean
  onChange: (value: ReminderOffset) => void
}) {
  return (
    <Select
      value={value === null ? NONE : String(value)}
      disabled={disabled}
      onValueChange={(next) => onChange(next === NONE ? null : Number(next))}
    >
      <SelectTrigger id={id} aria-label={pl.tasks.reminder} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{pl.tasks.reminderNone}</SelectItem>
        {REMINDER_OFFSETS.map((offset) => (
          <SelectItem key={offset} value={String(offset)}>
            {pl.tasks.reminderOffsets[offset as keyof typeof pl.tasks.reminderOffsets]}
          </SelectItem>
        ))}
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
