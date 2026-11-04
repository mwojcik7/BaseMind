import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { pl as dateLocale } from 'date-fns/locale'
import { MonitorSmartphone, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { api } from '@/lib/api'
import { describeDevice } from '@/lib/device'
import { errorMessage } from '@/lib/form-errors'

interface DeviceSession {
  id: string
  ip_address: string | null
  user_agent: string | null
  last_active_at: string
  is_current: boolean
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ sessions: DeviceSession[] }>('/api/sessions')
      setSessions(data.sessions)
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [])

  useEffect(() => {
    // Sets state only after the request finishes, not during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function end(path: string, message: string) {
    try {
      await api.delete(path)
      toast.success(message)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const hasOthers = sessions?.some((session) => !session.is_current) ?? false

  return (
    <>
      <PageHeader title={pl.sessions.title} description={pl.sessions.description} />

      {loadError && (
        <EmptyState
          icon={WifiOff}
          description={loadError}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {pl.sessions.retry}
            </Button>
          }
        />
      )}

      {sessions && (
        <ul className="mt-6 flex flex-col gap-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex min-h-14 items-center gap-3 rounded-lg bg-card px-4 py-3 text-card-foreground"
            >
              <MonitorSmartphone aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {describeDevice(session.user_agent) ?? pl.sessions.unknownDevice}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pl.sessions.lastActive(
                    formatDistanceToNow(new Date(session.last_active_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    }),
                  )}
                  {session.ip_address && ` · ${session.ip_address}`}
                </p>
              </div>
              {session.is_current ? (
                <Badge variant="brand">{pl.sessions.current}</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void end(`/api/sessions/${session.id}`, pl.sessions.ended)}
                >
                  {pl.sessions.end}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasOthers && (
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => void end('/api/sessions', pl.sessions.endedOthers)}
        >
          {pl.sessions.endOthers}
        </Button>
      )}

      <Link to="/settings" className="mt-6 block text-sm font-medium text-brand-text">
        {pl.sessions.back}
      </Link>
    </>
  )
}
