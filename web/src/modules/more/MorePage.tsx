import { Link } from '@tanstack/react-router'
import { pl } from '@/i18n/pl'
import { gridModules } from '@/modules/registry'

export function MorePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{pl.nav.more}</h1>
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {gridModules.map(({ id, icon: Icon }) => (
          <Link
            key={id}
            to="/more/$moduleId"
            params={{ moduleId: id }}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-card p-2 text-center text-xs font-medium text-card-foreground transition-transform active:scale-95"
          >
            <Icon aria-hidden className="size-6 text-brand-text" />
            {pl.modules[id]}
          </Link>
        ))}
      </div>
    </>
  )
}
