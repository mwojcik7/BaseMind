import { expect, test } from '@playwright/test'
import { logInThroughForm, newAccount, register } from './helpers.ts'

test('ending the other sessions signs out the other device', async ({
  browser,
  page,
  request,
}, testInfo) => {
  const account = newAccount()
  await register(request, account)

  // Two devices: this page and a second, separate browser profile.
  const otherDevice = await browser.newContext(testInfo.project.use)
  const otherPage = await otherDevice.newPage()

  await logInThroughForm(page, account)
  await logInThroughForm(otherPage, account)
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()
  await expect(otherPage.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()

  await page.goto('/settings/sessions')
  await page.getByRole('button', { name: 'Wyloguj wszystkie pozostałe' }).click()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Zakończono pozostałe sesje' }),
  ).toBeVisible()

  // The next time the other device asks the server, it learns the session is gone.
  await otherPage.reload()
  await expect(otherPage.getByRole('heading', { name: 'Zaloguj się' })).toBeVisible()

  // This device stays signed in.
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()

  await otherDevice.close()
})
