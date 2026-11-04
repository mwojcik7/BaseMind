import { create } from 'zustand'
import { api, ApiError, NetworkError, setUnauthorizedHandler } from '@/lib/api'

export interface Account {
  user: {
    id: number
    display_name: string
    email: string
    timezone: string
    locale: string
  }
  spaces: {
    id: string
    name: string
    type: 'personal' | 'shared'
    role: 'owner' | 'editor' | 'viewer'
  }[]
}

interface AuthState {
  status: 'loading' | 'authenticated' | 'guest'
  account: Account | null
}

export const useAuth = create<AuthState>(() => ({ status: 'loading', account: null }))

// Remembered on the device so the app opens offline. Holds no secrets: the session
// itself stays in an HttpOnly cookie. Moves to the local database in step 1.3.
const STORAGE_KEY = 'basemind.account'

function readRemembered(): Account | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Account) : null
  } catch {
    return null
  }
}

function setSignedIn(account: Account) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
  } catch {
    // Still signed in for this visit; it just won't open offline.
  }
  useAuth.setState({ status: 'authenticated', account })
}

function setSignedOut() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
  useAuth.setState({ status: 'guest', account: null })
}

/** Loads the account from the server. Only the server's answer can sign the user out here. */
async function refreshAccount() {
  try {
    setSignedIn(await api.get<Account>('/api/me'))
  } catch (error) {
    const unreachable = error instanceof NetworkError
    const serverProblem = error instanceof ApiError && error.status >= 500

    // Offline or a server failure: trust the remembered account until the server can answer.
    if (!unreachable && !serverProblem) {
      setSignedOut()
    } else if (useAuth.getState().status === 'loading') {
      useAuth.setState({ status: 'guest' })
    }
  }
}

/** Call once at startup. A remembered account opens the app at once, without waiting for the network. */
export function startAuth(): Promise<void> {
  setUnauthorizedHandler(setSignedOut)

  const remembered = readRemembered()
  useAuth.setState(
    remembered
      ? { status: 'authenticated', account: remembered }
      : { status: 'loading', account: null },
  )

  return refreshAccount()
}

export async function logIn(credentials: { email: string; password: string }) {
  await api.post('/api/auth/login', credentials)
  await refreshAccount()
}

export async function register(data: {
  display_name: string
  email: string
  password: string
  password_confirmation: string
  invitation_code: string
}) {
  await api.post('/api/auth/register', data)
  await refreshAccount()
}

/**
 * Needs a connection on purpose: signing out only locally would leave
 * the session alive on the server and the next launch would sign back in.
 */
export async function logOut() {
  await api.post('/api/auth/logout')
  setSignedOut()
}
