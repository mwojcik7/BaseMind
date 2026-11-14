import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { pl } from '@/i18n/pl'
import {
  answerCompletionPrompt,
  closeCompletionPrompt,
  useCompletionPrompt,
} from '@/modules/tasks/completion'

/** Asks what to do with open subtasks when their task is completed. Rendered once, in the shell. */
export function CompleteTaskPrompt() {
  const { task, openSubtasks } = useCompletionPrompt()

  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && closeCompletionPrompt()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pl.tasks.completeTitle}</DialogTitle>
          <DialogDescription>
            {task ? pl.tasks.completeDescription(task.title, openSubtasks) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={() => void answerCompletionPrompt(true)}>{pl.tasks.completeAll}</Button>
          <Button variant="secondary" onClick={() => void answerCompletionPrompt(false)}>
            {pl.tasks.completeOnlyTask}
          </Button>
          <Button variant="ghost" onClick={closeCompletionPrompt}>
            {pl.common.cancel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
