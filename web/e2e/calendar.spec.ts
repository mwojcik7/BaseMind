import { expect, test, type Page } from '@playwright/test'
import { logInThroughForm, newAccount, register } from './helpers.ts'

const navigation = (page: Page) => page.getByRole('navigation', { name: 'Główna nawigacja' })
const toast = (page: Page, text: string) =>
  page.locator('[data-sonner-toast]').filter({ hasText: text })
const sheet = (page: Page) => page.getByRole('dialog')
const rows = (page: Page, title: string) => page.getByRole('link').filter({ hasText: title })

test.beforeEach(async ({ page, request }) => {
  const account = newAccount()
  await register(request, account)
  await logInThroughForm(page, account)
  await expect(navigation(page)).toBeVisible()
  await page.goto('/calendar')
})

async function addEvent(page: Page, title: string, repeat?: RegExp) {
  await page.getByRole('link', { name: 'Nowe wydarzenie' }).click()
  await sheet(page).getByLabel('Tytuł').fill(title)
  if (repeat) {
    await sheet(page).getByLabel('Powtarzaj').click()
    await page.getByRole('option', { name: repeat }).click()
  }
  await sheet(page).getByRole('button', { name: 'Zapisz' }).click()
  await expect(toast(page, 'Dodano wydarzenie')).toBeVisible()
  await expect(sheet(page)).toBeHidden()
}

test('an event is added with a reminder the day before, changed and deleted with undo', async ({
  page,
}) => {
  await addEvent(page, 'Dentysta')
  await expect(rows(page, 'Dentysta')).toHaveCount(1)

  await rows(page, 'Dentysta').click()
  const reminders = sheet(page).getByRole('group', { name: 'Przypomnienia' }).getByRole('listitem')
  await expect(reminders).toHaveText(['Dzień wcześniej, 7:00'])
  await sheet(page).getByLabel('Dodaj przypomnienie').click()
  await page.getByRole('option', { name: '1 godz. przed' }).click()
  await expect(reminders).toHaveText(['Dzień wcześniej, 7:00', '1 godz. przed'])
  await sheet(page)
    .getByRole('button', { name: 'Usuń przypomnienie: Dzień wcześniej, 7:00' })
    .click()
  await expect(reminders).toHaveText(['1 godz. przed'])
  await sheet(page).getByLabel('Miejsce').fill('ul. Zdrowa 5')
  await sheet(page).getByTitle('Zielony').click()
  await expect(sheet(page).getByRole('radio', { name: 'Zielony' })).toBeChecked()
  await sheet(page).getByRole('button', { name: 'Zapisz' }).click()
  await expect(rows(page, 'Dentysta')).toContainText('ul. Zdrowa 5')

  await rows(page, 'Dentysta').click()
  await expect(reminders).toHaveText(['1 godz. przed'])
  await sheet(page).getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect(rows(page, 'Dentysta')).toHaveCount(0)
  await toast(page, 'Usunięto wydarzenie').getByRole('button', { name: 'Cofnij' }).click()
  await expect(rows(page, 'Dentysta')).toHaveCount(1)
})

test('an all-day event hides the times and offers morning reminders', async ({ page }) => {
  await page.getByRole('link', { name: 'Nowe wydarzenie' }).click()
  await sheet(page).getByLabel('Tytuł').fill('Urodziny mamy')
  await sheet(page).getByLabel('Cały dzień').click()

  await expect(sheet(page).getByLabel('Godzina początku')).toBeHidden()
  await sheet(page).getByLabel('Dodaj przypomnienie').click()
  // A day before is already set, as for every new event.
  await expect(page.getByRole('option')).toHaveText([
    'W dniu, 7:00',
    '2 dni wcześniej, 7:00',
    '3 dni wcześniej, 7:00',
    'Tydzień wcześniej, 7:00',
    'Miesiąc wcześniej, 7:00',
    'Własne…',
  ])
  await page.getByRole('option', { name: 'Tydzień wcześniej, 7:00' }).click()

  // One made by hand: two days before, in the evening.
  await sheet(page).getByLabel('Dodaj przypomnienie').click()
  await page.getByRole('option', { name: 'Własne…' }).click()
  await sheet(page).getByLabel('Ile').fill('2')
  await sheet(page).getByLabel('O godzinie').fill('20:30')
  await sheet(page).getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(sheet(page).getByText('2 dni wcześniej, 20:30')).toBeVisible()

  await sheet(page).getByRole('button', { name: 'Zapisz' }).click()
  await expect(rows(page, 'Urodziny mamy')).toContainText('cały dzień')
})

test('a weekly event shows every week and one week can be skipped', async ({ page }) => {
  await addEvent(page, 'Trening', /^Co tydzień w/)
  // Nine weeks fit in the next 60 days, give or take one.
  const count = await rows(page, 'Trening').count()
  expect(count).toBeGreaterThanOrEqual(8)

  await rows(page, 'Trening').nth(1).click()
  await expect(sheet(page).getByText('Zmiany dotyczą całej serii.')).toBeVisible()
  await sheet(page).getByRole('button', { name: 'Pomiń to wystąpienie' }).click()
  await expect(toast(page, 'Pominięto wystąpienie')).toBeVisible()
  await expect(rows(page, 'Trening')).toHaveCount(count - 1)
})

test('agenda and month show holidays, and the layers sheet hides them', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T10:00:00'))
  await page.goto('/calendar')

  await page.getByRole('tab', { name: 'Agenda' }).click()
  await expect(page.getByRole('region', { name: 'Dziś · poniedziałek 9 listopada' })).toContainText(
    'Nic zaplanowanego',
  )
  await expect(
    page.getByRole('region', { name: 'środa 11 listopada' }).getByText('Święto Niepodległości'),
  ).toBeVisible()

  await page.getByRole('tab', { name: 'Miesiąc' }).click()
  await expect(page.getByRole('heading', { name: 'listopad 2026' })).toBeVisible()
  await page.getByRole('button', { name: /^środa 11 listopada/ }).click()
  const day = page.getByRole('region', { name: 'środa 11 listopada' })
  await expect(day.getByText('Święto Niepodległości')).toBeVisible()

  await page.getByRole('button', { name: 'Następny miesiąc' }).click()
  await expect(page.getByRole('heading', { name: 'grudzień 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Poprzedni miesiąc' }).click()

  await page.getByRole('button', { name: 'Warstwy' }).click()
  await sheet(page).getByLabel('Polskie święta').click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /^środa 11 listopada/ }).click()
  await expect(day).toContainText('Nic zaplanowanego')
})
