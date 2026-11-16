import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomReminderForm } from '@/components/CustomReminderForm'

describe('CustomReminderForm', () => {
  it('turns minutes into a reminder without a time', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<CustomReminderForm onAdd={onAdd} onCancel={() => {}} />)

    expect(screen.queryByLabelText('O godzinie')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Ile'), '45')
    await user.click(screen.getByRole('button', { name: 'Dodaj' }))

    expect(onAdd).toHaveBeenCalledWith({ offset: 45, time: null })
  })

  it('asks for a time with days and refuses an amount out of range', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<CustomReminderForm wholeDaysOnly onAdd={onAdd} onCancel={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Dodaj' }))
    expect(screen.getByText('Wpisz liczbę od 1 do 365.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Ile'), '5')
    const time = screen.getByLabelText('O godzinie')
    await user.clear(time)
    await user.type(time, '09:00')
    await user.click(screen.getByRole('button', { name: 'Dodaj' }))

    expect(onAdd).toHaveBeenCalledWith({ offset: 7200, time: '09:00' })
  })

  it('lets an all-day reminder fall on the day itself', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<CustomReminderForm wholeDaysOnly sameDay onAdd={onAdd} onCancel={() => {}} />)

    await user.type(screen.getByLabelText('Ile'), '0')
    await user.click(screen.getByRole('button', { name: 'Dodaj' }))

    // 7:00 is the default time, so it is kept as none.
    expect(onAdd).toHaveBeenCalledWith({ offset: 0, time: null })
  })
})
