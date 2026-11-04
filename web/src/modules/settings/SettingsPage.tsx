import { Link } from '@tanstack/react-router'
import { ChevronRight, MonitorSmartphone, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { logOut, useAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/form-errors'
import { getTheme, setTheme, THEMES, type Theme } from '@/lib/theme'

const THEME_ICONS: Record<Theme, LucideIcon> = { system: Monitor, light: Sun, dark: Moon }

export function SettingsPage() {
  const [selected, setSelected] = useState(getTheme)
  const [loggingOut, setLoggingOut] = useState(false)
  const account = useAuth((state) => state.account)

  function select(theme: Theme) {
    setTheme(theme)
    setSelected(theme)
  }

  async function handleLogOut() {
    setLoggingOut(true)
    try {
      await logOut()
    } catch (error) {
      toast.error(errorMessage(error))
      setLoggingOut(false)
    }
  }

  return (
    <>
      <PageHeader title={pl.settings.title} />

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">{pl.settings.theme}</legend>
        <div className="mt-2 flex flex-col gap-2">
          {THEMES.map((theme) => {
            const Icon = THEME_ICONS[theme]
            return (
              <label
                key={theme}
                className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg bg-card px-4 text-sm font-medium text-card-foreground outline-2 outline-transparent has-checked:outline-primary has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <Icon aria-hidden className="size-5 text-muted-foreground" />
                {pl.settings.themes[theme]}
                <input
                  type="radio"
                  name="theme"
                  checked={selected === theme}
                  onChange={() => select(theme)}
                  className="ml-auto size-4 accent-primary"
                />
              </label>
            )
          })}
        </div>
      </fieldset>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">{pl.settings.account}</h2>
        {account && <p className="mt-1 text-sm text-muted-foreground">{account.user.email}</p>}
        <Link
          to="/settings/sessions"
          className="mt-2 flex min-h-14 items-center gap-3 rounded-lg bg-card px-4 text-sm font-medium text-card-foreground"
        >
          <MonitorSmartphone aria-hidden className="size-5 text-muted-foreground" />
          {pl.settings.sessions}
          <ChevronRight aria-hidden className="ml-auto size-5 text-muted-foreground" />
        </Link>
        <Button
          variant="secondary"
          className="mt-4 w-full"
          disabled={loggingOut}
          onClick={() => void handleLogOut()}
        >
          {pl.settings.logOut}
        </Button>
      </section>
    </>
  )
}
