import { describe, expect, it } from 'vitest'
import { reminderLabel } from '@/lib/reminder-label'

describe('reminder label', () => {
  it('uses the ready-made labels where there is one', () => {
    expect(reminderLabel(15, 'timed')).toBe('15 min przed')
    expect(reminderLabel(0, 'allDay')).toBe('W dniu, 7:00')
    expect(reminderLabel(0, 'task')).toBe('W chwili terminu')
    expect(reminderLabel({ offset: 1440, time: '07:00' }, 'timed')).toBe('Dzień wcześniej, 7:00')
  })

  it('builds one from the numbers for a hand-made reminder', () => {
    expect(reminderLabel(45, 'timed')).toBe('45 min przed')
    expect(reminderLabel(180, 'task')).toBe('3 godz. przed')
    expect(reminderLabel({ offset: 7200, time: '09:00' }, 'timed')).toBe('5 dni wcześniej, 9:00')
    expect(reminderLabel({ offset: 1440, time: '20:30' }, 'task')).toBe('Dzień wcześniej, 20:30')
    expect(reminderLabel({ offset: 0, time: '09:30' }, 'allDay')).toBe('W dniu, 9:30')
    expect(reminderLabel({ offset: 20160, time: '18:00' }, 'allDay')).toBe(
      '2 tygodnie wcześniej, 18:00',
    )
    expect(reminderLabel(10080, 'timed')).toBe('Tydzień wcześniej, 7:00')
    expect(reminderLabel(7200, 'allDay')).toBe('5 dni wcześniej, 7:00')
  })
})
