import { lazy, Suspense, type ReactNode } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { pl } from '@/i18n/pl'

const MarkdownPreview = lazy(() => import('@/components/MarkdownPreview'))

const text = pl.notes.help

function Example({ typed, children }: { typed: string; children: ReactNode }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 pr-3 align-middle font-mono text-sm break-all">{typed}</td>
      <td className="py-2 align-middle">{children}</td>
    </tr>
  )
}

/** "Jak formatować": what to type for bold text, lists, boxes and links, and how it looks. */
export function FormattingHelp({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <BottomSheet
      title={text.title}
      description={text.description}
      open={open}
      onOpenChange={onOpenChange}
    >
      <table className="w-full table-fixed text-left">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="w-1/2 pb-1 font-semibold">{text.typed}</th>
            <th className="pb-1 font-semibold">{text.shown}</th>
          </tr>
        </thead>
        <tbody>
          {text.examples.map((example) => (
            <Example key={example} typed={example}>
              {/* The same rendering as "Podgląd", with its spacing taken off. */}
              <Suspense fallback={<span className="text-sm">{example}</span>}>
                <div className="[&_*]:my-0">
                  <MarkdownPreview text={example} />
                </div>
              </Suspense>
            </Example>
          ))}
          <Example typed={text.noteLink}>
            <span className="text-sm text-brand-text underline">{text.noteLinkShown}</span>
            <span className="block text-xs text-muted-foreground">{text.noteLinkSoon}</span>
          </Example>
        </tbody>
      </table>

      <h3 className="mt-4 text-sm font-semibold">{text.tipsTitle}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {text.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </BottomSheet>
  )
}
