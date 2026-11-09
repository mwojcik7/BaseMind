import { useNavigate } from '@tanstack/react-router'
import { addDays, format, parseISO } from 'date-fns'
import { CalendarClock, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ListItem } from '@/components/ui/list-item'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { deleteWithUndo } from '@/lib/delete-with-undo'
import { errorMessage } from '@/lib/form-errors'
import { completeTask, moveTask, removableTasks, reopenTask, type Task } from '@/modules/tasks/repo'
import { dueLabel } from '@/modules/tasks/selectors'

function run(action: Promise<unknown>) {
  action.catch((error: unknown) => toast.error(errorMessage(error)))
}

function PriorityMark({ priority }: { priority: number }) {
  if (priority === 4) {
    return null
  }

  return (
    <span
      className={`text-xs font-semibold tabular-nums ${priority === 1 ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      P{priority}
    </span>
  )
}

export function TaskRow({
  task,
  today,
  listName,
}: {
  task: Task
  today: string
  listName?: string
}) {
  const navigate = useNavigate()
  const done = task.status === 'done'
  const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd')
  const due = dueLabel(task, today)
  const overdue = !done && task.due_date !== null && task.due_date < today
  const details = [due, listName].filter(Boolean).join(' · ')

  return (
    <ListItem
      control={
        <Checkbox
          aria-label={done ? pl.tasks.reopen(task.title) : pl.tasks.complete(task.title)}
          checked={done}
          onCheckedChange={() => run(done ? reopenTask(task.id) : completeTask(task.id))}
        />
      }
      title={task.title}
      description={
        details ? <span className={overdue ? 'text-destructive' : ''}>{details}</span> : undefined
      }
      trailing={<PriorityMark priority={task.priority} />}
      onPress={() => void navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })}
      startAction={
        !done && task.due_date !== tomorrow
          ? {
              label: pl.tasks.moveToTomorrow,
              icon: CalendarClock,
              color: 'brand',
              onAction: () => run(moveTask(task.id, tomorrow)),
            }
          : undefined
      }
      endAction={{
        label: pl.tasks.delete,
        icon: Trash2,
        color: 'danger',
        onAction: () => run(deleteWithUndo(removableTasks, task.id, pl.tasks.deleted)),
      }}
    />
  )
}
