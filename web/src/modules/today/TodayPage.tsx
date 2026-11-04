import { format } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
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
      <h1 className="text-2xl font-semibold tracking-tight">{pl.nav.today}</h1>
      <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{date}</p>

      <div className="mt-6 flex flex-col gap-3">
        {SECTIONS.map(({ title, empty }) => (
          <section key={title} className="rounded-lg bg-card p-4 text-card-foreground">
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
          </section>
        ))}
      </div>
    </>
  )
}
