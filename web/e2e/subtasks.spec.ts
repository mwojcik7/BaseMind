import { expect, test, type Page } from '@playwright/test'
import { logInThroughForm, newAccount, register } from './helpers.ts'

const navigation = (page: Page) => page.getByRole('navigation', { name: 'Główna nawigacja' })

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
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Dodano zadanie' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
}

test('subtasks are added in the task and completing it asks about the open ones', async ({
  page,
}) => {
  await addTaskForToday(page, 'Remont łazienki')
  await page.goto('/tasks')
  await page.getByText('Remont łazienki').click()

  const subtask = page.getByRole('textbox', { name: 'Dodaj podzadanie' })
  await subtask.fill('Kupić farbę')
  await subtask.press('Enter')
  await subtask.fill('Wybrać kafelki')
  await subtask.press('Enter')
  await expect(page.getByRole('link', { name: 'Kupić farbę' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Oznacz jako zrobione: Wybrać kafelki' }).click()

  // A subtask opens like any task and leads back to its parent.
  await page.getByRole('link', { name: 'Kupić farbę' }).click()
  await expect(page.getByText('Podzadanie zadania')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Dodaj podzadanie' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Remont łazienki' }).click()
  await page.keyboard.press('Escape')

  await expect(page.getByLabel('Ukończone podzadania: 1 z 2')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Oznacz jako zrobione: Remont łazienki' }).click()
  const prompt = page.getByRole('dialog', { name: 'Zadanie ma nieukończone podzadania' })
  await expect(prompt).toContainText('podzadania do zrobienia: 1')
  await prompt.getByRole('button', { name: 'Odhacz wszystkie' }).click()

  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Odhaczono zadanie i podzadania (1)' }),
  ).toBeVisible()
  await expect(page.getByText('Na dziś nie ma żadnych zadań.')).toBeVisible()
})

test('the note is written in Markdown and previewed formatted', async ({ page }) => {
  await addTaskForToday(page, 'Przygotować wyjazd')
  await page.goto('/tasks')
  await page.getByText('Przygotować wyjazd').click()

  await page.getByLabel('Notatka').fill('**Ważne**\n\n- [ ] paszport\n\n<b>bez HTML</b>')
  await page.getByRole('button', { name: 'Podgląd' }).click()

  const preview = page.locator('.markdown')
  await expect(preview.locator('strong')).toHaveText('Ważne')
  await expect(preview.getByRole('checkbox')).toBeVisible()
  // Raw HTML is shown as text, never rendered.
  await expect(preview.locator('b')).toHaveCount(0)
  await expect(preview).toContainText('<b>bez HTML</b>')
})
