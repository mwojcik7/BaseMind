import { format, parseISO } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { create } from 'zustand'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'
import {
  completeTask,
  completeTaskWithSubtasks,
  finishOccurrence,
  openSubtasksOf,
  reopenTasks,
  undoOccurrence,
  type Task,
} from '@/modules/tasks/repo'

interface CompletionPrompt {
  /** The task waiting for an answer about its open subtasks. */
  task: Task | null
  openSubtasks: number
}

export const useCompletionPrompt = create<CompletionPrompt>(() => ({
  task: null,
  openSubtasks: 0,
}))

function report(error: unknown) {
  toast.error(errorMessage(error))
}

/**
 * The one way the app completes a task: with open subtasks the user is asked first
 * (CompleteTaskPrompt), otherwise the task is completed at once.
 */
export async function requestCompleteTask(task: Task) {
  try {
    // Nothing to ask: the subtasks come back open with the next occurrence anyway.
    if (task.rrule) {
      await finishWithUndo(task.id, 'done')
      return
    }

    const open = await openSubtasksOf(task.id)
    if (open.length === 0) {
      await completeTask(task.id)
      return
    }
    useCompletionPrompt.setState({ task, openSubtasks: open.length })
  } catch (error) {
    report(error)
  }
}

const shortDate = (date: string) => format(parseISO(date), 'EEEE, d MMM', { locale: dateLocale })

/** Completes or skips the current occurrence of a repeating task, with "Undo". */
export async function finishWithUndo(id: string, status: 'done' | 'cancelled') {
  try {
    const finished = await finishOccurrence(id, status)
    const text = pl.tasks.repeat
    const message =
      finished.next === null
        ? text.seriesEnded
        : (status === 'done' ? text.nextOn : text.skipped)(shortDate(finished.next))

    toast.success(message, {
      action: {
        label: pl.common.undo,
        onClick: () => void undoOccurrence(finished).catch(report),
      },
    })
  } catch (error) {
    report(error)
  }
}

export function closeCompletionPrompt() {
  useCompletionPrompt.setState({ task: null, openSubtasks: 0 })
}

export async function answerCompletionPrompt(withSubtasks: boolean) {
  const { task } = useCompletionPrompt.getState()
  closeCompletionPrompt()
  if (!task) {
    return
  }

  try {
    if (!withSubtasks) {
      await completeTask(task.id)
      return
    }

    const ids = await completeTaskWithSubtasks(task.id)
    toast.success(pl.tasks.completedWithSubtasks(ids.length - 1), {
      action: {
        label: pl.common.undo,
        onClick: () => void reopenTasks(ids).catch(report),
      },
    })
  } catch (error) {
    report(error)
  }
}
