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

const calendarRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/calendar',
  component: lazyRouteComponent(() => import('@/modules/calendar/CalendarPage'), 'CalendarPage'),
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
    tasksRoute,
    calendarRoute,
    moreRoute,
    settingsRoute,
    sessionsRoute,
    notificationsRoute,
    dashboardSettingsRoute,
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
