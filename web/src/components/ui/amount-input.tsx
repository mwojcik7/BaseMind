import { cn } from 'cn'
import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { formatAmount, parseAmount } from '@/lib/money'

interface AmountInputProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** Amount in minor units (grosze); null when empty or invalid. */
  value: number | null
  onValueChange: (value: number | null) => void
  suffix?: string
}

export function AmountInput({
  value,
  onValueChange,
  suffix = 'zł',
  className,
  onBlur,
  ...props
}: AmountInputProps) {
  const [text, setText] = useState(value === null ? '' : formatAmount(value))
  const [syncedValue, setSyncedValue] = useState(value)

  // The parent changed the value (e.g. reset the form): show the new one, but never
  // overwrite what is being typed, like "12," which is the same amount as "12,00".
  if (value !== syncedValue) {
    setSyncedValue(value)
    setText(value === null ? '' : formatAmount(value))
  }

  function handleChange(next: string) {
    const parsed = parseAmount(next)
    setText(next)
    setSyncedValue(parsed)
    onValueChange(parsed)
  }

  return (
    <div className="relative">
      <Input
        {...props}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        aria-invalid={text !== '' && value === null}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={(event) => {
          if (value !== null) {
            setText(formatAmount(value))
          }
          onBlur?.(event)
        }}
        className={cn('pr-10 text-right tabular-nums', className)}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground"
      >
        {suffix}
      </span>
    </div>
  )
}
