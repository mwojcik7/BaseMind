import { Outlet } from '@tanstack/react-router'
import { CheckSquare, ListTodo, PartyPopper } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { useToday } from '@/lib/use-today'
import { taskLists, tasks, type Task } from '@/modules/tasks/repo'
import { completedTasks, dayLabel, todayTasks, upcomingTasks } from '@/modules/tasks/selectors'
import { TaskListsTab } from '@/modules/tasks/TaskListsTab'
import { TaskRow } from '@/modules/tasks/TaskRow'

function Section({
  title,
  items,
  today,
  listNames,
}: {
  title?: string
  items: Task[]
  today: string
  listNames: ReadonlyMap<string, string>
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="mt-4">
      {title && <h2 className="mb-2 text-sm font-semibold first-letter:uppercase">{title}</h2>}
      <ul className="flex flex-col gap-2">
        {items.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            today={today}
            listName={task.list_id ? listNames.get(task.list_id) : undefined}
          />
        ))}
      </ul>
    </section>
  )
}

export function TasksPage() {
  const all = useRecords(tasks)
  const lists = useRecords(taskLists)
  const today = useToday()

  const records = all ?? []
  const listNames = new Map(lists?.map((list) => [list.id, list.name]))
  const due = todayTasks(records, today)
  const upcoming = upcomingTasks(records, today)
  const completed = completedTasks(records)
  // Nothing until the first read, so empty states don't flash on start.
  const loaded = all !== undefined && lists !== undefined

  return (
    <>
      <PageHeader title={pl.modules.tasks} />

      <Tabs defaultValue="today" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="today">{pl.tasks.tabs.today}</TabsTrigger>
          <TabsTrigger value="upcoming">{pl.tasks.tabs.upcoming}</TabsTrigger>
          <TabsTrigger value="lists">{pl.tasks.tabs.lists}</TabsTrigger>
          <TabsTrigger value="done">{pl.tasks.tabs.done}</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Section
            title={pl.tasks.overdue}
            items={due.overdue}
            today={today}
            listNames={listNames}
          />
          <Section title={pl.tasks.today} items={due.today} today={today} listNames={listNames} />
          {loaded && due.overdue.length + due.today.length === 0 && (
            <EmptyState icon={PartyPopper} description={pl.tasks.emptyToday} />
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {upcoming.map(({ date, tasks: items }) => (
            <Section
              key={date ?? 'none'}
              title={date ? dayLabel(date, today) : pl.tasks.noDate}
              items={items}
              today={today}
              listNames={listNames}
            />
          ))}
          {loaded && upcoming.length === 0 && (
            <EmptyState icon={ListTodo} description={pl.tasks.emptyUpcoming} />
          )}
        </TabsContent>

        <TabsContent value="lists">
          {loaded && <TaskListsTab all={records} lists={lists} today={today} />}
        </TabsContent>

        <TabsContent value="done">
          <Section items={completed} today={today} listNames={listNames} />
          {loaded && completed.length === 0 && (
            <EmptyState icon={CheckSquare} description={pl.tasks.emptyDone} />
          )}
        </TabsContent>
      </Tabs>

      {/* The task sheet opens over the page, so the chosen tab survives it. */}
      <Outlet />
    </>
  )
}
