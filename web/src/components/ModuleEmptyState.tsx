import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { pl } from '@/i18n/pl'

interface ModuleEmptyStateProps {
  title: string
  icon: LucideIcon
  stage: number
  children?: ReactNode
}

/** Screen for a module that does not exist yet. */
export function ModuleEmptyState({ title, icon: Icon, stage, children }: ModuleEmptyStateProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <Icon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{pl.module.comingSoon(stage)}</p>
        {children}
      </div>
    </>
  )
}
