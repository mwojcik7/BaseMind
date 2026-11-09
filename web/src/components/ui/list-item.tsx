import { cn } from 'cn'
import type { LucideIcon } from 'lucide-react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

// Finger travel needed to trigger an action. The row itself moves less, as it resists the drag.
const SWIPE_DISTANCE = 100

const ACTION_COLORS = {
  brand: 'bg-primary',
  success: 'bg-success-strong',
  danger: 'bg-destructive',
}

export interface SwipeAction {
  label: string
  icon: LucideIcon
  color: keyof typeof ACTION_COLORS
  onAction: () => void
}

interface ListItemProps {
  title: ReactNode
  description?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  /** Interactive element before the row's content, such as a checkbox. */
  control?: ReactNode
  onPress?: () => void
  /** Revealed by swiping right. */
  startAction?: SwipeAction
  /** Revealed by swiping left. */
  endAction?: SwipeAction
}

function SwipeBackground({
  action,
  side,
  opacity,
}: {
  action: SwipeAction
  side: 'start' | 'end'
  opacity: ReturnType<typeof useTransform<number, number>>
}) {
  return (
    <motion.div
      aria-hidden
      style={{ opacity }}
      className={cn(
        // 1 px inset, so the color doesn't show around the row's rounded edge.
        'absolute inset-px flex items-center gap-2 rounded-lg px-4 text-sm font-medium text-white',
        side === 'end' && 'justify-end',
        ACTION_COLORS[action.color],
      )}
    >
      <action.icon className="size-5" />
      {action.label}
    </motion.div>
  )
}

/**
 * List row with optional swipe actions. Swiping needs a touch screen, so the same actions are
 * also buttons: visible with a mouse, and reachable by keyboard and screen readers on touch.
 */
export function ListItem({
  title,
  description,
  leading,
  trailing,
  control,
  onPress,
  startAction,
  endAction,
}: ListItemProps) {
  const x = useMotionValue(0)
  const startOpacity = useTransform(x, [0, 16], [0, 1])
  const endOpacity = useTransform(x, [-16, 0], [1, 0])
  const dragged = useRef(false)
  const actions = [startAction, endAction].filter((action) => action !== undefined)

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const action =
      info.offset.x > SWIPE_DISTANCE
        ? startAction
        : info.offset.x < -SWIPE_DISTANCE
          ? endAction
          : undefined
    if (action) {
      navigator.vibrate?.(10)
      action.onAction()
    }
  }

  const content = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {description && (
          <span className="block truncate text-sm text-muted-foreground">{description}</span>
        )}
      </span>
      {trailing}
    </>
  )

  return (
    <li className="relative overflow-hidden rounded-lg">
      {startAction && <SwipeBackground action={startAction} side="start" opacity={startOpacity} />}
      {endAction && <SwipeBackground action={endAction} side="end" opacity={endOpacity} />}
      <motion.div
        style={{ x }}
        drag={actions.length > 0 ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: endAction ? 0.6 : 0, right: startAction ? 0.6 : 0 }}
        onDragStart={() => {
          dragged.current = true
        }}
        onDragEnd={handleDragEnd}
        className="relative flex touch-pan-y items-center bg-card text-card-foreground"
      >
        {control && <span className="flex shrink-0 items-center pl-4">{control}</span>}
        {onPress ? (
          <button
            type="button"
            className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left"
            onPointerDown={() => {
              dragged.current = false
            }}
            onClick={() => {
              // A swipe that ends on the row must not also count as a tap.
              if (!dragged.current) {
                onPress()
              }
            }}
          >
            {content}
          </button>
        ) : (
          <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2">{content}</div>
        )}
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            size="icon-sm"
            aria-label={action.label}
            title={action.label}
            onClick={action.onAction}
            // not-sr-only resets size and margin, so they are set again for the mouse.
            className="sr-only pointer-fine:not-sr-only pointer-fine:mr-1 pointer-fine:size-9"
          >
            <action.icon aria-hidden />
          </Button>
        ))}
      </motion.div>
    </li>
  )
}
