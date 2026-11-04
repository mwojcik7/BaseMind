import { Plus } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'

interface QuickAddDialogProps {
  /** Round FAB in the bottom navigation, or a full-width button in the sidebar. */
  variant?: 'fab' | 'sidebar'
}

/** Placeholder for the quick-add sheet built in step 1.10. */
export function QuickAddDialog({ variant = 'fab' }: QuickAddDialogProps) {
  return (
    <BottomSheet
      title={pl.quickAdd.title}
      description={pl.quickAdd.description}
      trigger={
        variant === 'fab' ? (
          <button
            type="button"
            aria-label={pl.nav.add}
            className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-raised transition-transform active:scale-95"
          >
            <Plus aria-hidden className="size-6" />
          </button>
        ) : (
          <Button className="mt-2 h-10 w-full">
            <Plus aria-hidden />
            {pl.nav.add}
          </Button>
        )
      }
    />
  )
}
