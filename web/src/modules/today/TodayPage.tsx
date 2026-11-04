import { format } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { pl } from '@/i18n/pl'

const SECTIONS = [
  { title: pl.today.tasks, empty: pl.today.tasksEmpty },
  { title: pl.today.events, empty: pl.today.eventsEmpty },
  { title: pl.today.expenses, empty: pl.today.expensesEmpty },
  { title: pl.today.quickNote, empty: pl.today.quickNoteEmpty },
]

export function TodayPage() {
  const date = format(new Date(), 'EEEE, d MMMM', { locale: dateLocale })

  return (
    <>
      <PageHeader title={pl.nav.today} description={date} />
      <div className="mt-6 flex flex-col gap-3">
        {SECTIONS.map(({ title, empty }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>
                <h2 className="text-sm font-semibold">{title}</h2>
              </CardTitle>
              <CardDescription>{empty}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </>
  )
}
