import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title?: string
  description: string
  /** Button or link leading to the next step. */
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Icon aria-hidden className="mb-1 size-10 text-muted-foreground" />
      {title && <p className="font-semibold">{title}</p>}
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
