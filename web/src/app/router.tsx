import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router'
import { AppLayout } from '@/components/AppLayout'
import { NotFound } from '@/components/NotFound'
import { AuthLayout } from '@/modules/auth/AuthLayout'

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
})

// Screens for signed-out people.
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  component: AuthLayout,
})

const loginRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/login',
  component: lazyRouteComponent(() => import('@/modules/auth/LoginPage'), 'LoginPage'),
})

const registerRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/register',
  component: lazyRouteComponent(() => import('@/modules/auth/RegisterPage'), 'RegisterPage'),
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/forgot-password',
  component: lazyRouteComponent(
    () => import('@/modules/auth/ForgotPasswordPage'),
    'ForgotPasswordPage',
  ),
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/reset-password',
  // Comes from the link in the e-mail.
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
    email: typeof search.email === 'string' ? search.email : '',
  }),
  component: lazyRouteComponent(
    () => import('@/modules/auth/ResetPasswordPage'),
    'ResetPasswordPage',
  ),
})

// Everything below needs an account.
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: AppLayout,
})

const todayRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/modules/today/TodayPage'), 'TodayPage'),
})

const tasksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/tasks',
  component: lazyRouteComponent(() => import('@/modules/tasks/TasksPage'), 'TasksPage'),
})

const taskDetailRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '$taskId',
  // ?complete=1: opened from the notification's Done button, which can't ask about subtasks.
  validateSearch: (search: Record<string, unknown>): { complete?: true } =>
    search.complete === 1 || search.complete === '1' ? { complete: true } : {},
  component: lazyRouteComponent(() => import('@/modules/tasks/TaskDetail'), 'TaskDetail'),
})

const calendarRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/calendar',
  component: lazyRouteComponent(() => import('@/modules/calendar/CalendarPage'), 'CalendarPage'),
})

/** ?date=yyyy-MM-dd: the day a new event goes on, or the occurrence of a series opened. */
const validateDate = (search: Record<string, unknown>): { date?: string } =>
  typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
    ? { date: search.date }
    : {}

/**
 * For a new event also ?time=HH:mm, e.g. the hour tapped in the Day or Week view, or
 * ?copy=<token>: a duplicate of what another event's form showed.
 */
const validateNewEvent = (
  search: Record<string, unknown>,
): { date?: string; time?: string; copy?: string } => ({
  ...validateDate(search),
  ...(typeof search.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(search.time)
    ? { time: search.time }
    : {}),
  ...(typeof search.copy === 'string' && /^[a-z0-9]{1,32}$/.test(search.copy)
    ? { copy: search.copy }
    : {}),
})

const newEventRoute = createRoute({
  getParentRoute: () => calendarRoute,
  path: 'new',
  validateSearch: validateNewEvent,
  component: lazyRouteComponent(() => import('@/modules/calendar/EventDetail'), 'NewEvent'),
})

const eventDetailRoute = createRoute({
  getParentRoute: () => calendarRoute,
  path: 'events/$eventId',
  validateSearch: validateDate,
  component: lazyRouteComponent(() => import('@/modules/calendar/EventDetail'), 'EventDetail'),
})

const moreRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/more',
  component: lazyRouteComponent(() => import('@/modules/more/MorePage'), 'MorePage'),
})

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('@/modules/settings/SettingsPage'), 'SettingsPage'),
})

const sessionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings/sessions',
  component: lazyRouteComponent(() => import('@/modules/settings/SessionsPage'), 'SessionsPage'),
})

const notificationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings/notifications',
  component: lazyRouteComponent(
    () => import('@/modules/settings/NotificationsPage'),
    'NotificationsPage',
  ),
})

const dashboardSettingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings/dashboard',
  component: lazyRouteComponent(
    () => import('@/modules/settings/DashboardSettingsPage'),
    'DashboardSettingsPage',
  ),
})

const trashRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/trash',
  component: lazyRouteComponent(() => import('@/modules/trash/TrashPage'), 'TrashPage'),
})

// Preview of the design system; not linked from the app. Remove before deployment (stage 7).
const designRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/design',
  component: lazyRouteComponent(() => import('@/modules/design/DesignPage'), 'DesignPage'),
})

// Placeholder for modules not built yet (/notes, /finance, ...). The static routes above win.
const moduleRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/$moduleId',
  component: lazyRouteComponent(() => import('@/modules/more/ModulePage'), 'ModulePage'),
})

const routeTree = rootRoute.addChildren([
  authRoute.addChildren([loginRoute, registerRoute, forgotPasswordRoute, resetPasswordRoute]),
  appRoute.addChildren([
    todayRoute,
    tasksRoute.addChildren([taskDetailRoute]),
    calendarRoute.addChildren([newEventRoute, eventDetailRoute]),
    moreRoute,
    settingsRoute,
    sessionsRoute,
    notificationsRoute,
    dashboardSettingsRoute,
    trashRoute,
    designRoute,
    moduleRoute,
  ]),
])

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history, defaultPreload: 'intent' })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
