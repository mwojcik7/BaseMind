import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { pl } from '@/i18n/pl'

interface ModuleEmptyStateProps {
  title: string
  icon: LucideIcon
  stage: number
  children?: ReactNode
}

/** Screen for a module that does not exist yet. */
export function ModuleEmptyState({ title, icon, stage, children }: ModuleEmptyStateProps) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={icon} description={pl.module.comingSoon(stage)} action={children} />
    </>
  )
}
