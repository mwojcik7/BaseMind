import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams, useRouter, useSearch } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { CUSTOM_REMINDER, CustomReminderForm } from '@/components/CustomReminderForm'
import { FormField } from '@/components/FormField'
import { MarkdownField } from '@/components/MarkdownField'
import { BottomSheet } from '@/components/ui/bottom-sheet'
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
import { useRecord } from '@/db/hooks'
import { timingOfReminder } from '@/db/reminders'
import { pl } from '@/i18n/pl'
import { deleteWithUndo } from '@/lib/delete-with-undo'
import { errorMessage } from '@/lib/form-errors'
import { reminderLabel } from '@/lib/reminder-label'
import { compareTimings, parseTimingKey, timingKey } from '@/lib/reminder-moment'
import { EVENT_COLOR_CLASS } from '@/modules/calendar/colors'
import { defaultSpan, endsAfterStart, moveStart, repeatOf, rruleOf } from '@/modules/calendar/form'
import {
  DEFAULT_EVENT_REMINDERS,
  findEventReminders,
  reminderOffsetsFor,
  timingsAfterSwitch,
} from '@/modules/calendar/reminder'
import {
  createEvent,
  EVENT_COLORS,
  events,
  removableEvents,
  skipOccurrence,
  unskipOccurrence,
  updateEvent,
  type CalendarEvent,
  type EventColor,
} from '@/modules/calendar/repo'
import { occurrenceStarts } from '@/modules/calendar/series'
import { RepeatField } from '@/modules/tasks/RepeatField'

const text = pl.calendar

const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, text.titleRequired).max(500, text.titleTooLong),
    all_day: z.boolean(),
    start_date: z.string().min(1),
    start_time: z.string(),
    end_date: z.string().min(1),
    end_time: z.string(),
    repeat: z.object({
      rrule: z.string().nullable(),
      repeat_from: z.enum(['due', 'completion']),
      repeat_remaining: z.number().int().min(1).max(999).nullable(),
    }),
    // Timing keys (lib/reminder-moment), e.g. `1440` or `7200@09:00`.
    reminders: z.array(z.string()),
    color: z.enum(EVENT_COLORS).nullable(),
    location: z.string().max(500, text.locationTooLong),
    description: z.string().max(10_000, text.descriptionTooLong),
  })
  .superRefine((values, context) => {
    if (!values.all_day && (!values.start_time || !values.end_time)) {
      context.addIssue({ code: 'custom', path: ['end_time'], message: text.endBeforeStart })
    } else if (!endsAfterStart(values, values.all_day)) {
      context.addIssue({ code: 'custom', path: ['end_time'], message: text.endBeforeStart })
    }
  })

type EventFormValues = z.infer<typeof eventFormSchema>

function report(error: unknown) {
  toast.error(errorMessage(error))
}

/**
 * Any number of reminders, each removable; the choice offers only what isn't set yet,
 * and "Własne…" opens a form for one made by hand.
 */
