import { Outlet } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import { BottomNav } from '@/components/BottomNav'
import { SearchBar } from '@/components/SearchBar'
import { Sidebar } from '@/components/Sidebar'
import { Toaster } from '@/components/ui/toaster'

export function AppShell() {
  return (
    <MotionConfig reducedMotion="user">
      <Sidebar />
      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 bg-background/90 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <SearchBar />
          </div>
        </div>
        <main className="mx-auto w-full max-w-2xl px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <Toaster />
    </MotionConfig>
  )
}
