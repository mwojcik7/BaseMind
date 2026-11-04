import { Link } from '@tanstack/react-router'
import { Calendar, CheckSquare, LayoutGrid, Sun, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { QuickAddDialog } from '@/components/QuickAddDialog'
import { pl } from '@/i18n/pl'

interface NavLinkProps {
  to: ComponentProps<typeof Link>['to']
  label: string
  icon: LucideIcon
  exact?: boolean
}

function NavLink({ to, label, icon: Icon, exact = false }: NavLinkProps) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-brand-text"
    >
      <Icon aria-hidden className="size-5" />
      {label}
    </Link>
  )
}

export function BottomNav() {
  return (
    <nav
      aria-label={pl.nav.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 items-center">
        <NavLink to="/" label={pl.nav.today} icon={Sun} exact />
        <NavLink to="/tasks" label={pl.nav.tasks} icon={CheckSquare} />
        <QuickAddDialog />
        <NavLink to="/calendar" label={pl.nav.calendar} icon={Calendar} />
        <NavLink to="/more" label={pl.nav.more} icon={LayoutGrid} />
      </div>
    </nav>
  )
}
