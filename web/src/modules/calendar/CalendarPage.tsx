import { Link, Outlet } from '@tanstack/react-router'
import { Layers, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRecords } from '@/db/hooks'
import { pl } from '@/i18n/pl'
import { useToday } from '@/lib/use-today'
import { AgendaView } from '@/modules/calendar/AgendaView'
import { MonthView } from '@/modules/calendar/MonthView'
import { weekDays } from '@/modules/calendar/timeline'
import { TimelineView } from '@/modules/calendar/TimelineView'
import { events } from '@/modules/calendar/repo'
import {
  CALENDAR_LAYERS,
  layerShown,
  useCalendarSettings,
  withLayer,
  type CalendarSettings,
} from '@/modules/calendar/settings'
import {
  CALENDAR_VIEWS,
  goToToday,
  setCalendarView,
  useCalendarView,
  useWideScreen,
  type CalendarView,
} from '@/modules/calendar/view'
import { tasks } from '@/modules/tasks/repo'
import { saveCalendarSettings } from '@/sync/engine'

const text = pl.calendar

function LayersSheet({ settings }: { settings: CalendarSettings }) {
  const save = (next: CalendarSettings) => void saveCalendarSettings(next)

  return (
    <BottomSheet
      title={text.layers}
      trigger={
        <Button type="button" variant="ghost" size="icon" aria-label={text.layers}>
          <Layers aria-hidden />
        </Button>
      }
    >
      <div className="flex flex-col gap-1 pb-4">
        {CALENDAR_LAYERS.map((layer) => (
          <div key={layer} className="flex min-h-12 items-center justify-between gap-4">
            <Label htmlFor={`layer-${layer}`}>{text.layerNames[layer]}</Label>
            <Switch
              id={`layer-${layer}`}
              checked={layerShown(settings, layer)}
              onCheckedChange={(shown) => save(withLayer(settings, layer, shown))}
            />
          </div>
        ))}
        <div className="my-2 h-px bg-border" />
        <div className="flex min-h-12 items-center justify-between gap-4">
          <Label htmlFor="layer-show-done">{text.showDone}</Label>
          <Switch
            id="layer-show-done"
            checked={settings.show_done}
            onCheckedChange={(show_done) => save({ ...settings, show_done })}
          />
        </div>
      </div>
    </BottomSheet>
  )
}

/** Agenda, Day, Week and Month, with the layers (date providers) chosen by the user. */
export function CalendarPage() {
  const allEvents = useRecords(events)
  const allTasks = useRecords(tasks)
  const settings = useCalendarSettings()
  const today = useToday()
  const { view, selected } = useCalendarView()
  const sources = useMemo(
    () => (allEvents && allTasks ? { events: allEvents, tasks: allTasks } : null),
    [allEvents, allTasks],
  )
  const wide = useWideScreen()
  const day = selected ?? today
  // A new event goes on the day picked in the month, or the one shown in Day and Week.
  const newOn = view !== 'agenda' && selected ? { date: selected } : {}

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <PageHeader title={pl.modules.calendar} />
        <div className="flex items-center gap-1">
          {settings && <LayersSheet settings={settings} />}
          <Button type="button" variant="outline" size="sm" onClick={goToToday}>
            {text.goToday}
          </Button>
          <Button asChild size="icon" aria-label={text.newEvent}>
            <Link to="/calendar/new" search={newOn} aria-label={text.newEvent}>
              <Plus aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(next) => setCalendarView(next as CalendarView)}>
        <TabsList aria-label={text.view} className="w-full">
          {CALENDAR_VIEWS.map((name) => (
            <TabsTrigger key={name} value={name}>
              {name === 'week' && !wide ? text.threeDays : text.views[name]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {sources && settings && (
        <>
          {view === 'agenda' && <AgendaView sources={sources} settings={settings} today={today} />}
          {view === 'day' && (
            <TimelineView
              sources={sources}
              settings={settings}
              today={today}
              days={[day]}
              step={1}
            />
          )}
          {view === 'week' && (
            <TimelineView
              sources={sources}
              settings={settings}
              today={today}
              days={weekDays(day, wide)}
              step={wide ? 7 : 3}
            />
          )}
          {view === 'month' && <MonthView sources={sources} settings={settings} today={today} />}
        </>
      )}

      <Outlet />
    </div>
  )
}
