import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Link, useNavigate, useParams, useRouter, useSearch } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect, useState, type KeyboardEvent } from 'react'
import { Controller, useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/FormField'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { useRecord, useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { deleteWithUndo } from '@/lib/delete-with-undo'
import { errorMessage } from '@/lib/form-errors'
import { finishWithUndo, requestCompleteTask } from '@/modules/tasks/completion'
import { firstDueDate } from '@/modules/tasks/recurrence'
import { findTaskReminder, type ReminderOffset } from '@/modules/tasks/reminder'
import {
  createTask,
  DEFAULT_PRIORITY,
  removableTasks,
  reopenTask,
  taskLists,
  tasks,
  updateTask,
  type Task,
} from '@/modules/tasks/repo'
import { subtasksIn } from '@/modules/tasks/selectors'
import { RepeatField } from '@/modules/tasks/RepeatField'
import { ListSelect, ReminderSelect } from '@/modules/tasks/TaskFields'

// Loaded only when the preview is opened: the Markdown parser is the biggest part.
const MarkdownPreview = lazy(() => import('@/components/MarkdownPreview'))

// Radix's Select can't have an empty value.
const INBOX = 'inbox'
const PRIORITIES = [1, 2, 3, 4]

const taskFormSchema = z.object({
  title: z.string().trim().min(1, pl.tasks.titleRequired).max(500, pl.tasks.titleTooLong),
  notes: z.string().max(10_000, pl.tasks.notesTooLong),
  priority: z.number().int().min(1).max(4),
  list: z.string(),
  due_date: z.string().nullable(),
  due_time: z.string(),
  reminder: z.number().int().min(0).nullable(),
  repeat: z.object({
    rrule: z.string().nullable(),
    repeat_from: z.enum(['due', 'completion']),
    repeat_remaining: z.number().int().min(1).max(999).nullable(),
  }),
})

type TaskFormValues = z.infer<typeof taskFormSchema>

function report(error: unknown) {
  toast.error(errorMessage(error))
}

const FIELD_CLASS =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'

function NotesField({
  registration,
  value,
  error,
}: {
  registration: UseFormRegisterReturn<'notes'>
  value: string
  error?: string
}) {
  const [preview, setPreview] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="task-notes">{pl.tasks.notes}</Label>
        <div className="flex rounded-md bg-secondary p-0.5 text-sm" role="group">
          {[false, true].map((mode) => (
            <button
              key={String(mode)}
              type="button"
              aria-pressed={preview === mode}
              onClick={() => setPreview(mode)}
              className="min-h-9 rounded px-3 font-medium text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
            >
              {mode ? pl.tasks.notesPreview : pl.tasks.notesEdit}
            </button>
          ))}
        </div>
      </div>

      {/* Kept mounted while previewing, so the form keeps the value and the field. */}
      <textarea
        id="task-notes"
        rows={4}
        hidden={preview}
        aria-describedby="task-notes-hint"
        className={FIELD_CLASS}
        {...registration}
      />
      {preview ? (
        <div className="min-h-24 rounded-md border border-input px-3 py-2">
          {value.trim() ? (
            <Suspense fallback={null}>
              <MarkdownPreview text={value} />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">{pl.tasks.notesEmpty}</p>
          )}
        </div>
      ) : (
        <p id="task-notes-hint" className="text-xs text-muted-foreground">
          {pl.tasks.notesMarkdownHint}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}

/** Each subtask opens like any task; completing one never asks, as it has no subtasks. */
function Subtasks({ task }: { task: Task }) {
  const all = useRecords(tasks)
  const [title, setTitle] = useState('')
  const items = all ? subtasksIn(all, task.id) : []

  async function add() {
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }

    // Cleared at once, not after saving: the next subtask may be typed in the meantime.
    setTitle('')
    try {
      await createTask({
        list_id: task.list_id,
        parent_id: task.id,
        title: trimmed.slice(0, 500),
        notes: null,
        priority: DEFAULT_PRIORITY,
        status: 'todo',
        due_date: null,
        due_time: null,
        completed_at: null,
      })
    } catch (error) {
      setTitle(trimmed)
      report(error)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Inside the task's form: Enter adds a subtask instead of saving the task.
    if (event.key === 'Enter') {
      event.preventDefault()
      void add()
    }
  }

  return (
    <section aria-labelledby="task-subtasks" className="flex flex-col gap-2">
      <h3 id="task-subtasks" className="text-sm font-medium">
        {pl.tasks.subtasks}
      </h3>
      {items.length > 0 && (
        <ul className="flex flex-col">
          {items.map((subtask) => {
            const done = subtask.status === 'done'
            return (
              <li key={subtask.id} className="flex min-h-11 items-center gap-3">
                <Checkbox
                  aria-label={
                    done ? pl.tasks.reopen(subtask.title) : pl.tasks.complete(subtask.title)
                  }
                  checked={done}
                  onCheckedChange={() =>
                    done
                      ? void reopenTask(subtask.id).catch(report)
                      : void requestCompleteTask(subtask)
                  }
                />
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: subtask.id }}
                  // Moving between a task and its subtasks keeps one entry: closing returns to the list.
                  replace
                  className={`min-w-0 flex-1 truncate py-2 text-sm ${done ? 'text-muted-foreground line-through' : ''}`}
                >
                  {subtask.title}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <Input
        aria-label={pl.tasks.addSubtask}
        placeholder={pl.tasks.addSubtaskPlaceholder}
        value={title}
        enterKeyHint="enter"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </section>
  )
}

function TaskForm({
  task,
  parent,
  reminder,
  onDone,
}: {
  task: Task
  parent: Task | undefined
  reminder: ReminderOffset
  onDone: () => void
}) {
  const lists = useRecords(taskLists)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      notes: task.notes ?? '',
      priority: task.priority,
      list: task.list_id ?? INBOX,
      due_date: task.due_date,
      due_time: task.due_time ?? '',
      reminder,
      repeat: {
        rrule: task.rrule ?? null,
        repeat_from: task.repeat_from ?? 'due',
        repeat_remaining: task.repeat_remaining ?? null,
      },
    },
  })
  const dueDate = useWatch({ control, name: 'due_date' })
  const notes = useWatch({ control, name: 'notes' })

  const today = format(new Date(), 'yyyy-MM-dd')

  const onSubmit = handleSubmit(async (values) => {
    // Subtasks don't repeat: the parent's series reopens them instead.
    const { rrule, repeat_from, repeat_remaining } = task.parent_id
      ? { rrule: null, repeat_from: 'due' as const, repeat_remaining: null }
      : values.repeat
    // A series starts somewhere: without a date, at its first occurrence from today.
    const dueDate = values.due_date ?? (rrule ? (firstDueDate(rrule, today) ?? today) : null)
    // The pattern's date stays unless the date or the rule was changed here.
    const keepAnchor = rrule === task.rrule && dueDate === task.due_date && task.repeat_anchor

    try {
      await updateTask(
        task.id,
        {
          title: values.title,
          notes: values.notes === '' ? null : values.notes,
          priority: values.priority,
          list_id: values.list === INBOX ? null : values.list,
          due_date: dueDate,
          // A time means nothing without a day.
          due_time: dueDate && values.due_time ? values.due_time : null,
          rrule,
          repeat_from,
          repeat_anchor: rrule ? (keepAnchor ? task.repeat_anchor : dueDate) : null,
          repeat_remaining: rrule ? repeat_remaining : null,
        },
        values.reminder,
      )
      onDone()
    } catch (error) {
      report(error)
    }
  })

  async function handleSkip() {
    await finishWithUndo(task.id, 'cancelled')
    onDone()
  }

  async function handleDelete() {
    try {
      await deleteWithUndo(removableTasks, task.id, pl.tasks.deleted)
      onDone()
    } catch (error) {
      report(error)
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {parent && (
        <p className="text-sm text-muted-foreground">
          {pl.tasks.subtaskOf}{' '}
          <Link
            to="/tasks/$taskId"
            params={{ taskId: parent.id }}
            replace
            className="font-medium text-brand-text"
          >
            {parent.title}
          </Link>
        </p>
      )}

      <FormField
        id="task-title"
        label={pl.tasks.title}
        error={errors.title?.message}
        {...register('title')}
      />

      <NotesField registration={register('notes')} value={notes} error={errors.notes?.message} />

      {/* Subtasks are one level deep. Checked on parent_id, not on a live parent: the server
          still sees a subtask whose parent was deleted as one, and would refuse its subtasks. */}
      {!task.parent_id && <Subtasks task={task} />}

      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <fieldset>
            <legend className="text-sm font-medium">{pl.tasks.priority}</legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PRIORITIES.map((priority) => (
                <label
                  key={priority}
                  className="flex h-11 cursor-pointer items-center justify-center rounded-md bg-secondary text-sm font-medium outline-2 outline-transparent has-checked:outline-primary has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  P{priority}
                  <input
                    type="radio"
                    className="sr-only"
                    name={field.name}
                    checked={field.value === priority}
                    onChange={() => field.onChange(priority)}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="task-date">{pl.tasks.dueDate}</Label>
        <Controller
          control={control}
          name="due_date"
          render={({ field }) => (
            <DatePicker id="task-date" value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {dueDate && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="task-time">{pl.tasks.dueTime}</Label>
          <Input id="task-time" type="time" {...register('due_time')} />
        </div>
      )}

      {dueDate && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="task-reminder">{pl.tasks.reminder}</Label>
          <Controller
            control={control}
            name="reminder"
            render={({ field }) => (
              <ReminderSelect id="task-reminder" value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      )}

      {!task.parent_id && (
        <Controller
          control={control}
          name="repeat"
          render={({ field }) => (
            <RepeatField value={field.value} date={dueDate ?? today} onChange={field.onChange} />
          )}
        />
      )}

      {/* A subtask lives with its parent, so only a top-level task picks a list. */}
      {!parent && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="task-list">{pl.tasks.list}</Label>
          <Controller
            control={control}
            name="list"
            render={({ field }) => (
              // A list deleted meanwhile shows as the inbox, but the task keeps it until
              // another one is picked, so restoring the list from the trash brings it back.
              <ListSelect
                id="task-list"
                value={field.value === INBOX ? null : field.value}
                lists={lists ?? []}
                onChange={(next) => field.onChange(next ?? INBOX)}
              />
            )}
          />
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {pl.tasks.save}
      </Button>
      {task.rrule && task.status === 'todo' && (
        <Button type="button" variant="secondary" onClick={() => void handleSkip()}>
          {pl.tasks.repeat.skip}
        </Button>
      )}
      <Button type="button" variant="ghost" onClick={() => void handleDelete()}>
        {pl.tasks.delete}
      </Button>
    </form>
  )
}

/** Has its own address, so the Android back button closes it and search can link to it. */
export function TaskDetail() {
  const { taskId } = useParams({ strict: false }) as { taskId: string }
  const { complete } = useSearch({ strict: false }) as { complete?: true }
  const task = useRecord(tasks, taskId)
  // A deleted parent makes the subtask top-level again (see selectors).
  const parent = useRecord(tasks, task?.parent_id ?? '')
  const reminder = useLiveQuery(
    async () => (await findTaskReminder(taskId))?.offset_minutes ?? null,
    [taskId],
  )
  const navigate = useNavigate()
  const router = useRouter()

  // From the notification's Done button: ask about the open subtasks here.
  useEffect(() => {
    if (complete && task) {
      if (task.status === 'todo') {
        void requestCompleteTask(task)
      }
      void navigate({ to: '/tasks/$taskId', params: { taskId }, search: {}, replace: true })
    }
  }, [complete, task, taskId, navigate])

  function close() {
    if (router.history.canGoBack()) {
      router.history.back()
    } else {
      void navigate({ to: '/tasks' })
    }
  }

  return (
    <BottomSheet
      title={pl.tasks.edit}
      open={task !== undefined}
      onOpenChange={(open) => !open && close()}
    >
      {task && reminder !== undefined && (
        <TaskForm key={task.id} task={task} parent={parent} reminder={reminder} onDone={close} />
      )}
    </BottomSheet>
  )
}
