import { format } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { arrangeWidgets, useDashboardLayout } from '@/lib/dashboard'
import { greeting } from '@/modules/today/greeting'
import { dashboardWidgets } from '@/modules/today/widgets'

export function TodayPage() {
  const displayName = useAuth((state) => state.account?.user.display_name)
  const layout = useDashboardLayout()

  const now = new Date()
  // Nothing until the layout is read, so hidden widgets don't flash on start.
  const widgets =
    layout === undefined
      ? []
      : arrangeWidgets(dashboardWidgets, layout).filter((widget) => widget.visible)

  return (
    <>
      <PageHeader
        title={greeting(now, displayName)}
        description={format(now, 'EEEE, d MMMM', { locale: dateLocale })}
      />
      <div className="mt-6 flex flex-col gap-3">
        {widgets.map(({ id, title, Component }) => (
          <Card key={id}>
            <CardHeader>
              <CardTitle>
                <h2 className="text-sm font-semibold">{title}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Component />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
