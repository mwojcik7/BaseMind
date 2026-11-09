import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { pl } from '@/i18n/pl'
import { useKeyboardInset } from '@/lib/use-keyboard-inset'

const CLOSE_DISTANCE = 100
const CLOSE_VELOCITY = 500

interface BottomSheetProps {
  title: string
  description?: string
  /** Element that opens the sheet. Leave it out when controlling `open` from outside. */
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

/** Panel sliding in from the bottom. Close it by dragging the handle down. */
export function BottomSheet({
  title,
  description,
  trigger,
  open: controlledOpen,
  onOpenChange,
  children,
}: BottomSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const dragControls = useDragControls()
  const keyboardInset = useKeyboardInset()

  function setOpen(next: boolean) {
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.y > CLOSE_DISTANCE || info.velocity.y > CLOSE_VELOCITY) {
      setOpen(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <AnimatePresence>
        {open && (
          // forceMount hands the enter and exit animations over to motion.
          <Dialog.Portal key="sheet" forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              {...(description ? {} : { 'aria-describedby': undefined })}
            >
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-lg flex-col rounded-t-2xl bg-popover text-popover-foreground shadow-raised outline-none"
                // Sits on top of the on-screen keyboard, using all the room left above it.
                style={
                  keyboardInset > 0
                    ? {
                        bottom: keyboardInset,
                        maxHeight: `calc(100dvh - ${keyboardInset}px - 1rem)`,
                      }
                    : undefined
                }
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
                drag="y"
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.8 }}
                onDragEnd={handleDragEnd}
              >
                {/* Only the handle drags, so the content below can scroll normally. */}
                <div
                  aria-hidden
                  className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center"
                  onPointerDown={(event) => dragControls.start(event)}
                >
                  <div className="h-1 w-10 rounded-full bg-border" />
                </div>
                <div className="overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                  <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
                  {description && (
                    <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                      {description}
                    </Dialog.Description>
                  )}
                  <div className="mt-4">{children}</div>
                </div>
                <Dialog.Close className="sr-only">{pl.common.close}</Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
