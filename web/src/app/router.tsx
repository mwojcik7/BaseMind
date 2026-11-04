import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  type RouterHistory,
} from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { NotFound } from '@/components/NotFound'

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound,
})

const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/modules/today/TodayPage'), 'TodayPage'),
})

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  component: lazyRouteComponent(() => import('@/modules/tasks/TasksPage'), 'TasksPage'),
})

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  component: lazyRouteComponent(() => import('@/modules/calendar/CalendarPage'), 'CalendarPage'),
})

const moreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/more',
  component: lazyRouteComponent(() => import('@/modules/more/MorePage'), 'MorePage'),
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('@/modules/settings/SettingsPage'), 'SettingsPage'),
})

// Preview of the design system; not linked from the app. Remove before deployment (stage 7).
const designRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/design',
  component: lazyRouteComponent(() => import('@/modules/design/DesignPage'), 'DesignPage'),
})

// Placeholder for modules not built yet (/notes, /finance, ...). The static routes above win.
const moduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$moduleId',
  component: lazyRouteComponent(() => import('@/modules/more/ModulePage'), 'ModulePage'),
})

const routeTree = rootRoute.addChildren([
  todayRoute,
  tasksRoute,
  calendarRoute,
  moreRoute,
  settingsRoute,
  designRoute,
  moduleRoute,
])

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history, defaultPreload: 'intent' })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
