import { expect, test } from '@playwright/test'
import { logInThroughForm, newAccount, register } from './helpers.ts'

test('a guest is sent to the login screen', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Zaloguj się' })).toBeVisible()
})

test('a wrong password shows an error and keeps the guest out', async ({ page, request }) => {
  const account = newAccount()
  await register(request, account)

  await logInThroughForm(page, { email: account.email, password: 'not-the-password' })

  // Shown under the e-mail field and announced with it.
  await expect(page.getByLabel('E-mail')).toHaveAccessibleDescription(
    'Nieprawidłowy e-mail lub hasło.',
  )
  await expect(page).toHaveURL(/\/login$/)
})

test('the right password opens the app', async ({ page, request }) => {
  const account = newAccount()
  await register(request, account)

  await logInThroughForm(page, account)

  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login$/)
})

test('the session cookie is HttpOnly and SameSite=Lax', async ({ page, context, request }) => {
  const account = newAccount()
  await register(request, account)

  await logInThroughForm(page, account)
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()

  const session = (await context.cookies()).find((cookie) => cookie.name.endsWith('-session'))
  expect(session, 'session cookie').toBeDefined()
  expect(session?.httpOnly).toBe(true)
  expect(session?.sameSite).toBe('Lax')
  expect(await page.evaluate(() => document.cookie)).not.toContain(session?.name)
})
