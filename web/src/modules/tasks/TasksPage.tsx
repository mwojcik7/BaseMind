import { CheckSquare } from 'lucide-react'
import { ModuleEmptyState } from '@/components/ModuleEmptyState'
import { pl } from '@/i18n/pl'

export function TasksPage() {
  return <ModuleEmptyState title={pl.modules.tasks} icon={CheckSquare} stage={2} />
}
