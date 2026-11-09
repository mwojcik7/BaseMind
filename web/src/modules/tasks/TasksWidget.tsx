import { Link } from '@tanstack/react-router'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toaster'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import { useToday } from '@/lib/use-today'
import { completeTask, tasks } from '@/modules/tasks/repo'
import { todayTasks } from '@/modules/tasks/selectors'

const MAX_SHOWN = 5

export function TasksWidget() {
  const all = useRecords(tasks)
  const today = useToday()

  if (all === undefined) {
    return null
  }

  const due = todayTasks(all, today)
  const items = [...due.overdue, ...due.today]

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{pl.today.tasksEmpty}</p>
  }

  return (
    <>
      <ul>
        {items.slice(0, MAX_SHOWN).map((task) => (
          <li key={task.id} className="flex min-h-11 items-center gap-3">
            <Checkbox
              aria-label={pl.tasks.complete(task.title)}
              checked={false}
              onCheckedChange={() =>
                completeTask(task.id).catch((error: unknown) => toast.error(errorMessage(error)))
              }
            />
            <Link
              to="/tasks/$taskId"
              params={{ taskId: task.id }}
              className={`min-w-0 flex-1 truncate py-2 text-sm ${task.due_date !== today ? 'text-destructive' : ''}`}
            >
              {task.title}
            </Link>
          </li>
        ))}
      </ul>
      {items.length > MAX_SHOWN && (
        <Link to="/tasks" className="mt-1 inline-block py-2 text-sm font-medium text-brand-text">
          {pl.today.tasksMore(items.length - MAX_SHOWN)}
        </Link>
      )}
    </>
  )
}
