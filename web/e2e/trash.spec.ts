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

test('a deleted task waits in the trash with its subtasks and comes back', async ({ page }) => {
  await navigation(page).getByRole('button', { name: 'Dodaj' }).click()
  const input = page.getByRole('textbox', { name: 'Np. kupić mleko jutro !1' })
  await input.fill('Remont łazienki dziś')
  await input.press('Enter')
  await expect(toast(page, 'Dodano zadanie')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.goto('/tasks')
  await page.getByText('Remont łazienki').click()
  const subtask = page.getByRole('textbox', { name: 'Dodaj podzadanie' })
  await subtask.fill('Kupić farbę')
  await subtask.press('Enter')
  await expect(page.getByRole('link', { name: 'Kupić farbę' })).toBeVisible()
  await page.getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect(toast(page, 'Usunięto zadanie')).toBeVisible()

  await page.goto('/more')
  await page.getByRole('link', { name: 'Kosz' }).click()
  await expect(page.getByText('Remont łazienki')).toBeVisible()
  await expect(page.getByText('+1 podzadanie · Zostało 30 dni')).toBeVisible()
  // The subtask comes back with its task, so it is not listed on its own.
  await expect(page.getByText('Kupić farbę')).toHaveCount(0)

  await page.getByRole('button', { name: 'Przywróć' }).click()
  await expect(toast(page, 'Przywrócono')).toBeVisible()
  await expect(page.getByText('Kosz jest pusty')).toBeVisible()

  await page.goto('/tasks')
  await page.getByText('Remont łazienki').click()
  await expect(page.getByRole('link', { name: 'Kupić farbę' })).toBeVisible()
})

test('a list can be removed for good and the trash emptied', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('tab', { name: 'Listy' }).click()
  for (const name of ['Dom', 'Praca']) {
    await page.getByRole('button', { name: 'Nowa lista' }).click()
    const sheet = page.getByRole('dialog', { name: 'Nowa lista' })
    await sheet.getByRole('textbox').fill(name)
    await sheet.getByRole('button', { name: 'Zapisz' }).click()
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
    await page.getByRole('button', { name: 'Usuń listę' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Usuń listę' }).click()
    await expect(toast(page, 'Usunięto listę').first()).toBeVisible()
  }

  await page.goto('/trash')
  await page.getByRole('button', { name: 'Usuń na zawsze: Dom' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Usuń na zawsze' }).click()
  await expect(toast(page, 'Usunięto na zawsze')).toBeVisible()
  await expect(page.getByText('Dom', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Opróżnij kosz' }).click()
  await expect(page.getByRole('dialog')).toContainText('Elementy w koszu: 1')
  await page.getByRole('dialog').getByRole('button', { name: 'Opróżnij kosz' }).click()
  await expect(page.getByText('Kosz jest pusty')).toBeVisible()

  // Gone on the server too: it only has notices of the removal left.
  await expect(async () => {
    const pulled = (await (
      await page.request.get('/api/sync/pull?cursor=0', {
        headers: { Accept: 'application/json', Referer: page.url() },
      })
    ).json()) as {
      changes: { entity: string; purged?: true }[]
    }
    const lists = pulled.changes.filter((change) => change.entity === 'task_lists')
    expect(lists).toHaveLength(2)
    expect(lists.every((change) => change.purged)).toBe(true)
  }).toPass()
})
