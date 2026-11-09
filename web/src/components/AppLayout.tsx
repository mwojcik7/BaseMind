import { Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/lib/auth'

/** Wraps everything that needs an account. Signing out anywhere leads back to the login screen. */
export function AppLayout() {
  const status = useAuth((state) => state.status)

  if (status === 'guest') {
    return <Navigate to="/login" replace />
  }

  // A moment while the local database opens; only the first launch also waits for the server.
  if (status === 'loading') {
    return null
  }

  return <AppShell />
}
