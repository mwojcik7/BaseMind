import { create } from 'zustand'

export type CalendarView = 'agenda' | 'month'

const VIEW_KEY = 'calendar_view'

/** The last view chosen on this device; at first the agenda on a phone, the month on a desktop. */
function initialView(): CalendarView {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'agenda' || saved === 'month') return saved
  } catch {
    // Storage blocked: fall back to the default.
  }
  return window.matchMedia?.('(min-width: 1024px)').matches ? 'month' : 'agenda'
}

interface CalendarViewState {
  view: CalendarView
  /** The month shown ('yyyy-MM') and the day picked in it; null follows today. */
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
