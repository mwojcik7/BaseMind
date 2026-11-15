import { expect, test } from '@playwright/test'
import { logInThroughForm, newAccount, register } from './helpers.ts'

test('channels can be set for each type of reminder', async ({ page, request }) => {
  const account = newAccount()
  await register(request, account)
  await logInThroughForm(page, account)

  await page.goto('/settings/notifications')
  const taskPush = page.locator('#type-tasks-push')
  const taskEmail = page.locator('#type-tasks-email')

  // Tasks start on the phone only.
  await expect(taskPush).toBeChecked()
  await expect(taskEmail).not.toBeChecked()

  await taskPush.click()
  await taskEmail.click()
  await page.getByRole('button', { name: 'Zapisz' }).click()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Zapisano ustawienia' }),
  ).toBeVisible()

  await page.reload()
  await expect(taskPush).not.toBeChecked()
  await expect(taskEmail).toBeChecked()

  // E-mail turned off for everything can't be turned on for one type.
  await page.locator('#email').click()
  await expect(taskEmail).toBeDisabled()
})
