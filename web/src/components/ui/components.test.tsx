import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AmountInput } from '@/components/ui/amount-input'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { DatePicker } from '@/components/ui/date-picker'
import { ListItem } from '@/components/ui/list-item'
import { pl } from '@/i18n/pl'

describe('AmountInput', () => {
  function Harness({ initial = null }: { initial?: number | null }) {
    const [value, setValue] = useState<number | null>(initial)
    return (
      <>
        <AmountInput aria-label="Kwota" value={value} onValueChange={setValue} />
        <output>{String(value)}</output>
        <button onClick={() => setValue(null)}>reset</button>
      </>
    )
  }

  it('reports minor units and does not fight the text being typed', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Kwota')

    await user.type(input, '19,')
    expect(input).toHaveValue('19,')
    expect(screen.getByRole('status')).toHaveTextContent('1900')

    await user.type(input, '99')
    expect(screen.getByRole('status')).toHaveTextContent('1999')
  })

  it('normalizes the text on blur', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Kwota')

    await user.type(input, '12.5')
    await user.tab()

    expect(input).toHaveValue('12,50')
  })

  it('marks invalid text and reports null', async () => {
    const user = userEvent.setup()
    render(<Harness initial={100} />)
    const input = screen.getByLabelText('Kwota')

    await user.clear(input)
    expect(input).not.toHaveAttribute('aria-invalid', 'true')

    await user.type(input, 'abc')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('null')
  })

  it('follows a value changed by the parent', async () => {
    const user = userEvent.setup()
    render(<Harness initial={1250} />)
    const input = screen.getByLabelText('Kwota')
    expect(input).toHaveValue('12,50')

    await user.click(screen.getByRole('button', { name: 'reset' }))
    expect(input).toHaveValue('')
  })
})

describe('DatePicker', () => {
  it('returns the picked day as yyyy-MM-dd and shows it in Polish', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="2026-11-04" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '4 listopada 2026' }))
    await user.click(await screen.findByRole('button', { name: /15 listopada 2026/ }))

    expect(onChange).toHaveBeenCalledWith('2026-11-15')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('starts the week on Monday and has Polish labels', async () => {
    const user = userEvent.setup()
    render(<DatePicker value="2026-11-04" onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '4 listopada 2026' }))

    const previousMonth = await screen.findByRole('button', { name: /poprzedni/i })
    expect(previousMonth).toBeInTheDocument()
    expect(document.querySelector('.rdp-weekday')).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/poniedziałek/i),
    )
  })

  it('can be cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="2026-11-04" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '4 listopada 2026' }))
    await user.click(await screen.findByRole('button', { name: pl.datePicker.clear }))

    expect(onChange).toHaveBeenCalledWith(null)
  })
})

describe('BottomSheet', () => {
  it('has an accessible close button for people who cannot drag', async () => {
    const user = userEvent.setup()
    render(<BottomSheet title="Arkusz" trigger={<button>Otwórz</button>} />)

    await user.click(screen.getByRole('button', { name: 'Otwórz' }))
    expect(screen.getByRole('dialog', { name: 'Arkusz' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: pl.common.close }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('ListItem', () => {
  it('offers swipe actions as buttons too, and keeps tapping separate', async () => {
    const user = userEvent.setup()
    const onPress = vi.fn()
    const done = vi.fn()
    const remove = vi.fn()
    render(
      <ul>
        <ListItem
          title="Zadanie"
          onPress={onPress}
          startAction={{ label: 'Zrobione', icon: Check, color: 'success', onAction: done }}
          endAction={{ label: 'Usuń', icon: Trash2, color: 'danger', onAction: remove }}
        />
      </ul>,
    )

    await user.click(screen.getByRole('button', { name: 'Zrobione' }))
    expect(done).toHaveBeenCalledOnce()
    expect(onPress).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Usuń' }))
    expect(remove).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Zadanie' }))
    expect(onPress).toHaveBeenCalledOnce()
  })
})
