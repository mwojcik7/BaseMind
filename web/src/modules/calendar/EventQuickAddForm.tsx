import { useNavigate, useRouterState } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Repeat } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { reminderLabel } from '@/lib/reminder-label'
import { parseTimingKey, timingKey } from '@/lib/reminder-moment'
import { parseQuickText } from '@/lib/quick-parser'
import { repeatOf } from '@/modules/calendar/form'
import { eventRules } from '@/modules/calendar/parse'
import { quickEventDraft, type QuickEventPicks } from '@/modules/calendar/quick-add'
import { reminderOffsetsFor } from '@/modules/calendar/reminder'
import { createEvent } from '@/modules/calendar/repo'
import { useCalendarView } from '@/modules/calendar/view'
import { describeRecurrence } from '@/modules/tasks/recurrence'

const text = pl.calendar
const NONE = 'none'

/**
 * A quick event: what is typed fills the fields in, a value picked by hand wins. Colour,
 * place and note are set later on the event's own screen ("Otwórz" after saving).
 */
export function EventQuickAddForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()
  const path = useRouterState({ select: (state) => state.location.pathname })
  // Read once: opened over the month view, a new event goes on the day picked there.
  const [pickedInMonth] = useState(() => {
    const { view, selected } = useCalendarView.getState()
    return path === '/calendar' && view === 'month' ? selected : null
  })
  const [input, setInput] = useState('')
  const [picks, setPicks] = useState<QuickEventPicks>({})
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const day = pickedInMonth ?? format(now, 'yyyy-MM-dd')
  const { text: title, fields } = parseQuickText(input, eventRules, { now })
  const draft = quickEventDraft(fields, picks, { now, day })
  const repeat = draft.rrule ? describeRecurrence(repeatOf(draft.rrule)) : null
  const kind = draft.allDay ? 'allDay' : 'timed'
  const reminderKeys = reminderOffsetsFor(draft.allDay).map(timingKey)
  const reminderValue = draft.reminder === null ? NONE : timingKey(draft.reminder)
  if (reminderValue !== NONE && !reminderKeys.includes(reminderValue)) {
    reminderKeys.push(reminderValue)
  }
  const ready = title.length > 0
  const pick = (next: QuickEventPicks) => setPicks((current) => ({ ...current, ...next }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ready || saving) {
      return
    }

    setSaving(true)
    try {
      const created = await createEvent(
        {
          title,
          location: null,
          description: null,
          start_date: draft.start_date,
          start_time: draft.allDay ? null : draft.start_time,
          end_date: draft.allDay ? draft.start_date : draft.end_date,
          end_time: draft.allDay ? null : draft.end_time,
          rrule: draft.rrule,
          exdates: null,
          color: null,
        },
        draft.reminder === null ? [] : [draft.reminder],
      )
      toast.success(text.created, {
        action: {
          label: text.open,
          onClick: () =>
            void navigate({
              to: '/calendar/events/$eventId',
              params: { eventId: created.id },
              search: { date: created.start_date },
            }),
        },
      })
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(submit) => void handleSubmit(submit)} className="flex flex-col gap-3">
      <Input
        autoFocus
        enterKeyHint="done"
        aria-label={text.quickAddPlaceholder}
        placeholder={text.quickAddPlaceholder}
        value={input}
        onChange={(change) => setInput(change.target.value)}
      />
      {repeat && (
        <p
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
          data-testid="quick-add-summary"
        >
          <Repeat aria-hidden className="size-3.5" />
          {repeat}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          value={draft.start_date}
          onChange={(date) => date && pick({ date })}
          placeholder={text.startDate}
          compact
        />
        <div className="flex min-h-11 items-center justify-between gap-2 px-1">
          <Label htmlFor="quick-event-all-day">{text.allDay}</Label>
          <Switch
            id="quick-event-all-day"
            checked={draft.allDay}
            onCheckedChange={(allDay) => pick({ allDay })}
          />
        </div>
        {!draft.allDay && (
          <>
            <Input
              type="time"
              aria-label={text.startTime}
              value={draft.start_time}
              onChange={(change) => change.target.value && pick({ start: change.target.value })}
            />
            <Input
              type="time"
              aria-label={text.endTime}
              value={draft.end_time}
              onChange={(change) => change.target.value && pick({ end: change.target.value })}
            />
          </>
        )}
        <div className="col-span-2">
          <Select
            value={reminderValue}
            onValueChange={(next) =>
              pick({ reminder: next === NONE ? null : parseTimingKey(next) })
            }
          >
            <SelectTrigger aria-label={text.reminder} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{text.reminderNone}</SelectItem>
              {reminderKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {reminderLabel(parseTimingKey(key), kind)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={!ready || saving}>
        {pl.quickAdd.add}
      </Button>
    </form>
  )
}
