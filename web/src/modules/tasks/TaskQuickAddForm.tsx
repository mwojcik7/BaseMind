import { format } from 'date-fns'
import { Repeat } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { parseQuickText } from '@/lib/quick-parser'
import { taskRules } from '@/modules/tasks/parse'
import { describeRecurrence, firstDueDate, pinToDate } from '@/modules/tasks/recurrence'
import type { ReminderOffset } from '@/modules/tasks/reminder'
import { createTask, DEFAULT_PRIORITY, taskLists } from '@/modules/tasks/repo'
import { PrioritySelect, ReminderSelect } from '@/modules/tasks/TaskFields'

/** What is typed fills the fields in; a value picked by hand takes precedence over it. */
export function TaskQuickAddForm({ onDone }: { onDone: () => void }) {
  const lists = useRecords(taskLists)
  const rules = useMemo(() => taskRules(lists ?? []), [lists])
  const [input, setInput] = useState('')
  // undefined: not picked, so the text decides; null: cleared on purpose.
  const [pickedDate, setPickedDate] = useState<string | null>()
  const [pickedPriority, setPickedPriority] = useState<number>()
  const [pickedTime, setPickedTime] = useState<string>()
  const [pickedOffset, setPickedOffset] = useState<ReminderOffset>()
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const { text: title, fields } = parseQuickText(input, rules, { now })
  const rrule = fields.rrule ?? null
  // A series or a time needs a day: the first occurrence, or today.
  const dueDate =
    pickedDate !== undefined
      ? pickedDate
      : (fields.due_date ??
        (rrule ? (firstDueDate(rrule, today) ?? today) : fields.due_time ? today : null))
  const time = pickedTime ?? fields.due_time ?? ''
  const offset = pickedOffset !== undefined ? pickedOffset : (fields.reminder_offset ?? null)
  const priority = pickedPriority ?? fields.priority ?? DEFAULT_PRIORITY
  const repeat = rrule && dueDate ? pinToDate(rrule, dueDate) : null
  const listName = lists?.find((list) => list.id === fields.list_id)?.name
  const summary = [
    repeat &&
      describeRecurrence({
        rrule: repeat,
        repeat_from: fields.repeat_from,
        repeat_remaining: fields.repeat_remaining,
      }),
    listName,
  ].filter(Boolean)
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
          list_id: fields.list_id ?? null,
          parent_id: null,
          title,
          notes: null,
          priority,
          status: 'todo',
          due_date: dueDate,
          due_time: dueDate && time ? time : null,
          completed_at: null,
          ...(repeat && {
            rrule: repeat,
            repeat_from: fields.repeat_from ?? 'due',
            repeat_anchor: dueDate,
            repeat_remaining: fields.repeat_remaining ?? null,
          }),
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
      {summary.length > 0 && (
        <p
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
          data-testid="quick-add-summary"
        >
          {repeat && <Repeat aria-hidden className="size-3.5" />}
          {summary.join(' · ')}
        </p>
      )}
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
          onChange={(event) => setPickedTime(event.target.value)}
        />
        <PrioritySelect value={priority} onChange={setPickedPriority} />
        <ReminderSelect
          value={dueDate ? offset : null}
          disabled={!dueDate}
          onChange={setPickedOffset}
        />
      </div>
      <Button type="submit" disabled={!ready || saving}>
        {pl.quickAdd.add}
      </Button>
    </form>
  )
}
