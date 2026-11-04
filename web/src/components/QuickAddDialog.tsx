import { Plus } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'

/** Placeholder for the quick-add bottom sheet built in step 1.10. */
export function QuickAddDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={pl.nav.add}
        className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95"
      >
        <Plus aria-hidden className="size-6" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-2xl bg-popover p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-popover-foreground">
          <Dialog.Title className="text-lg font-semibold">{pl.quickAdd.title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {pl.quickAdd.description}
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button variant="secondary" className="mt-6 min-h-11 w-full">
              {pl.quickAdd.close}
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
