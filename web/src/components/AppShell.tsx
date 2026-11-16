import { Outlet } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { PwaBanner } from '@/components/PwaBanner'
import { SearchBar } from '@/components/SearchBar'
import { Sidebar } from '@/components/Sidebar'
import { SyncIndicator } from '@/components/SyncIndicator'
import { Toaster } from '@/components/ui/toaster'
import { CompleteTaskPrompt } from '@/modules/tasks/CompleteTaskPrompt'

/**
 * Publishes the height of the bar on top as --app-bar, so headers further down the page
 * can stick right under it.
 */
function useAppBarHeight() {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const bar = ref.current
    if (!bar || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty('--app-bar', `${bar.offsetHeight}px`),
    )
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  return ref
}

export function AppShell() {
  const bar = useAppBarHeight()

  return (
    <MotionConfig reducedMotion="user">
      <Sidebar />
      <div className="lg:pl-64">
        <div
          ref={bar}
          className="sticky top-0 z-30 bg-background/90 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur"
        >
          <div className="mx-auto flex max-w-2xl items-center gap-1">
            <div className="min-w-0 flex-1">
              <SearchBar />
            </div>
            <SyncIndicator />
          </div>
        </div>
        <main className="mx-auto w-full max-w-2xl px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-8">
          <PwaBanner />
          <Outlet />
        </main>
      </div>
      <BottomNav />
      {/* Here rather than in a page: tasks are completed from the dashboard too. */}
      <CompleteTaskPrompt />
      <Toaster />
    </MotionConfig>
  )
}
