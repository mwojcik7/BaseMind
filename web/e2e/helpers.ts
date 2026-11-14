import { randomUUID } from 'node:crypto'
import type { APIRequestContext, Page } from '@playwright/test'
import { E2E_URL, INVITATION_CODE } from './env.ts'

export interface TestAccount {
  displayName: string
  email: string
  password: string
}

/** A fresh account per test, so tests never depend on each other. */
export function newAccount(): TestAccount {
  return {
    displayName: 'Tester',
    email: `e2e-${randomUUID()}@example.test`,
    password: 'correct-horse-battery',
  }
}

/** Calls the API the way the app does: Sanctum session cookie plus the XSRF header. */
export async function apiPost(request: APIRequestContext, path: string, data: object) {
  await request.get('/sanctum/csrf-cookie')
  const { cookies } = await request.storageState()
  const token = cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value ?? ''

  const response = await request.post(path, {
    data,
    headers: {
      Accept: 'application/json',
      Referer: `${E2E_URL}/`,
      'X-XSRF-TOKEN': decodeURIComponent(token),
    },
  })
  if (!response.ok()) {
    throw new Error(`POST ${path}: ${response.status()} ${await response.text()}`)
  }
  return response
}

/**
 * Registers the account through the API. With `page.request` the session cookie lands
 * in the page's browser context, which is then signed in.
 */
export async function register(request: APIRequestContext, account: TestAccount) {
  await apiPost(request, '/api/auth/register', {
    display_name: account.displayName,
    email: account.email,
    password: account.password,
    password_confirmation: account.password,
    invitation_code: INVITATION_CODE,
  })
}

export async function logInThroughForm(
  page: Page,
  account: Pick<TestAccount, 'email' | 'password'>,
) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(account.email)
  await page.getByLabel('Hasło').fill(account.password)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
}

/** The service worker controls the page, so the app shell can load without a network. */
export async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.ready
    return registration.active !== null && navigator.serviceWorker.controller !== null
  })
}
