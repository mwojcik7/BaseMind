import { useEffect, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toaster'
import { pl } from '@/i18n/pl'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/form-errors'
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/push'
import { notificationTypes, type NotificationType } from '@/modules/notificationTypes'

interface NotificationSettings {
  push: boolean
  email: boolean
  quiet_hours: { start: string; end: string } | null
  digest: { enabled: boolean; time: string }
  /** Missing while the server is older than this app. */
  types?: Record<string, TypeChannels>
}

interface TypeChannels {
  push: boolean
  email: boolean
}

const DEFAULT_QUIET_HOURS = { start: '22:00', end: '07:00' }

function SwitchRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
  children,
}: {
  id: string
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
}) {
  return (
    <div className="rounded-lg bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor={id}>{label}</Label>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
      {checked && children && <div className="mt-3 flex gap-3">{children}</div>}
    </div>
  )
}

function TimeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="time"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function TypeRow({
  type,
  channels,
  emailDisabled,
  onChange,
}: {
  type: NotificationType
  channels: TypeChannels
  emailDisabled: boolean
  onChange: (channels: TypeChannels) => void
}) {
  const Icon = type.icon

  return (
    <div className="rounded-lg bg-card p-4 text-card-foreground">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        {type.label}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        {(['push', 'email'] as const).map((channel) => {
          const id = `type-${type.id}-${channel}`
          return (
            <div key={channel} className="flex items-center gap-2">
              <Switch
                id={id}
                checked={channels[channel]}
                disabled={channel === 'email' && emailDisabled}
                onCheckedChange={(on) => onChange({ ...channels, [channel]: on })}
              />
              <Label htmlFor={id}>
                {channel === 'push' ? pl.notifications.typePush : pl.notifications.typeEmail}
              </Label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PUSH_HINTS: Partial<Record<PushState, string>> = {
  unsupported: pl.notifications.pushUnsupported,
  denied: pl.notifications.pushDenied,
}

export function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pushState, setPushState] = useState<PushState>('unsupported')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    api
      .get<{ notifications: NotificationSettings }>('/api/settings')
      .then((data) => active && setSettings(data.notifications))
      .catch((error: unknown) => active && setLoadError(errorMessage(error)))
    void getPushState().then((state) => active && setPushState(state))

    return () => {
      active = false
    }
  }, [])

  async function togglePush(on: boolean) {
    setBusy(true)
    try {
      setPushState(await (on ? enablePush() : disablePush()))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function save(current: NotificationSettings) {
    setBusy(true)
    try {
      await api.post('/api/settings', { notifications: current })
      toast.success(pl.notifications.saved)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function update(changes: Partial<NotificationSettings>) {
    setSettings((current) => current && { ...current, ...changes })
  }

  return (
    <>
      <PageHeader title={pl.settings.notifications} />

      {loadError && <p className="mt-6 text-sm text-muted-foreground">{loadError}</p>}

      {settings && (
        <div className="mt-6 flex flex-col gap-2">
          <SwitchRow
            id="push"
            label={pl.notifications.push}
            hint={PUSH_HINTS[pushState]}
            checked={pushState === 'on'}
            disabled={busy || pushState === 'unsupported' || pushState === 'denied'}
            onChange={(on) => void togglePush(on)}
          />

          <SwitchRow
            id="email"
            label={pl.notifications.email}
            checked={settings.email}
            onChange={(email) => update({ email })}
          />

          <SwitchRow
            id="quiet"
            label={pl.notifications.quietHours}
            hint={pl.notifications.quietHoursHint}
            checked={settings.quiet_hours !== null}
            onChange={(on) => update({ quiet_hours: on ? DEFAULT_QUIET_HOURS : null })}
          >
            {settings.quiet_hours && (
              <>
                <TimeField
                  id="quiet-start"
                  label={pl.notifications.from}
                  value={settings.quiet_hours.start}
                  onChange={(start) => update({ quiet_hours: { ...settings.quiet_hours!, start } })}
                />
                <TimeField
                  id="quiet-end"
                  label={pl.notifications.to}
                  value={settings.quiet_hours.end}
                  onChange={(end) => update({ quiet_hours: { ...settings.quiet_hours!, end } })}
                />
              </>
            )}
          </SwitchRow>

          <SwitchRow
            id="digest"
            label={pl.notifications.digest}
            hint={pl.notifications.digestHint}
            checked={settings.digest.enabled}
            onChange={(enabled) => update({ digest: { ...settings.digest, enabled } })}
          >
            <TimeField
              id="digest-time"
              label={pl.notifications.time}
              value={settings.digest.time}
              onChange={(time) => update({ digest: { ...settings.digest, time } })}
            />
          </SwitchRow>

          {settings.types && (
            <section className="mt-6 flex flex-col gap-2">
              <div>
                <h2 className="text-sm font-semibold">{pl.notifications.byType}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{pl.notifications.byTypeHint}</p>
              </div>
              {notificationTypes.map((type) => {
                const channels = settings.types?.[type.id]
                return (
                  channels && (
                    <TypeRow
                      key={type.id}
                      type={type}
                      channels={channels}
                      emailDisabled={!settings.email}
                      onChange={(changed) =>
                        update({ types: { ...settings.types, [type.id]: changed } })
                      }
                    />
                  )
                )
              })}
            </section>
          )}

          <Button className="mt-2" disabled={busy} onClick={() => void save(settings)}>
            {pl.notifications.save}
          </Button>
        </div>
      )}
    </>
  )
}