function EventReminders({
  value,
  allDay,
  onChange,
}: {
  value: string[]
  allDay: boolean
  onChange: (value: string[]) => void
}) {
  // Remounting the picker after each choice brings its placeholder back.
  const [pickerKey, setPickerKey] = useState(0)
  const [custom, setCustom] = useState(false)
  const kind = allDay ? 'allDay' : 'timed'
  const label = (key: string) => reminderLabel(parseTimingKey(key), kind)
  const remaining = reminderOffsetsFor(allDay)
    .map(timingKey)
    .filter((key) => !value.includes(key))
  const sorted = [...value].sort((a, b) => compareTimings(parseTimingKey(a), parseTimingKey(b)))

  function add(key: string) {
    if (!value.includes(key)) onChange([...value, key])
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{text.reminders}</legend>
      {sorted.length === 0 && <p className="text-sm text-muted-foreground">{text.reminderNone}</p>}
      {sorted.length > 0 && (
        <ul className="flex flex-col gap-1">
          {sorted.map((key) => (
            <li
              key={key}
              className="flex min-h-11 items-center justify-between gap-2 rounded-md bg-secondary pl-3"
            >
              <span className="text-sm">{label(key)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={text.removeReminder(label(key))}
                onClick={() => onChange(value.filter((other) => other !== key))}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {custom ? (
        <CustomReminderForm
          wholeDaysOnly={allDay}
          sameDay={allDay}
          onAdd={(timing) => {
            add(timingKey(timing))
            setCustom(false)
          }}
          onCancel={() => setCustom(false)}
        />
      ) : (
        <Select
          key={pickerKey}
          onValueChange={(next) => {
            if (next === CUSTOM_REMINDER) {
              setCustom(true)
            } else {
              add(next)
            }
            setPickerKey((key) => key + 1)
          }}
        >
          <SelectTrigger id="event-reminder" aria-label={text.addReminder} className="w-full">
            <SelectValue placeholder={text.addReminder} />
          </SelectTrigger>
          <SelectContent>
            {remaining.map((key) => (
              <SelectItem key={key} value={key}>
                {label(key)}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_REMINDER}>{pl.reminders.custom}</SelectItem>
          </SelectContent>
        </Select>
      )}
    </fieldset>
  )
}

function ColorPicker({
  value,
  onChange,
}: {
  value: EventColor | null
  onChange: (value: EventColor | null) => void
}) {
  // No colour chosen is the accent, which is the blue.
  const current = value ?? 'blue'

  return (
    <fieldset>
      <legend className="text-sm font-medium">{text.color}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {EVENT_COLORS.map((color) => (
          <label
            key={color}
            title={text.colors[color]}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full outline-2 outline-offset-2 outline-transparent has-checked:outline-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <span className={`size-8 rounded-full ${EVENT_COLOR_CLASS[color]}`} />
            <input
              type="radio"
              className="sr-only"
              name="event-color"
              aria-label={text.colors[color]}
              checked={current === color}
              onChange={() => onChange(color === 'blue' ? null : color)}
            />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function DateTimeRow({
  label,
  dateId,
  timeId,
  dateLabel,
  timeLabel,
  date,
  time,
  allDay,
  onDate,
  onTime,
}: {
  label: string
  dateId: string
  timeId: string
  dateLabel: string
  timeLabel: string
  date: string
  time: string
  allDay: boolean
  onDate: (date: string) => void
  onTime: (time: string) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <DatePicker
            id={dateId}
            label={dateLabel}
            clearable={false}
            compact
            value={date}
            onChange={(next) => next && onDate(next)}
          />
        </div>
        {!allDay && (
          <Input
            id={timeId}
            aria-label={timeLabel}
            type="time"
            className="w-28"
            value={time}
            onChange={(event) => onTime(event.target.value)}
          />
        )}
      </div>
    </fieldset>
  )
}

function EventForm({
  event,
  reminders,
  occurrence,
  initialDate,
  onDone,
}: {
  event: CalendarEvent | null
  /** Timing keys of the event's reminders. */
  reminders: string[]
  /** The occurrence it was opened from, for a series. */
  occurrence: string | undefined
  /** The day a new event goes on. */
  initialDate: string | undefined
  onDone: () => void
}) {
  const span = event
    ? {
        start_date: event.start_date,
        start_time: event.start_time ?? '',
        end_date: event.end_date,
        end_time: event.end_time ?? '',
      }
    : defaultSpan(new Date(), initialDate)

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title ?? '',
      all_day: event ? event.start_time === null : false,
      ...span,
      repeat: repeatOf(event?.rrule ?? null),
      reminders,
      color: event?.color ?? null,
      location: event?.location ?? '',
      description: event?.description ?? '',
    },
  })
  const [allDay, startDate, startTime, endDate, endTime, description] = useWatch({
    control,
    name: ['all_day', 'start_date', 'start_time', 'end_date', 'end_time', 'description'],
  })

  function setSpan(next: ReturnType<typeof moveStart>) {
    for (const [field, value] of Object.entries(next)) {
      setValue(field as keyof typeof next, value, { shouldValidate: field === 'end_time' })
    }
  }

  function moveStartTo(date: string, time: string) {
    setSpan(moveStart(getValues(), { date, time }, getValues('all_day')))
  }

  function toggleAllDay(on: boolean) {
    setValue('all_day', on)
    setValue(
      'reminders',
      timingsAfterSwitch(getValues('reminders').map(parseTimingKey), on).map(timingKey),
    )
    if (!on && !getValues('start_time')) {
      const times = defaultSpan(new Date(), getValues('start_date'))
      setValue('start_time', times.start_time)
      setValue('end_time', times.end_time)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    const rrule = rruleOf(values.repeat)
    const fields = {
      title: values.title,
      location: values.location.trim() || null,
      description: values.description === '' ? null : values.description,
      start_date: values.start_date,
      start_time: values.all_day ? null : values.start_time,
      end_date: values.end_date,
      end_time: values.all_day ? null : values.end_time,
      rrule,
      // Skipped dates belong to the series they were skipped in.
      exdates: rrule ? (event?.exdates ?? null) : null,
      color: values.color,
    }

    try {
      if (event) {
        await updateEvent(event.id, fields, values.reminders.map(parseTimingKey))
      } else {
        await createEvent(fields, values.reminders.map(parseTimingKey))
        toast.success(text.created)
      }
      onDone()
    } catch (error) {
      report(error)
    }
  })

  async function handleSkip(start: string) {
    if (!event) {
      return
    }
    try {
      await skipOccurrence(event.id, start)
      toast.success(text.skipped, {
        action: {
          label: pl.common.undo,
          onClick: () => void unskipOccurrence(event.id, start).catch(report),
        },
      })
      onDone()
    } catch (error) {
      report(error)
    }
  }

  async function handleDelete() {
    if (!event) {
      return
    }
    try {
      await deleteWithUndo(removableEvents, event.id, text.deleted)
      onDone()
    } catch (error) {
      report(error)
    }
  }

  const canSkip =
    event?.rrule &&
    occurrence &&
    occurrenceStarts(event, occurrence, occurrence).includes(occurrence)

  return (
    <form onSubmit={(submit) => void onSubmit(submit)} className="flex flex-col gap-4">
      <FormField
        id="event-title"
        label={text.title}
        error={errors.title?.message}
        {...register('title')}
      />

      <div className="flex min-h-11 items-center justify-between gap-2">
        <Label htmlFor="event-all-day">{text.allDay}</Label>
        <Controller
          control={control}
          name="all_day"
          render={({ field }) => (
            <Switch id="event-all-day" checked={field.value} onCheckedChange={toggleAllDay} />
          )}
        />
      </div>

      <DateTimeRow
        label={text.start}
        dateId="event-start-date"
        timeId="event-start-time"
        dateLabel={text.startDate}
        timeLabel={text.startTime}
        date={startDate}
        time={startTime}
        allDay={allDay}
        onDate={(date) => moveStartTo(date, getValues('start_time'))}
        onTime={(time) => moveStartTo(getValues('start_date'), time)}
      />
      <DateTimeRow
        label={text.end}
        dateId="event-end-date"
        timeId="event-end-time"
        dateLabel={text.endDate}
        timeLabel={text.endTime}
        date={endDate}
        time={endTime}
        allDay={allDay}
        onDate={(date) => setValue('end_date', date, { shouldValidate: true })}
        onTime={(time) => setValue('end_time', time, { shouldValidate: true })}
      />
      {errors.end_time && <p className="text-sm text-danger">{errors.end_time.message}</p>}

      <Controller
        control={control}
        name="repeat"
        render={({ field }) => (
          <RepeatField
            value={field.value}
            date={startDate}
            fromCompletion={false}
            onChange={field.onChange}
          />
        )}
      />

      <div className="flex flex-col gap-2">
        <Controller
          control={control}
          name="reminders"
          render={({ field }) => (
            <EventReminders value={field.value} allDay={allDay} onChange={field.onChange} />
          )}
        />
      </div>

      <Controller
        control={control}
        name="color"
        render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
      />

      <FormField
        id="event-location"
        label={text.location}
        error={errors.location?.message}
        {...register('location')}
      />

      <MarkdownField
        id="event-description"
        label={text.description}
        registration={register('description')}
        value={description}
        error={errors.description?.message}
      />

      {event?.rrule && <p className="text-sm text-muted-foreground">{text.seriesHint}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {text.save}
      </Button>
      {canSkip && (
        <Button type="button" variant="secondary" onClick={() => void handleSkip(occurrence)}>
          {text.skipOccurrence}
        </Button>
      )}
      {event && (
        <Button type="button" variant="ghost" onClick={() => void handleDelete()}>
          {text.delete}
        </Button>
      )}
    </form>
  )
}

function useClose() {
  const navigate = useNavigate()
  const router = useRouter()

  return () => {
    if (router.history.canGoBack()) {
      router.history.back()
    } else {
      void navigate({ to: '/calendar' })
    }
  }
}

/** Has its own address, so the back button closes it and notifications and search can open it. */
export function EventDetail() {
  const { eventId } = useParams({ strict: false }) as { eventId: string }
  const { date } = useSearch({ strict: false }) as { date?: string }
  const event = useRecord(events, eventId)
  const reminders = useLiveQuery(
    async () =>
      (await findEventReminders(eventId)).map((reminder) => timingKey(timingOfReminder(reminder))),
    [eventId],
  )
  const close = useClose()

  return (
    <BottomSheet
      title={text.editEvent}
      open={event !== undefined}
      onOpenChange={(open) => !open && close()}
    >
      {event && reminders !== undefined && (
        <EventForm
          key={event.id}
          event={event}
          reminders={reminders}
          occurrence={date}
          initialDate={undefined}
          onDone={close}
        />
      )}
    </BottomSheet>
  )
}

export function NewEvent() {
  const { date } = useSearch({ strict: false }) as { date?: string }
  const close = useClose()

  return (
    <BottomSheet title={text.newEvent} open onOpenChange={(open) => !open && close()}>
      <EventForm
        event={null}
        reminders={DEFAULT_EVENT_REMINDERS.map(timingKey)}
        occurrence={undefined}
        initialDate={date}
        onDone={close}
      />
    </BottomSheet>
  )
}
