import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
}

/** Formatted Markdown (GitHub flavour: tables, task lists, strikethrough, autolinks). */
export function MarkdownPreview({ text }: { text: string }) {
  return (
    <div className="markdown">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </Markdown>
    </div>
  )
}

export default MarkdownPreview
