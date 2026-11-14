import { expect, test, type Page } from '@playwright/test'
import { logInThroughForm, newAccount, register } from './helpers.ts'

const navigation = (page: Page) => page.getByRole('navigation', { name: 'Główna nawigacja' })
const toast = (page: Page, text: string) =>
  page.locator('[data-sonner-toast]').filter({ hasText: text })

test.beforeEach(async ({ page, request }) => {
  const account = newAccount()
  await register(request, account)
  await logInThroughForm(page, account)
  await expect(navigation(page)).toBeVisible()
})

async function addTaskForToday(page: Page, title: string) {
  await navigation(page).getByRole('button', { name: 'Dodaj' }).click()
  const input = page.getByRole('textbox', { name: 'Np. kupić mleko jutro !1' })
  await input.fill(`${title} dziś`)
  await input.press('Enter')
  await expect(toast(page, 'Dodano zadanie')).toBeVisible()
  await page.keyboard.press('Escape')
}

async function chooseRepeat(page: Page, option: string) {
  await page.getByLabel('Powtarzaj').click()
  await page.getByRole('option', { name: option }).click()
}

test('a daily task moves to tomorrow when done and keeps a copy in history', async ({ page }) => {
  await addTaskForToday(page, 'Wziąć witaminy')
  await page.goto('/tasks')
  await page.getByText('Wziąć witaminy').click()

  await chooseRepeat(page, 'Codziennie')
  await page.getByRole('button', { name: 'Zapisz' }).click()
  await expect(page.getByLabel('Codziennie', { exact: true })).toBeVisible()

  await page.getByRole('checkbox', { name: 'Oznacz jako zrobione: Wziąć witaminy' }).click()
  await expect(toast(page, 'Zrobione. Następny termin:')).toBeVisible()
  await expect(page.getByText('Na dziś nie ma żadnych zadań.')).toBeVisible()

  await page.getByRole('tab', { name: 'Nadchodzące' }).click()
  await expect(page.getByText('Wziąć witaminy')).toBeVisible()

  await page.getByRole('tab', { name: 'Ukończone' }).click()
  await expect(page.getByText('Wziąć witaminy')).toBeVisible()
})

test('a custom rule is edited in the task and an occurrence can be skipped', async ({ page }) => {
  await addTaskForToday(page, 'Wynieść śmieci')
  await page.goto('/tasks')
  await page.getByText('Wynieść śmieci').click()

  await chooseRepeat(page, 'Własne…')
  await page.getByLabel('Co', { exact: true }).fill('2')
  await page.getByLabel('Koniec').click()
  await page.getByRole('option', { name: 'Po liczbie razy' }).click()
  await page.getByLabel('Ile razy').fill('3')
  await page.getByText('Od ukończenia', { exact: true }).click()
  await page.screenshot({ path: 'test-results/recurrence-editor.png', fullPage: true })
  await page.getByRole('button', { name: 'Zapisz' }).click()

  await expect(page.getByLabel(/^Co 2 tygodnie: .+ od ukończenia, zostało: 3$/)).toBeVisible()

  await page.getByText('Wynieść śmieci').click()
  await page.getByRole('button', { name: 'Pomiń to wystąpienie' }).click()
  await expect(toast(page, 'Pominięto. Następny termin:')).toBeVisible()

  await page.getByRole('tab', { name: 'Ukończone' }).click()
  await expect(page.getByText('pominięte')).toBeVisible()
})
