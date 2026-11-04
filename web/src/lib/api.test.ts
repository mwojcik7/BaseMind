import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, NetworkError } from '@/lib/api'

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function setCookie(value: string) {
  document.cookie = `XSRF-TOKEN=${value}; path=/`
}

describe('api', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  it('sends the decoded CSRF token with changes', async () => {
    setCookie('abc%3D')
    fetchMock.mockResolvedValue(json(200))

    await api.post('/api/thing', { a: 1 })

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.headers).toMatchObject({ 'X-XSRF-TOKEN': 'abc=' })
    expect(init?.body).toBe('{"a":1}')
  })

  it('gets a CSRF cookie first when there is none', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (input === '/sanctum/csrf-cookie') {
        setCookie('fresh')
      }
      return json(200)
    })

    await api.post('/api/thing')

    expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
      '/sanctum/csrf-cookie',
      '/api/thing',
    ])
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ 'X-XSRF-TOKEN': 'fresh' })
  })

  it('retries once after an expired CSRF token', async () => {
    setCookie('old')
    fetchMock
      .mockResolvedValueOnce(json(419))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(200, { ok: true }))

    await expect(api.post('/api/thing')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('reports validation errors', async () => {
    fetchMock.mockResolvedValue(json(422, { message: 'Bad', errors: { email: ['Zły'] } }))

    const error = await api.get('/api/thing').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, errors: { email: ['Zły'] } })
  })

  it('reports a network failure separately', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api.get('/api/thing')).rejects.toBeInstanceOf(NetworkError)
  })

  it('accepts a response without JSON', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(api.delete('/api/thing')).resolves.toBeUndefined()
  })
})
