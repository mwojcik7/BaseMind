import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { pl } from '@/i18n/pl'
import { getTheme, setTheme, THEMES, type Theme } from '@/lib/theme'

const THEME_ICONS: Record<Theme, LucideIcon> = { system: Monitor, light: Sun, dark: Moon }

export function SettingsPage() {
  const [selected, setSelected] = useState(getTheme)

  function select(theme: Theme) {
    setTheme(theme)
    setSelected(theme)
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
    </>
  )
}
