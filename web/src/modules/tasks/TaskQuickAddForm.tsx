import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { parseQuickText } from '@/lib/quick-parser'
import { taskRules } from '@/modules/tasks/parse'
import type { ReminderOffset } from '@/modules/tasks/reminder'
import { createTask, DEFAULT_PRIORITY } from '@/modules/tasks/repo'
import { PrioritySelect, ReminderSelect } from '@/modules/tasks/TaskFields'

/** What is typed fills the fields in; a value picked by hand takes precedence over it. */
export function TaskQuickAddForm({ onDone }: { onDone: () => void }) {
  const [input, setInput] = useState('')
  // undefined: not picked, so the text decides; null: cleared on purpose.
  const [pickedDate, setPickedDate] = useState<string | null>()
  const [pickedPriority, setPickedPriority] = useState<number>()
  const [time, setTime] = useState('')
  const [offset, setOffset] = useState<ReminderOffset>(null)
  const [saving, setSaving] = useState(false)

  const { text: title, fields } = parseQuickText(input, taskRules, { now: new Date() })
  const dueDate = pickedDate === undefined ? (fields.due_date ?? null) : pickedDate
  const priority = pickedPriority ?? fields.priority ?? DEFAULT_PRIORITY
  const ready = title.length > 0

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ready || saving) {
      return
    }

    setSaving(true)
    try {
      await createTask(
        {
          list_id: null,
          title,
          notes: null,
          priority,
          status: 'todo',
          due_date: dueDate,
          due_time: dueDate && time ? time : null,
          completed_at: null,
        },
        dueDate ? offset : null,
      )
      toast.success(pl.tasks.added)
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      <Input
        autoFocus
        enterKeyHint="done"
        aria-label={pl.tasks.quickAddPlaceholder}
        placeholder={pl.tasks.quickAddPlaceholder}
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          value={dueDate}
          onChange={setPickedDate}
          placeholder={pl.tasks.dueDate}
          compact
        />
        <Input
          type="time"
          aria-label={pl.tasks.dueTime}
          disabled={!dueDate}
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
        <PrioritySelect value={priority} onChange={setPickedPriority} />
        <ReminderSelect value={dueDate ? offset : null} disabled={!dueDate} onChange={setOffset} />
      </div>
      <Button type="submit" disabled={!ready || saving}>
        {pl.quickAdd.add}
      </Button>
    </form>
  )
}
