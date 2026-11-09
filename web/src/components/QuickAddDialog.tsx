import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { quickAddTypes } from '@/modules/quickAddRegistry'

interface QuickAddDialogProps {
  /** Round FAB in the bottom navigation, or a full-width button in the sidebar. */
  variant?: 'fab' | 'sidebar'
}

const SHORTCUT = 'q'

/** A single letter must not fire while typing, or over another open window. */
function shortcutAllowed(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const typing = target.closest?.('input, textarea, select, [contenteditable="true"]')

  return (
    event.key.toLowerCase() === SHORTCUT &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.repeat &&
    !typing &&
    !document.querySelector('[role="dialog"]')
  )
}

/** Mounted only while the sheet is open, so every use starts empty. */
function QuickAddContent({ onDone }: { onDone: () => void }) {
  const [typeId, setTypeId] = useState(quickAddTypes[0].id)
  const type = quickAddTypes.find((candidate) => candidate.id === typeId) ?? quickAddTypes[0]

  return (
    <>
      {/* With a single type there is nothing to choose. */}
      {quickAddTypes.length > 1 && (
        <div className="mb-3 flex gap-2">
          {quickAddTypes.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant={id === type.id ? 'default' : 'secondary'}
              onClick={() => setTypeId(id)}
            >
              <Icon aria-hidden />
              {label}
            </Button>
          ))}
        </div>
      )}
      <type.Form key={type.id} onDone={onDone} />
    </>
  )
}

export function QuickAddDialog({ variant = 'fab' }: QuickAddDialogProps) {
  const [open, setOpen] = useState(false)

  // Only the sidebar's button listens: that is the one with a physical keyboard next to it.
  useEffect(() => {
    if (variant !== 'sidebar') {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (shortcutAllowed(event)) {
        // Otherwise the letter would land in the field that gets focus.
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [variant])

  return (
    <BottomSheet
      title={pl.quickAdd.title}
      open={open}
      onOpenChange={setOpen}
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
          <Button className="mt-2 h-10 w-full" title={pl.quickAdd.shortcutHint}>
            <Plus aria-hidden />
            {pl.nav.add}
          </Button>
        )
      }
    >
      <QuickAddContent onDone={() => setOpen(false)} />
    </BottomSheet>
  )
}
