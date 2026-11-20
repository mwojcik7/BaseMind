import { createContext, useContext, type ComponentProps } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { pl } from '@/i18n/pl'
import { normalizeTaskItems } from '@/lib/task-items'

/** The line of the list item being rendered, so its box knows what to tick. */
const ItemLine = createContext<number | null>(null)
const Toggle = createContext<((line: number) => void) | undefined>(undefined)

function TaskBox({ checked }: ComponentProps<'input'>) {
  const line = useContext(ItemLine)
  const toggle = useContext(Toggle)
  const enabled = toggle !== undefined && line !== null

  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={!enabled}
      aria-label={checked ? pl.markdown.untick : pl.markdown.tick}
      onChange={() => enabled && toggle(line)}
      // Larger than the browser's default, for a finger.
      className="size-4 align-middle accent-primary"
    />
  )
}

// Raw HTML in the text is never rendered (react-markdown escapes it), and links with
// unsafe protocols such as javascript: are dropped by its default URL filter.
const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  // External images are blocked by the CSP and could reveal when a note is read,
  // so an image is shown as a link to it.
  img: ({ src, alt }) =>
    typeof src === 'string' ? (
      <a href={src} target="_blank" rel="noopener noreferrer">
        {alt || src}
      </a>
    ) : null,
  li: ({ node, children, className }) => (
    <li className={className}>
      <ItemLine.Provider value={node?.position?.start.line ?? null}>{children}</ItemLine.Provider>
    </li>
  ),
  input: ({ type, checked }) => (type === 'checkbox' ? <TaskBox checked={checked} /> : null),
}

/**
 * Formatted Markdown (GitHub flavour: tables, task lists, strikethrough, autolinks). Boxes
 * are read leniently (`lib/task-items.ts`); with `onToggle` they can be ticked, and get the
 * line (1-based) of the text whose box changed.
 */
export function MarkdownPreview({
  text,
  onToggle,
}: {
  text: string
  onToggle?: (line: number) => void
}) {
  return (
    <div className="markdown">
      <Toggle.Provider value={onToggle}>
        <Markdown remarkPlugins={[remarkGfm]} components={components}>
          {normalizeTaskItems(text)}
        </Markdown>
      </Toggle.Provider>
    </div>
  )
}

export default MarkdownPreview
