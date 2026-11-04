/** The server answered with an error. `errors` holds validation messages per field. */
export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

/** The server could not be reached, usually because the device is offline. */
export class NetworkError extends Error {}

let onUnauthorized: () => void = () => {}

/** Called when the server says the session has ended, e.g. it was revoked on another device. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

function xsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const token = xsrfToken()

  try {
    return await fetch(path, {
      method,
      // Sanctum recognizes the PWA by its session cookie (same origin, no CORS).
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new NetworkError()
  }
}

function refreshCsrfCookie() {
  return send('GET', '/sanctum/csrf-cookie')
}

async function parseBody(response: Response): Promise<unknown> {
  const isJson = response.headers.get('Content-Type')?.includes('json')
  return isJson ? response.json() : undefined
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (method !== 'GET' && !xsrfToken()) {
    await refreshCsrfCookie()
  }

  let response = await send(method, path, body)

  // 419: the CSRF token expired while the app stayed open. Get a new one and retry once.
  if (response.status === 419) {
    await refreshCsrfCookie()
    response = await send(method, path, body)
  }

  const data = (await parseBody(response)) as
    { message?: string; errors?: Record<string, string[]> } | undefined

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized()
    }
    throw new ApiError(response.status, data?.message ?? '', data?.errors)
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T = void>(path: string, body?: unknown) => request<T>('POST', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}
