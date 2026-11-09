import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { errorMessage } from '@/lib/form-errors'

const UNDO_VISIBLE_MS = 8000

interface Deletable {
  softDelete: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
}

/** Deletes at once and offers a way back, as a swipe is easy to make by accident. */
export async function deleteWithUndo(repository: Deletable, id: string, message: string) {
  await repository.softDelete(id)

  toast.success(message, {
    duration: UNDO_VISIBLE_MS,
    action: {
      label: pl.common.undo,
      onClick: () => {
        repository.restore(id).catch((error: unknown) => toast.error(errorMessage(error)))
      },
    },
  })
}
