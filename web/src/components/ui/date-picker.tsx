import { format, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
// date-fns locale extended with Polish labels for screen readers.
import { pl as dateLocale } from 'react-day-picker/locale'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { pl } from '@/i18n/pl'

interface DatePickerProps {
  id?: string
  /** Date without time, 'yyyy-MM-dd' (projekt.md, section 4.1). */
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  /** Short date, for narrow fields. */
  compact?: boolean
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = pl.datePicker.placeholder,
  compact = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  function select(next: string | null) {
    onChange(next)
    setOpen(false)
  }

  return (
    <BottomSheet
      title={pl.datePicker.title}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          id={id}
          variant="outline"
          className="w-full justify-start text-base font-normal has-[>svg]:px-3"
        >
          <CalendarIcon aria-hidden className="text-muted-foreground" />
          {selected ? (
            format(selected, compact ? 'd MMM yyyy' : 'd MMMM yyyy', { locale: dateLocale })
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      }
    >
      <Calendar
        mode="single"
        required
        locale={dateLocale}
        weekStartsOn={1}
        selected={selected}
        defaultMonth={selected}
        onSelect={(date) => select(format(date, 'yyyy-MM-dd'))}
      />
      {value && (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => select(null)}>
          {pl.datePicker.clear}
        </Button>
      )}
    </BottomSheet>
  )
}
