import { Navigate, Outlet } from '@tanstack/react-router'
import { pl } from '@/i18n/pl'
import { useAuth } from '@/lib/auth'

/** Wraps the screens for signed-out people. Whoever is signed in goes straight to the app. */
export function AuthLayout() {
  const status = useAuth((state) => state.status)

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <img src="/app-icons/logo.svg" alt="" className="size-8" />
        {pl.appName}
      </div>
      <Outlet />
    </main>
  )
}
