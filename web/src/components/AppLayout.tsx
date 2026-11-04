import { Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/lib/auth'

/** Wraps everything that needs an account. Signing out anywhere leads back to the login screen. */
export function AppLayout() {
  const status = useAuth((state) => state.status)

  if (status === 'guest') {
    return <Navigate to="/login" replace />
  }

  // Only shows on the very first launch: a remembered account skips the wait.
  if (status === 'loading') {
    return null
  }

  return <AppShell />
}
