import { CheckSquare, Tag, type LucideIcon } from 'lucide-react'
import { pl } from '@/i18n/pl'

/** How each search source looks in the results, keyed by its entity (see sources.ts). */
export const searchGroups: Record<string, { icon: LucideIcon; label: string }> = {
  tasks: { icon: CheckSquare, label: pl.search.groups.tasks },
  tags: { icon: Tag, label: pl.search.groups.tags },
}
