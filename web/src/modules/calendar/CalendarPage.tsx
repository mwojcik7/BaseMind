import { Calendar } from 'lucide-react'
import { ModuleEmptyState } from '@/components/ModuleEmptyState'
import { pl } from '@/i18n/pl'

export function CalendarPage() {
  return <ModuleEmptyState title={pl.modules.calendar} icon={Calendar} stage={2} />
}
