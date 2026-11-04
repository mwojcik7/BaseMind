import { Link } from '@tanstack/react-router'
import { ChevronRight, Settings } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { pl } from '@/i18n/pl'
import { gridModules } from '@/modules/registry'

export function MorePage() {
  return (
    <>
      <PageHeader title={pl.nav.more} />
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {gridModules.map(({ id, icon: Icon }) => (
          <Link
            key={id}
            to="/$moduleId"
            params={{ moduleId: id }}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-card p-2 text-center text-xs font-medium text-card-foreground transition-transform active:scale-95"
          >
            <Icon aria-hidden className="size-6 text-brand-text" />
            {pl.modules[id]}
          </Link>
        ))}
      </div>
      <Link
        to="/settings"
        className="mt-3 flex min-h-14 items-center gap-3 rounded-lg bg-card px-4 text-sm font-medium text-card-foreground"
      >
        <Settings aria-hidden className="size-5 text-muted-foreground" />
        {pl.settings.title}
        <ChevronRight aria-hidden className="ml-auto size-5 text-muted-foreground" />
      </Link>
    </>
  )
}
