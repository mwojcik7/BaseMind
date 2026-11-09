import { waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/db'
import { reminders } from '@/db/reminders'
import { useAuth, type Account } from '@/lib/auth'
import { startBadge } from '@/lib/badge'

const ACCOUNT: Account = {
  user: { id: 1, display_name: 'T', email: 't@example.com', timezone: 'UTC', locale: 'pl' },
  spaces: [{ id: 'space', name: 'Moja', type: 'personal', role: 'owner' }],
}

function newReminder() {
  return {
    entity_type: null,
    entity_id: null,
    title: 'Przegląd',
    remind_at: '2026-11-09T10:00:00.000Z',
    rrule: null,
    offset_minutes: 0,
    channels: ['push' as const],
    status: 'scheduled' as const,
    snoozed_until: null,
  }
}

describe('reminders', () => {
  beforeEach(() => useAuth.setState({ status: 'authenticated', account: ACCOUNT }))

  it('never send the field only the server may set', async () => {
    await reminders.create(newReminder())

    const [entry] = await db.outbox.toArray()
    expect(entry.entity).toBe('reminders')
    expect(entry.payload).not.toHaveProperty('last_sent_at')
  })

  describe('app icon badge', () => {
    const setAppBadge = vi.fn(async () => {})
    let stop: () => void

    beforeEach(() => {
      setAppBadge.mockClear()
      Object.defineProperty(navigator, 'setAppBadge', { configurable: true, value: setAppBadge })
    })

    afterEach(() => {
      stop()
      delete (navigator as unknown as { setAppBadge?: unknown }).setAppBadge
    })

    it('counts reminders that went out and are unanswered', async () => {
      const unanswered = await reminders.create(newReminder())
      await reminders.create(newReminder())
      await db.table('reminders').update(unanswered.id, { status: 'sent' })

      stop = startBadge()

      await waitFor(() => expect(setAppBadge).toHaveBeenLastCalledWith(1))
    })

    it('updates when a reminder is answered', async () => {
      const reminder = await reminders.create({ ...newReminder(), status: 'sent' })
      stop = startBadge()
      await waitFor(() => expect(setAppBadge).toHaveBeenLastCalledWith(1))

      await reminders.update(reminder.id, { status: 'dismissed' })

      await waitFor(() => expect(setAppBadge).toHaveBeenLastCalledWith(0))
    })

    it('leaves out deleted reminders', async () => {
      const reminder = await reminders.create({ ...newReminder(), status: 'sent' })
      await reminders.softDelete(reminder.id)

      stop = startBadge()

      await waitFor(() => expect(setAppBadge).toHaveBeenLastCalledWith(0))
    })
  })

  it('leave the badge alone where the browser has none', () => {
    expect(() => startBadge()()).not.toThrow()
  })
})
