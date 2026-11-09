import { Download, RefreshCw, Share, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pl } from '@/i18n/pl'
import { dismissInstall, dismissUpdate, install, usePwa } from '@/lib/pwa'

interface BannerProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
}

function Banner({ icon: Icon, title, description, actionLabel, onAction, onDismiss }: BannerProps) {
  return (
    <aside className="mb-3 flex items-center gap-3 rounded-lg bg-card py-2 pl-4 pr-1 text-sm text-card-foreground">
      <Icon aria-hidden className="size-5 shrink-0 text-brand-text" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
      <Button variant="ghost" size="icon" aria-label={pl.pwa.dismiss} onClick={onDismiss}>
        <X aria-hidden />
      </Button>
    </aside>
  )
}

/** A new version comes first: installing an outdated app makes little sense. */
export function PwaBanner() {
  const { applyUpdate, installPrompt, showIosInstructions } = usePwa()

  if (applyUpdate) {
    return (
      <Banner
        icon={RefreshCw}
        title={pl.pwa.updateTitle}
        actionLabel={pl.pwa.updateAction}
        onAction={applyUpdate}
        onDismiss={dismissUpdate}
      />
    )
  }

  if (installPrompt) {
    return (
      <Banner
        icon={Download}
        title={pl.pwa.installTitle}
        description={pl.pwa.installDescription}
        actionLabel={pl.pwa.installAction}
        onAction={() => void install()}
        onDismiss={dismissInstall}
      />
    )
  }

  if (showIosInstructions) {
    return (
      <Banner
        icon={Share}
        title={pl.pwa.installTitle}
        description={pl.pwa.iosInstructions}
        onDismiss={dismissInstall}
      />
    )
  }

  return null
}
