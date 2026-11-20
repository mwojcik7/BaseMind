import { history, historyKeymap, indentWithTab, defaultKeymap } from '@codemirror/commands'
import {
  deleteMarkupBackward,
  insertNewlineContinueMarkupCommand,
  markdownLanguage,
} from '@codemirror/lang-markdown'
import { HighlightStyle, LanguageSupport, syntaxHighlighting } from '@codemirror/language'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import { EditorView, keymap, placeholder, type ViewUpdate } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { insertLink, toggleBold } from '@/modules/notes/editor/commands'

/** Enter on an empty list item ends the list, as phone note apps do (no blank line in between). */
export const continueList = insertNewlineContinueMarkupCommand({ nonTightLists: false })

/**
 * Markdown as you write it: headings bigger, bold bold, the marks themselves faded. Plain
 * text font, wrapped lines; colours come from the theme tokens, so light and dark both work.
 */
const highlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.5em', fontWeight: '700', lineHeight: '1.3' },
  { tag: tags.heading2, fontSize: '1.3em', fontWeight: '700', lineHeight: '1.3' },
  { tag: tags.heading3, fontSize: '1.15em', fontWeight: '600' },
  { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--brand-text)' },
  { tag: tags.url, color: 'var(--muted-foreground)', textDecoration: 'underline' },
  { tag: tags.monospace, fontFamily: 'ui-monospace, monospace', fontSize: '0.9em' },
  { tag: tags.quote, color: 'var(--muted-foreground)', fontStyle: 'italic' },
  // The marks: #, **, -, >, [ ], `.
  { tag: [tags.processingInstruction, tags.atom], color: 'var(--muted-foreground)' },
  { tag: tags.contentSeparator, color: 'var(--muted-foreground)' },
])

const theme = EditorView.theme({
  '&': { fontSize: 'inherit', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.625', overflow: 'visible' },
  '.cm-content': {
    padding: '0',
    minHeight: '60vh',
    caretColor: 'var(--foreground)',
  },
  '.cm-line': { padding: '0' },
  '.cm-placeholder': { color: 'color-mix(in srgb, var(--muted-foreground) 60%, transparent)' },
})

export interface EditorOptions {
  doc: string
  label: string
  placeholder: string
  maxLength: number
  link: { text: string; address: string }
  /** Room the toolbar takes at the bottom of the screen, so the cursor is kept above it. */
  bottomMargin: () => number
  onChange: (text: string) => void
  onUpdate: (update: ViewUpdate) => void
}

export function noteEditorState(options: EditorOptions) {
  const extensions: Extension[] = [
    history(),
    new LanguageSupport(markdownLanguage),
    syntaxHighlighting(highlight),
    theme,
    EditorView.lineWrapping,
    EditorState.allowMultipleSelections.of(false),
    // Like maxLength on a text field: a change that would make the note too long is dropped.
    EditorState.changeFilter.of((tr) => !tr.docChanged || tr.newDoc.length <= options.maxLength),
    EditorView.contentAttributes.of({
      'aria-label': options.label,
      'aria-multiline': 'true',
      // Phone keyboards: sentences start with a capital letter, words get corrected.
      autocapitalize: 'sentences',
      autocorrect: 'on',
      spellcheck: 'true',
    }),
    placeholder(options.placeholder),
    EditorView.scrollMargins.of(() => ({ bottom: options.bottomMargin() })),
    Prec.high(
      keymap.of([
        { key: 'Enter', run: continueList },
        { key: 'Backspace', run: deleteMarkupBackward },
        { key: 'Mod-b', run: toggleBold },
        { key: 'Mod-k', run: insertLink(options.link) },
      ]),
    ),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange(update.state.doc.toString())
      options.onUpdate(update)
    }),
  ]

  return EditorState.create({ doc: options.doc, extensions })
}
