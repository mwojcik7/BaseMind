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
  // A Monday morning: late in the evening a new event would run past midnight and show twice.
  await page.clock.setFixedTime(new Date('2026-12-07T10:00:00'))
  await page.goto('/calendar')
})

const quickAdd = (page: Page) => page.getByRole('dialog', { name: 'Szybkie dodawanie' })

/** Types into the [+] sheet's event tab and saves. */
async function quickEvent(page: Page, input: string) {
  await navigation(page).getByRole('button', { name: 'Dodaj' }).click()
  await quickAdd(page).getByRole('button', { name: 'Wydarzenie' }).click()
  await quickAdd(page).getByRole('textbox', { name: 'Np. jutro 18:00 dentysta' }).fill(input)
  await quickAdd(page).getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(quickAdd(page)).toBeHidden()
}

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
  await sheet(page).getByRole('button', { name: 'Usuń', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Usunąć wydarzenie cykliczne?' })
    .getByRole('button', { name: 'Tylko to wydarzenie' })
    .click()
  await expect(toast(page, 'Usunięto wydarzenie')).toBeVisible()
  await expect(rows(page, 'Trening')).toHaveCount(count - 1)
})

test('an occurrence of a series is duplicated as a single event, with what the form shows', async ({
  page,
}) => {
  await addEvent(page, 'Trening', /^Co tydzień w/)
  const count = await rows(page, 'Trening').count()

  await rows(page, 'Trening').nth(1).click()
  // Changed on screen but not saved: the copy takes it, the original doesn't.
  await sheet(page).getByLabel('Miejsce').fill('Hala B')
  await sheet(page).getByRole('button', { name: 'Duplikuj' }).click()
  await expect(sheet(page).getByRole('heading', { name: 'Nowe wydarzenie' })).toBeVisible()
  await expect(sheet(page).getByLabel('Tytuł')).toHaveValue('Trening (kopia)')
  await expect(sheet(page).getByLabel('Miejsce')).toHaveValue('Hala B')
  await sheet(page).getByRole('button', { name: 'Zapisz' }).click()
  await expect(toast(page, 'Dodano wydarzenie').last()).toBeVisible()

  await expect(rows(page, 'Trening (kopia)')).toHaveCount(1)
  await expect(rows(page, 'Trening')).toHaveCount(count + 1)
  await expect(rows(page, 'Hala B')).toHaveCount(1)
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

test('the [+] sheet reads an event from text and starts on the event tab here', async ({
  page,
}) => {
  await navigation(page).getByRole('button', { name: 'Dodaj' }).click()
  await expect(quickAdd(page).getByRole('button', { name: 'Wydarzenie' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const input = quickAdd(page).getByRole('textbox', { name: 'Np. jutro 18:00 dentysta' })

  await input.fill('w piątek 10-12 przegląd auta')
  await expect(quickAdd(page).getByLabel('Godzina początku')).toHaveValue('10:00')
  await expect(quickAdd(page).getByLabel('Godzina końca')).toHaveValue('12:00')
  await expect(quickAdd(page).getByLabel('Cały dzień')).not.toBeChecked()

  await input.fill('co wtorek 18:00 basen')
  await expect(quickAdd(page).getByTestId('quick-add-summary')).toHaveText('Co tydzień: wt.')

  await input.fill('jutro 18:00 dentysta')
  await quickAdd(page).getByRole('button', { name: 'Dodaj', exact: true }).click()
  await toast(page, 'Dodano wydarzenie').getByRole('button', { name: 'Otwórz' }).click()
  await expect(sheet(page).getByLabel('Tytuł')).toHaveValue('dentysta')
  await expect(sheet(page).getByLabel('Godzina początku')).toHaveValue('18:00')
  const reminders = sheet(page).getByRole('group', { name: 'Przypomnienia' }).getByRole('listitem')
  await expect(reminders).toHaveText(['Dzień wcześniej, 7:00'])
})

test('a quick event goes on the day picked in the month', async ({ page }) => {
  await page.getByRole('tab', { name: 'Miesiąc' }).click()
  await page.getByRole('button', { name: /^czwartek 17 grudnia/ }).click()

  await quickEvent(page, 'Kino')

  await expect(page.getByRole('region', { name: 'czwartek 17 grudnia' })).toContainText('Kino')
})

test('an event until midnight shows on its own day only', async ({ page }) => {
  await page.getByRole('tab', { name: 'Agenda' }).click()
  await quickEvent(page, 'dziś 23-0 koncert')

  await expect(rows(page, 'koncert')).toHaveCount(1)
  await expect(rows(page, 'koncert')).toContainText('23:00–00:00')
})

test('the dashboard widget shows today and tomorrow, with past events greyed out', async ({
  page,
}) => {
  await quickEvent(page, 'dziś 8-9 basen')
  await quickEvent(page, 'jutro 18:00 dentysta')
  await quickEvent(page, 'pojutrze kino')

  await navigation(page).getByRole('link', { name: 'Dziś' }).click()
  const today = page.getByRole('region', { name: 'Dziś', exact: true })
  const tomorrow = page.getByRole('region', { name: 'Jutro', exact: true })
  await expect(today.getByRole('link', { name: /basen/ })).toHaveAttribute('data-over', 'true')
  await expect(tomorrow.getByRole('link', { name: /dentysta/ })).toContainText('18:00–19:00')
  await expect(tomorrow.getByRole('link', { name: /dentysta/ })).not.toHaveAttribute('data-over')
  await expect(page.getByText('kino')).toBeHidden()

  await tomorrow.getByRole('link', { name: /dentysta/ }).click()
  await expect(sheet(page).getByLabel('Tytuł')).toHaveValue('dentysta')
})

test('day and week views lay events on the hour axis and open a new one on a tapped hour', async ({
  page,
}) => {
  await quickEvent(page, 'dziś 9-11 warsztat')
  await quickEvent(page, 'dziś 9:30-10 telefon')
  await quickEvent(page, 'dziś urlop')
  await quickEvent(page, 'jutro 15-16 dentysta')
  await navigation(page).getByRole('button', { name: 'Dodaj' }).click()
  await quickAdd(page).getByRole('button', { name: 'Zadanie' }).click()
  await quickAdd(page)
    .getByRole('textbox', { name: 'Np. kupić mleko jutro !1' })
    .fill('dziś 12:00 zadzwonić')
  await quickAdd(page).getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(quickAdd(page)).toBeHidden()

  await page.getByRole('tab', { name: 'Dzień', exact: true }).click()
  const today = page.getByRole('region', { name: 'Dziś · poniedziałek 7 grudnia' })
  await expect(today.getByRole('link', { name: /warsztat/ })).toBeVisible()
  await expect(today.getByRole('link', { name: /telefon/ })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Cały dzień' })).toContainText('urlop')
  const call12 = today.getByRole('checkbox', { name: /zadzwonić/ })
  await expect(call12).toBeVisible()
  await page.screenshot({
    path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/day.png` : undefined,
  })

  await call12.click()
  // Done tasks are hidden unless the layers sheet says otherwise.
  await expect(call12).toBeHidden()

  // Side by side: the two overlapping blocks share the width.
  const workshop = await today.getByRole('link', { name: /warsztat/ }).boundingBox()
  const call = await today.getByRole('link', { name: /telefon/ }).boundingBox()
  expect(call!.x).toBeGreaterThan(workshop!.x + workshop!.width - 2)

  await page.getByRole('button', { name: 'Następny dzień' }).click()
  await expect(
    page.getByRole('region', { name: 'wtorek 8 grudnia' }).getByRole('link', { name: /dentysta/ }),
  ).toBeVisible()

  await page.getByRole('tab', { name: '3 dni', exact: true }).click()
  // A phone shows three days from the day picked.
  await expect(page.getByRole('heading', { name: '8 grudnia – 10 grudnia 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Poprzednie dni' }).click()
  await expect(page.getByRole('heading', { name: '5 grudnia – 7 grudnia 2026' })).toBeVisible()
  await page.screenshot({
    path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/week.png` : undefined,
  })

  // An empty hour: 14:00 on Sunday 6 December.
  const sunday = page.getByTestId('hours-2026-12-06')
  await sunday.scrollIntoViewIfNeeded()
  await sunday.click({ position: { x: 10, y: 14 * 48 + 10 } })
  await expect(sheet(page).getByLabel('Godzina początku')).toHaveValue('14:00')
  await expect(sheet(page).getByLabel('Godzina końca')).toHaveValue('15:00')
  await expect(sheet(page).getByLabel('Data początku')).toContainText('6')
})

/** A real touch swipe (through CDP), so the browser applies touch-action as on a phone. */
async function swipeLeft(page: Page, x: number, y: number) {
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', px: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x: px, y }],
    })
  await touch('touchStart', x)
  for (let step = 1; step <= 10; step++) await touch('touchMove', x - step * 20)
  await touch('touchEnd', x - 200)
}

/** Holds a finger on a point, then drags it down by `dy` pixels (a real touch through CDP). */
async function holdAndDrag(page: Page, x: number, y: number, dy: number) {
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', py: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y: py }],
    })
  await touch('touchStart', y)
  await page.waitForTimeout(600)
  for (let step = 1; step <= 10; step++) await touch('touchMove', y + (step * dy) / 10)
  await touch('touchEnd', y + dy)
}

test('a block on the hour axis is held and dragged to a new time, with undo', async ({ page }) => {
  await quickEvent(page, 'dziś 9-10 basen')
  await page.getByRole('tab', { name: 'Dzień', exact: true }).click()
  const swim = page.getByRole('link', { name: /basen/ })
  await expect(swim).toContainText('09:00–10:00')

  const box = (await swim.boundingBox())!
  await holdAndDrag(page, box.x + box.width / 2, box.y + 10, 48)

  await expect(toast(page, 'Przeniesiono wydarzenie')).toBeVisible()
  await expect(swim).toContainText('10:00–11:00')
  // The drag scrolled nothing and opened nothing.
  await expect(sheet(page)).toBeHidden()

  await toast(page, 'Przeniesiono wydarzenie').getByRole('button', { name: 'Cofnij' }).click()
  await expect(swim).toContainText('09:00–10:00')
})

test('a mouse drags the length of an event and moves one occurrence of a series', async ({
  page,
}) => {
  await quickEvent(page, 'dziś 9-10 basen')
  await quickEvent(page, 'co poniedziałek 12-13 trening')
  await page.getByRole('tab', { name: 'Dzień', exact: true }).click()

  const swim = page.getByRole('link', { name: /basen/ })
  const box = (await swim.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 3)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 10, { steps: 3 })
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 21, { steps: 3 })
  await page.mouse.up()
  await expect(swim).toContainText('09:00–10:30')
  await expect(sheet(page)).toBeHidden()

  const training = page.getByRole('link', { name: /trening/ })
  await training.scrollIntoViewIfNeeded()
  const start = (await training.boundingBox())!
  await page.mouse.move(start.x + 20, start.y + 10)
  await page.mouse.down()
  await page.mouse.move(start.x + 20, start.y + 34, { steps: 5 })
  await page.mouse.up()
  const prompt = page.getByRole('dialog', { name: 'Zmienić wydarzenie cykliczne?' })
  await prompt.getByRole('button', { name: 'Tylko to wydarzenie' }).click()
  await expect(training).toContainText('12:30–13:30')

  // Next Monday keeps the series' time.
  await page.getByRole('button', { name: 'Następny dzień' }).click()
  for (let day = 0; day < 6; day++) {
    await page.getByRole('button', { name: 'Następny dzień' }).click()
  }
  await expect(page.getByRole('link', { name: /trening/ })).toContainText('12:00–13:00')
})

test('a swipe on the hour axis turns the day', async ({ page }) => {
  await page.getByRole('tab', { name: 'Dzień', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dziś · poniedziałek 7 grudnia' })).toBeVisible()

  // Somewhere on the visible part of the axis, under the strip and headings.
  const axis = await page.getByTestId('hours-2026-12-07').boundingBox()
  const title = await page
    .getByRole('heading', { name: 'Dziś · poniedziałek 7 grudnia' })
    .boundingBox()
  await swipeLeft(page, axis!.x + axis!.width - 20, title!.y + 250)

  await expect(page.getByRole('heading', { name: 'wtorek 8 grudnia' })).toBeVisible()
})
