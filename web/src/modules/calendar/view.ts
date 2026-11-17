import { create } from 'zustand'
import { useSyncExternalStore } from 'react'
import { shiftDay } from '@/modules/calendar/days'

export const CALENDAR_VIEWS = ['agenda', 'day', 'week', 'month'] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

const VIEW_KEY = 'calendar_view'
/** Wide enough for the month grid by default and the whole week side by side. */
const WIDE = '(min-width: 1024px)'

/** The last view chosen on this device; at first the agenda on a phone, the month on a desktop. */
function initialView(): CalendarView {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (CALENDAR_VIEWS.includes(saved as CalendarView)) return saved as CalendarView
  } catch {
    // Storage blocked: fall back to the default.
  }
  return window.matchMedia?.(WIDE).matches ? 'month' : 'agenda'
}

interface CalendarViewState {
  view: CalendarView
  /** The month shown ('yyyy-MM') and the day picked in it or shown in Day and Week; null follows today. */
  month: string | null
  selected: string | null
  /** Goes up with each press of "Dziś", so the agenda scrolls back to today. */
  todayRequests: number
}

/**
 * Kept outside the page, so opening a task (another screen) and coming back finds the
 * calendar where it was.
 */
export const useCalendarView = create<CalendarViewState>(() => ({
  view: initialView(),
  month: null,
  selected: null,
  todayRequests: 0,
}))

export function setCalendarView(view: CalendarView) {
  useCalendarView.setState({ view })
  try {
    localStorage.setItem(VIEW_KEY, view)
  } catch {
    // Remembered for this session only.
  }
}

export function goToToday() {
  useCalendarView.setState((state) => ({
    month: null,
    selected: null,
    todayRequests: state.todayRequests + 1,
  }))
}

export function selectDay(day: string) {
  useCalendarView.setState({ selected: day, month: day.slice(0, 7) })
}

/** Another month: today when it is in it, otherwise its first day. */
export function showMonth(month: string, today: string) {
  useCalendarView.setState({
    month,
    selected: today.startsWith(month) ? today : `${month}-01`,
  })
}

/** Moves the day shown in Day and Week by `days`, keeping the month in step. */
export function shiftSelected(from: string, days: number) {
  selectDay(shiftDay(from, days))
}

/** Opens one day in the Day view, e.g. from a day's heading in the Week view. */
export function openDay(day: string) {
  selectDay(day)
  setCalendarView('day')
}

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia?.(WIDE)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/** A screen wide enough for the whole week side by side. */
export function useWideScreen() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia?.(WIDE).matches ?? false)
}
