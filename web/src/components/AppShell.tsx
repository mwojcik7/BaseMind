import { Outlet } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import { BottomNav } from '@/components/BottomNav'
import { PwaBanner } from '@/components/PwaBanner'
import { SearchBar } from '@/components/SearchBar'
import { Sidebar } from '@/components/Sidebar'
import { SyncIndicator } from '@/components/SyncIndicator'
import { Toaster } from '@/components/ui/toaster'

export function AppShell() {
  return (
    <MotionConfig reducedMotion="user">
      <Sidebar />
      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 bg-background/90 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur">
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
      <Toaster />
    </MotionConfig>
  )
}
