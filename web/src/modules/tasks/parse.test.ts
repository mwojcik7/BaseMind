import { describe, expect, it } from 'vitest'
import { parseQuickText } from '@/lib/quick-parser'
import { taskRules } from '@/modules/tasks/parse'
import { pinToDate } from '@/modules/tasks/recurrence'

// A Monday.
const now = new Date(2026, 10, 9, 12)
const LISTS = [
  { id: 'dom', name: 'Dom' },
  { id: 'ogrod', name: 'Dom i ogród' },
  { id: 'praca', name: 'Praca' },
]
const parse = (text: string, at = now) => parseQuickText(text, taskRules(LISTS), { now: at })

describe('task rules', () => {
  it.each([
    ['mleko dziś', '2026-11-09'],
    ['mleko dzis', '2026-11-09'],
    ['mleko dzisiaj', '2026-11-09'],
    ['mleko jutro', '2026-11-10'],
    ['mleko pojutrze', '2026-11-11'],
    ['mleko w środę', '2026-11-11'],
    ['mleko we wtorek', '2026-11-10'],
    ['mleko w srode', '2026-11-11'],
    ['mleko w piątek', '2026-11-13'],
    ['mleko w piatek', '2026-11-13'],
    ['mleko w niedzielę', '2026-11-15'],
    ['mleko w przyszły wtorek', '2026-11-17'],
    ['mleko w przyszłą środę', '2026-11-18'],
    ['mleko w następny piątek', '2026-11-20'],
    ['mleko za 3 dni', '2026-11-12'],
    ['mleko za tydzień', '2026-11-16'],
    ['mleko za 2 tygodnie', '2026-11-23'],
    ['mleko za miesiąc', '2026-12-09'],
    ['mleko 15.11', '2026-11-15'],
    ['mleko 15.11.2027', '2027-11-15'],
    ['mleko 15 listopada', '2026-11-15'],
    ['mleko 3 pazdziernika', '2027-10-03'],
    ['mleko 1 stycznia 2028', '2028-01-01'],
  ])('reads the date in "%s"', (text, date) => {
    expect(parse(text)).toEqual({ text: 'mleko', fields: { date } })
  })

  it('means next week when the weekday is today', () => {
    expect(parse('w poniedziałek').fields.date).toBe('2026-11-16')
  })

  it('leaves a day that does not exist in the text', () => {
    expect(parse('mleko 31.02')).toEqual({ text: 'mleko 31.02', fields: {} })
  })

  it.each([
    ['o 18', '18:00'],
    ['o 7:05', '07:05'],
    ['o 18.30', '18:30'],
    ['18:30', '18:30'],
    ['o 7 rano', '07:00'],
    ['o 8 wieczorem', '20:00'],
    ['o 3 po południu', '15:00'],
  ])('reads the time in "%s"', (phrase, time) => {
    expect(parse(`mleko ${phrase}`)).toEqual({ text: 'mleko', fields: { time } })
  })

  it('leaves a time that does not exist alone', () => {
    expect(parse('mleko o 25').fields).toEqual({})
  })

  it.each([
    ['codziennie', 'FREQ=DAILY'],
    ['co dzień', 'FREQ=DAILY'],
    ['w dni robocze', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
    ['co dzień roboczy', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
    ['co tydzień', 'FREQ=WEEKLY'],
    ['co poniedziałek', 'FREQ=WEEKLY;BYDAY=MO'],
    ['w każdy piątek', 'FREQ=WEEKLY;BYDAY=FR'],
    ['w każdą środę', 'FREQ=WEEKLY;BYDAY=WE'],
    ['co czw i pon', 'FREQ=WEEKLY;BYDAY=MO,TH'],
    ['co wt, pt oraz nd', 'FREQ=WEEKLY;BYDAY=TU,FR,SU'],
    ['co miesiąc', 'FREQ=MONTHLY'],
    ['co 10.', 'FREQ=MONTHLY;BYMONTHDAY=10'],
    ['w ostatni piątek miesiąca', 'FREQ=MONTHLY;BYDAY=-1FR'],
    ['co ostatnią niedzielę', 'FREQ=MONTHLY;BYDAY=-1SU'],
    ['co rok', 'FREQ=YEARLY'],
    ['co 3 dni', 'FREQ=DAILY;INTERVAL=3'],
    ['co 2 tygodnie', 'FREQ=WEEKLY;INTERVAL=2'],
    ['co 6 miesięcy', 'FREQ=MONTHLY;INTERVAL=6'],
    ['co 1 dzień', 'FREQ=DAILY'],
  ])('reads the repeat in "%s"', (phrase, rrule) => {
    expect(parse(`podlać kwiaty ${phrase}`)).toEqual({ text: 'podlać kwiaty', fields: { rrule } })
  })

  it('reads how a series counts and ends', () => {
    expect(parse('podlać kwiaty co 3 dni po zrobieniu 5 razy')).toEqual({
      text: 'podlać kwiaty',
      fields: { rrule: 'FREQ=DAILY;INTERVAL=3', repeat_from: 'completion', repeat_remaining: 5 },
    })
  })

  it('reads a weekly repeat with its day as a date', () => {
    expect(parse('basen co tydzień w piątek o 18')).toEqual({
      text: 'basen',
      fields: { rrule: 'FREQ=WEEKLY', date: '2026-11-13', time: '18:00' },
    })
  })

  it('does not take "w każdy piątek" for a single date', () => {
    expect(parse('basen w każdy piątek').fields.date).toBeUndefined()
  })

  it.each([
    ['przypomnij', 0],
    ['przypomnij 30 min', 30],
    ['przypomnij 30 minut przed', 30],
    ['przypomnij godzinę przed', 60],
    ['przypomnij 1h', 60],
    ['przypomnij dzień wcześniej', 1440],
  ])('reads the reminder in "%s"', (phrase, offset) => {
    expect(parse(`zadzwonić ${phrase}`)).toEqual({
      text: 'zadzwonić',
      fields: { reminder_offset: offset },
    })
  })

  it('finds a list by name, the longest one first', () => {
    expect(parse('kosić trawę #dom i ogród').fields.list_id).toBe('ogrod')
    expect(parse('#Dom odkurzyć').fields.list_id).toBe('dom')
    expect(parse('raport #praca')).toEqual({ text: 'raport', fields: { list_id: 'praca' } })
  })

  it('leaves an unknown list in the title', () => {
    expect(parse('raport #szkoła')).toEqual({ text: 'raport #szkoła', fields: {} })
    expect(parseQuickText('raport #praca', taskRules(), { now }).fields).toEqual({})
  })

  it.each([1, 2, 3, 4])('reads priority !%i', (priority) => {
    expect(parse(`mleko !${priority}`)).toEqual({ text: 'mleko', fields: { priority } })
  })

  it('ignores an exclamation mark that is not a priority', () => {
    expect(parse('mleko !5').fields).toEqual({})
    expect(parse('super!1').fields).toEqual({})
  })

  it('reads everything together', () => {
    expect(parse('!1 kupić jutro mleko o 9 #Dom przypomnij 30 min')).toEqual({
      text: 'kupić mleko',
      fields: {
        date: '2026-11-10',
        time: '09:00',
        priority: 1,
        list_id: 'dom',
        reminder_offset: 30,
      },
    })
  })

  it('leaves words that only contain a date or a repeat alone', () => {
    expect(parse('dzisiejsza gazeta').fields).toEqual({})
    expect(parse('codzienność').fields).toEqual({})
    expect(parse('o czym mowa').fields).toEqual({})
  })
})

describe('pinning a bare rule to the date', () => {
  it.each([
    ['FREQ=WEEKLY', '2026-11-13', 'FREQ=WEEKLY;BYDAY=FR'],
    ['FREQ=WEEKLY;INTERVAL=2', '2026-11-13', 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR'],
    ['FREQ=MONTHLY', '2026-11-13', 'FREQ=MONTHLY;BYMONTHDAY=13'],
    ['FREQ=YEARLY', '2026-11-13', 'FREQ=YEARLY;BYMONTH=11;BYMONTHDAY=13'],
    ['FREQ=DAILY', '2026-11-13', 'FREQ=DAILY'],
    ['FREQ=WEEKLY;BYDAY=MO', '2026-11-13', 'FREQ=WEEKLY;BYDAY=MO'],
  ])('%s on %s', (rule, date, pinned) => {
    expect(pinToDate(rule, date)).toBe(pinned)
  })
})
