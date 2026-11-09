import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/FormField'
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
import { toast } from '@/components/ui/toaster'
import { useRecord, useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { deleteWithUndo } from '@/lib/delete-with-undo'
import { errorMessage } from '@/lib/form-errors'
import { findTaskReminder, type ReminderOffset } from '@/modules/tasks/reminder'
import { removableTasks, taskLists, tasks, updateTask, type Task } from '@/modules/tasks/repo'
import { ReminderSelect } from '@/modules/tasks/TaskFields'

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
})

type TaskFormValues = z.infer<typeof taskFormSchema>

function TaskForm({
  task,
  reminder,
  onDone,
}: {
  task: Task
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
    },
  })
  const dueDate = useWatch({ control, name: 'due_date' })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateTask(
        task.id,
        {
          title: values.title,
          notes: values.notes === '' ? null : values.notes,
          priority: values.priority,
          list_id: values.list === INBOX ? null : values.list,
          due_date: values.due_date,
          // A time means nothing without a day.
          due_time: values.due_date && values.due_time ? values.due_time : null,
        },
        values.reminder,
      )
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  async function handleDelete() {
    try {
      await deleteWithUndo(removableTasks, task.id, pl.tasks.deleted)
      onDone()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <FormField
        id="task-title"
        label={pl.tasks.title}
        error={errors.title?.message}
        {...register('title')}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="task-notes">{pl.tasks.notes}</Label>
        <textarea
          id="task-notes"
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          {...register('notes')}
        />
        {errors.notes && <p className="text-sm text-danger">{errors.notes.message}</p>}
      </div>

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

      <div className="flex flex-col gap-2">
        <Label htmlFor="task-list">{pl.tasks.list}</Label>
        <Controller
          control={control}
          name="list"
          render={({ field }) => (
            <Select
              // A task can still point at a list deleted on another device.
              value={lists?.some((list) => list.id === field.value) ? field.value : INBOX}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="task-list" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={INBOX}>{pl.tasks.inbox}</SelectItem>
                {lists?.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {pl.tasks.save}
      </Button>
      <Button type="button" variant="ghost" onClick={() => void handleDelete()}>
        {pl.tasks.delete}
      </Button>
    </form>
  )
}

/** Has its own address, so the Android back button closes it and search can link to it. */
export function TaskDetail() {
  const { taskId } = useParams({ strict: false }) as { taskId: string }
  const task = useRecord(tasks, taskId)
  const reminder = useLiveQuery(
    async () => (await findTaskReminder(taskId))?.offset_minutes ?? null,
    [taskId],
  )
  const navigate = useNavigate()
  const router = useRouter()

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
        <TaskForm key={task.id} task={task} reminder={reminder} onDone={close} />
      )}
    </BottomSheet>
  )
}
