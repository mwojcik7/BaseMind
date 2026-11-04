import { Link } from '@tanstack/react-router'
import { Calendar, CheckSquare, Settings, Sun, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { QuickAddDialog } from '@/components/QuickAddDialog'
import { pl } from '@/i18n/pl'
import { gridModules } from '@/modules/registry'

const LINK_CLASS =
  'flex min-h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-brand-soft data-[status=active]:text-brand-text'

function SidebarIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden className="size-4 shrink-0" />
}

function SidebarLink({
  to,
  label,
  icon,
  exact = false,
}: {
  to: ComponentProps<typeof Link>['to']
  label: string
  icon: LucideIcon
  exact?: boolean
}) {
  return (
    <Link to={to} activeOptions={{ exact }} className={LINK_CLASS}>
      <SidebarIcon icon={icon} />
      {label}
    </Link>
  )
}

/** Desktop navigation. Phones use BottomNav instead. */
export function Sidebar() {
  return (
    <nav
      aria-label={pl.nav.sidebar}
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-1 overflow-y-auto border-r p-3 lg:flex"
    >
      <div className="flex items-center gap-2 px-3 py-2 font-semibold tracking-tight">
        <img src="/app-icons/logo.svg" alt="" className="size-6" />
        BaseMind
      </div>
      <QuickAddDialog variant="sidebar" />
      <div className="mt-2 flex flex-col gap-1">
        <SidebarLink to="/" label={pl.nav.today} icon={Sun} exact />
        <SidebarLink to="/tasks" label={pl.nav.tasks} icon={CheckSquare} />
        <SidebarLink to="/calendar" label={pl.nav.calendar} icon={Calendar} />
      </div>
      <p className="mt-4 px-3 pb-1 text-xs font-medium text-muted-foreground">{pl.nav.modules}</p>
      <div className="flex flex-col gap-1">
        {gridModules.map(({ id, icon }) => (
          <Link key={id} to="/$moduleId" params={{ moduleId: id }} className={LINK_CLASS}>
            <SidebarIcon icon={icon} />
            {pl.modules[id]}
          </Link>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <SidebarLink to="/settings" label={pl.settings.title} icon={Settings} />
      </div>
    </nav>
  )
}
