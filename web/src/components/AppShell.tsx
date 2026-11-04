import { Outlet } from '@tanstack/react-router'
import { BottomNav } from '@/components/BottomNav'

export function AppShell() {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}
