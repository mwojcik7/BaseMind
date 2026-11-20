import { lazy, Suspense, useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { pl } from '@/i18n/pl'
import { toggleTaskLine } from '@/lib/task-items'

// Loaded only when the preview is opened: the Markdown parser is the biggest part.
const MarkdownPreview = lazy(() => import('@/components/MarkdownPreview'))

const FIELD_CLASS =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'

/** A note in Markdown: a plain text field, with a preview one tap away. */
export function MarkdownField({
  id,
  label,
  registration,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  registration: UseFormRegisterReturn
  value: string
  error?: string
  /** With it, boxes can be ticked in the preview; gets the whole new text. */
  onChange?: (value: string) => void
}) {
  const [preview, setPreview] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex rounded-md bg-secondary p-0.5 text-sm" role="group">
          {[false, true].map((mode) => (
            <button
              key={String(mode)}
              type="button"
              aria-pressed={preview === mode}
              onClick={() => setPreview(mode)}
              className="min-h-9 rounded px-3 font-medium text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
            >
              {mode ? pl.markdown.preview : pl.markdown.edit}
            </button>
          ))}
        </div>
      </div>

      {/* Kept mounted while previewing, so the form keeps the value and the field. */}
      <textarea
        id={id}
        rows={4}
        hidden={preview}
        aria-describedby={`${id}-hint`}
        className={FIELD_CLASS}
        {...registration}
      />
      {preview ? (
        <div className="min-h-24 rounded-md border border-input px-3 py-2">
          {value.trim() ? (
            <Suspense fallback={null}>
              <MarkdownPreview
                text={value}
                onToggle={onChange && ((line) => onChange(toggleTaskLine(value, line)))}
              />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">{pl.markdown.empty}</p>
          )}
        </div>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {pl.markdown.hint}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
