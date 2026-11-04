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

export const moduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/more/$moduleId',
  component: lazyRouteComponent(() => import('@/modules/more/ModulePage'), 'ModulePage'),
})

const routeTree = rootRoute.addChildren([
  todayRoute,
  tasksRoute,
  calendarRoute,
  moreRoute,
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
