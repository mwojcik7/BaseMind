import { expect, test } from '@playwright/test'
import { logInThroughForm, newAccount, register, waitForServiceWorker } from './helpers.ts'

test.beforeEach(async ({ page, request }) => {
  const account = newAccount()
  await register(request, account)
  await logInThroughForm(page, account)
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()
  await waitForServiceWorker(page)
})

test('a remembered account opens the app without a network', async ({ page, context }) => {
  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login$/)
})

test('logging out without a network is refused and keeps the account', async ({
  page,
  context,
}) => {
  await page.goto('/settings')
  await context.setOffline(true)

  await page.getByRole('button', { name: 'Wyloguj się' }).click()

  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Brak połączenia z serwerem' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/settings$/)

  // Back online, the session is still there.
  await context.setOffline(false)
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login$/)
})
