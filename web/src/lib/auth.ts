import { create } from 'zustand'
import { clearLocalData, db } from '@/db/db'
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
// itself stays in an HttpOnly cookie.
const ACCOUNT_KEY = 'account'

// Where earlier versions of the app remembered the account.
const LEGACY_STORAGE_KEY = 'basemind.account'

function takeLegacyAccount(): Account | null {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Account) : null
  } catch {
    return null
  }
}

/** Another person's account on this device must never see the previous one's data. */
async function rememberAccount(account: Account) {
  await db.transaction('rw', db.tables, async () => {
    const previous = (await db.meta.get(ACCOUNT_KEY))?.value as Account | undefined
    if (previous && previous.user.id !== account.user.id) {
      await clearLocalData()
    }
    await db.meta.put({ key: ACCOUNT_KEY, value: account })
  })
}

async function readRemembered(): Promise<Account | null> {
  try {
    const legacy = takeLegacyAccount()
    if (legacy) {
      await rememberAccount(legacy)
      return legacy
    }
    return ((await db.meta.get(ACCOUNT_KEY))?.value as Account | undefined) ?? null
  } catch {
    return null
  }
}

async function setSignedIn(account: Account) {
  try {
    await rememberAccount(account)
  } catch {
    // Still signed in for this visit; it just won't open offline.
  }
  useAuth.setState({ status: 'authenticated', account })
}

/** Also runs when the server ends the session, so revoking a lost phone wipes its data. */
async function setSignedOut() {
  useAuth.setState({ status: 'guest', account: null })
  try {
    await clearLocalData()
  } catch (error) {
    // The account stays remembered with the data, so the next start retries the wipe.
    console.error('Could not clear local data', error)
  }
}

/** Loads the account from the server. Only the server's answer can sign the user out here. */
async function refreshAccount() {
  try {
    await setSignedIn(await api.get<Account>('/api/me'))
  } catch (error) {
    const unreachable = error instanceof NetworkError
    const serverProblem = error instanceof ApiError && error.status >= 500

    // Offline or a server failure: trust the remembered account until the server can answer.
    if (!unreachable && !serverProblem) {
      await setSignedOut()
    } else if (useAuth.getState().status === 'loading') {
      useAuth.setState({ status: 'guest' })
    }
  }
}

/** Call once at startup. A remembered account opens the app without waiting for the network. */
export async function startAuth(): Promise<void> {
  setUnauthorizedHandler(() => void setSignedOut())

  const remembered = await readRemembered()
  useAuth.setState(
    remembered
      ? { status: 'authenticated', account: remembered }
      : { status: 'loading', account: null },
  )

  await refreshAccount()
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
  await setSignedOut()
}
