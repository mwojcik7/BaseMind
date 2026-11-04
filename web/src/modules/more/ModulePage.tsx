import { getRouteApi, Link } from '@tanstack/react-router'
import { ModuleEmptyState } from '@/components/ModuleEmptyState'
import { NotFound } from '@/components/NotFound'
import { pl } from '@/i18n/pl'
import { getModule } from '@/modules/registry'

const route = getRouteApi('/more/$moduleId')

export function ModulePage() {
  const { moduleId } = route.useParams()
  const module = getModule(moduleId)

  if (!module) {
    return <NotFound />
  }

  return (
    <ModuleEmptyState title={pl.modules[module.id]} icon={module.icon} stage={module.stage}>
      <Link to="/more" className="text-sm font-medium text-brand-text">
        {pl.module.back}
      </Link>
    </ModuleEmptyState>
  )
}
