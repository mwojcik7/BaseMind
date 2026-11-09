import { pl } from '@/i18n/pl'

// Empty states until the modules exist; each module replaces its widget with a real one.

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>
}

export function TasksWidget() {
  return <Empty text={pl.today.tasksEmpty} />
}

export function EventsWidget() {
  return <Empty text={pl.today.eventsEmpty} />
}

export function ExpensesWidget() {
  return <Empty text={pl.today.expensesEmpty} />
}
