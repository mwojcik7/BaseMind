import { describe, expect, it } from 'vitest'
import type { EventItem } from '@/modules/calendar/days'
import { droppedEvent, droppedTask, snapMinutes } from '@/modules/calendar/drag'
import type { CalendarEvent } from '@/modules/calendar/repo'

function item(
  event: Partial<CalendarEvent>,
  occurrence = event.start_date ?? '2026-11-20',
  day = 1,
  days = 1,
): EventItem {
  return {
    kind: 'event',
    key: 'k',
    start: occurrence,
    day,
    days,
    event: {
      id: 'e',
      title: 'Basen',
      location: null,
      description: null,
      start_date: '2026-11-20',
      start_time: '18:00',
      end_date: '2026-11-20',
      end_time: '19:00',
      rrule: null,
      exdates: null,
      color: null,
      ...event,
    } as CalendarEvent,
  }
}

const move = (minutes: number, days = 0) => ({ mode: 'move' as const, minutes, days })
const resize = (minutes: number) => ({ mode: 'resize' as const, minutes, days: 0 })

describe('dragging on the hour axis', () => {
  it('snaps to quarters of an hour', () => {
    expect([snapMinutes(7), snapMinutes(8), snapMinutes(-22), snapMinutes(-23)]).toEqual([
      0, 15, -15, -30,
    ])
  })

  it('moves an event, keeping its length', () => {
    expect(droppedEvent(item({}), move(75))).toEqual({
      start_date: '2026-11-20',
      start_time: '19:15',
      end_date: '2026-11-20',
      end_time: '20:15',
    })
  })

  it('moves an event to another day of the week', () => {
    expect(droppedEvent(item({}), move(-60, 2))).toMatchObject({
      start_date: '2026-11-22',
      start_time: '17:00',
      end_date: '2026-11-22',
    })
  })

  it('moves the occurrence of a series from its own date', () => {
    const weekly = item({ rrule: 'FREQ=WEEKLY' }, '2026-11-27')
    expect(droppedEvent(weekly, move(30))).toMatchObject({
      start_date: '2026-11-27',
      start_time: '18:30',
    })
  })

  it('keeps the start within the day it lands on; the end may run past midnight', () => {
    expect(droppedEvent(item({}), move(-24 * 60))).toMatchObject({ start_time: '00:00' })
    expect(droppedEvent(item({}), move(24 * 60))).toEqual({
      start_date: '2026-11-20',
      start_time: '23:45',
      end_date: '2026-11-21',
      end_time: '00:45',
    })
  })

  it('moves an event running past midnight as a whole', () => {
    const late = item(
      { start_time: '22:00', end_date: '2026-11-21', end_time: '02:00' },
      '2026-11-20',
      2,
      2,
    )
    expect(droppedEvent(late, move(60))).toEqual({
      start_date: '2026-11-20',
      start_time: '23:00',
      end_date: '2026-11-21',
      end_time: '03:00',
    })
  })

  it('changes the length, at least a quarter and at most to midnight', () => {
    expect(droppedEvent(item({}), resize(45))).toMatchObject({ end_time: '19:45' })
    expect(droppedEvent(item({}), resize(-120))).toMatchObject({ end_time: '18:15' })
    expect(droppedEvent(item({}), resize(600))).toMatchObject({
      end_date: '2026-11-21',
      end_time: '00:00',
    })
  })

  it('gives nothing when the block lands where it was, or for an all-day event', () => {
    expect(droppedEvent(item({}), move(0))).toBeNull()
    expect(droppedEvent(item({ start_time: null, end_time: null }), move(60))).toBeNull()
  })

  it('moves a task with a time, but does not stretch it', () => {
    const task = { due_date: '2026-11-20', due_time: '09:00' }
    expect(droppedTask(task, move(-30, 1))).toEqual({ due_date: '2026-11-21', due_time: '08:30' })
    expect(droppedTask(task, move(24 * 60))).toEqual({ due_date: '2026-11-20', due_time: '23:45' })
    expect(droppedTask(task, resize(30))).toBeNull()
    expect(droppedTask(task, move(0))).toBeNull()
  })
})
