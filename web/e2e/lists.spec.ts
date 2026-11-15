import { expect, test, type Page } from '@playwright/test'
import { logInThroughForm, newAccount, register } from './helpers.ts'

const navigation = (page: Page) => page.getByRole('navigation', { name: 'Główna nawigacja' })

test.beforeEach(async ({ page, request }) => {
  const account = newAccount()
  await register(request, account)
  await logInThroughForm(page, account)
  await expect(navigation(page)).toBeVisible()
})

test('quick add adds to the open list, or to the one picked in the sheet', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('tab', { name: 'Listy' }).click()
  for (const name of ['Dom', 'Praca']) {
    await page.getByRole('button', { name: 'Nowa lista' }).click()
    const sheet = page.getByRole('dialog', { name: 'Nowa lista' })
    await sheet.getByRole('textbox').fill(name)
    await sheet.getByRole('button', { name: 'Zapisz' }).click()
  }
  await page.getByRole('button', { name: /^Dom/ }).click()

  await navigation(page).getByRole('button', { name: 'Dodaj' }).click()
  const quickAdd = page.getByRole('dialog', { name: 'Szybkie dodawanie' })
  const list = quickAdd.getByRole('combobox', { name: 'Lista' })
  await expect(list).toHaveText('Dom')
  await quickAdd.getByRole('textbox', { name: 'Np. kupić mleko jutro !1' }).fill('Odkurzyć')
  await quickAdd.getByRole('button', { name: 'Dodaj' }).click()
  await expect(page.getByText('Odkurzyć')).toBeVisible()

  // Picked by hand: the task goes there, not to the open list.
  await navigation(page).getByRole('button', { name: 'Dodaj' }).click()
  await quickAdd.getByRole('textbox', { name: 'Np. kupić mleko jutro !1' }).fill('Raport')
  await list.click()
  await page.getByRole('option', { name: 'Praca' }).click()
  await quickAdd.getByRole('button', { name: 'Dodaj' }).click()
  await expect(quickAdd).toHaveCount(0)
  await expect(page.getByText('Raport')).toHaveCount(0)

  await page.getByRole('button', { name: 'Wróć do list' }).click()
  await page.getByRole('button', { name: /^Praca/ }).click()
  await expect(page.getByText('Raport')).toBeVisible()
})
