import { ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { arrangeWidgets, toDashboardLayout, useDashboardLayout } from '@/lib/dashboard'
import { errorMessage } from '@/lib/form-errors'
import { dashboardWidgets } from '@/modules/today/widgets'
import { saveDashboardLayout } from '@/sync/engine'

export function DashboardSettingsPage() {
  const layout = useDashboardLayout()
  const widgets = layout === undefined ? [] : arrangeWidgets(dashboardWidgets, layout)

  function save(next: typeof widgets) {
    saveDashboardLayout(toDashboardLayout(next)).catch((error: unknown) =>
      toast.error(errorMessage(error)),
    )
  }

  function move(index: number, by: -1 | 1) {
    const next = [...widgets]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    save(next)
  }

  function setVisible(id: string, visible: boolean) {
    save(widgets.map((widget) => (widget.id === id ? { ...widget, visible } : widget)))
  }

  return (
    <>
      <PageHeader
        title={pl.dashboardSettings.title}
        description={pl.dashboardSettings.description}
      />

      <ul className="mt-6 flex flex-col gap-2">
        {widgets.map(({ id, title, visible }, index) => (
          <li key={id} className="flex items-center gap-1 rounded-lg bg-card py-2 pr-4 pl-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={pl.dashboardSettings.moveUp(title)}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ChevronUp aria-hidden className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={pl.dashboardSettings.moveDown(title)}
              disabled={index === widgets.length - 1}
              onClick={() => move(index, 1)}
            >
              <ChevronDown aria-hidden className="size-5" />
            </Button>
            <Label htmlFor={`widget-${id}`} className="ml-2 flex-1">
              {title}
            </Label>
            <Switch
              id={`widget-${id}`}
              checked={visible}
              onCheckedChange={(on) => setVisible(id, on)}
            />
          </li>
        ))}
      </ul>
    </>
  )
}
