import { indentLess, indentMore, redo, redoDepth, undo, undoDepth } from '@codemirror/commands'
import type { StateCommand } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  Bold,
  Heading,
  Link,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListTodo,
  Redo2,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { pl } from '@/i18n/pl'
import { useKeyboardHeight, useKeyboardInset } from '@/lib/use-keyboard-inset'
import { cn } from 'cn'
import {
  cycleHeading,
  insertLink,
  insertWikiLink,
  toggleBold,
  toggleList,
} from '@/modules/notes/editor/commands'
import { noteEditorState } from '@/modules/notes/editor/setup'

const TOUCH = '(pointer: coarse)'

function subscribeTouch(onChange: () => void) {
  const query = window.matchMedia?.(TOUCH)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/** A phone or tablet: the toolbar goes on top of the on-screen keyboard. */
function useTouchScreen() {
  return useSyncExternalStore(subscribeTouch, () => window.matchMedia?.(TOUCH).matches ?? false)
}

/** Height of the toolbar over the keyboard: one row of 40 px buttons and its padding. */
const TOOLBAR_HEIGHT = 49

/** Room left between the cursor and the toolbar. */
const CURSOR_GAP = 12

/**
 * Scrolls the page so the cursor stays above the toolbar over the keyboard. The phone's
 * browser scrolls it only above the keyboard itself: it doesn't know about the toolbar.
 */
function keepCursorVisible(view: EditorView, toolbarHeight: number) {
  view.requestMeasure({
    key: 'note-cursor-above-toolbar',
    read: (editor) => editor.coordsAtPos(editor.state.selection.main.head),
    write: (cursor) => {
      const viewport = window.visualViewport
      if (!cursor || !viewport) return
      const visibleBottom = viewport.offsetTop + viewport.height - toolbarHeight - CURSOR_GAP
      if (cursor.bottom > visibleBottom) window.scrollBy(0, cursor.bottom - visibleBottom)
    },
  })
}

const words = pl.notes.editor
const link = insertLink({ text: words.linkText, address: words.linkAddress })

type Tool = {
  label: string
  run: StateCommand
} & ({ icon: LucideIcon } | { text: string })

const TOOLS: Tool[] = [
  { label: words.heading, icon: Heading, run: cycleHeading },
  { label: words.bold, icon: Bold, run: toggleBold },
  { label: words.list, icon: List, run: toggleList('bullet') },
  { label: words.task, icon: ListTodo, run: toggleList('task') },
  { label: words.link, icon: Link, run: link },
  { label: words.noteLink, text: '[[', run: insertWikiLink },
  { label: words.outdent, icon: ListIndentDecrease, run: indentLess },
  { label: words.indent, icon: ListIndentIncrease, run: indentMore },
  { label: words.undo, icon: Undo2, run: undo },
  { label: words.redo, icon: Redo2, run: redo },
]

function Toolbar({
  view,
  className,
  style,
}: {
  view: EditorView
  className?: string
  style?: CSSProperties
}) {
  const canUndo = undoDepth(view.state) > 0
  const canRedo = redoDepth(view.state) > 0

  return (
    <div
      role="toolbar"
      aria-label={words.toolbar}
      className={cn('flex items-center gap-0.5 overflow-x-auto bg-background', className)}
      style={style}
    >
      {TOOLS.map((tool) => {
        const disabled = (tool.run === undo && !canUndo) || (tool.run === redo && !canRedo)
        return (
          <button
            key={tool.label}
            type="button"
            aria-label={tool.label}
            title={tool.label}
            disabled={disabled}
            // Keeps the cursor in the text, so the phone keyboard stays open.
            onPointerDown={(event) => event.preventDefault()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              tool.run(view)
              view.focus()
            }}
            // On a narrow phone the buttons shrink a little, so all of them fit in one row.
            className="flex h-10 max-w-10 min-w-8 flex-1 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            {'icon' in tool ? (
              <tool.icon aria-hidden className="size-5" />
            ) : (
              <span aria-hidden className="font-mono text-sm font-semibold">
                {tool.text}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export interface NoteCodeEditorProps {
  /** The text the editor starts with; later changes come from typing in it. */
  initial: string
  onChange: (text: string) => void
  autoFocus?: boolean
  maxLength: number
}

/**
 * The note text in CodeMirror, with a formatting toolbar: on a phone right above the
 * keyboard while writing, on a computer at the top of the note.
 */
export default function NoteCodeEditor({
  initial,
  onChange,
  autoFocus,
  maxLength,
}: NoteCodeEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<EditorView | null>(null)
  // Bumped on every editor update, so the toolbar shows the current undo state.
  const [, setVersion] = useState(0)
  const [focused, setFocused] = useState(false)

  const touch = useTouchScreen()
  const keyboardInset = useKeyboardInset()
  const keyboardHeight = useKeyboardHeight()
  const overKeyboard = touch && focused && keyboardHeight > 0

  const changed = useRef(onChange)
  const bottomMargin = useRef(0)
  useEffect(() => {
    changed.current = onChange
    bottomMargin.current = overKeyboard ? TOOLBAR_HEIGHT : 0
  })

  // The keyboard just opened (or changed height): the cursor may now be under the toolbar.
  useEffect(() => {
    if (view && overKeyboard) keepCursorVisible(view, TOOLBAR_HEIGHT)
  }, [view, overKeyboard, keyboardHeight])

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: noteEditorState({
        doc: initial,
        label: pl.notes.content,
        placeholder: pl.notes.contentPlaceholder,
        maxLength,
        link: { text: words.linkText, address: words.linkAddress },
        bottomMargin: () => bottomMargin.current,
        onChange: (text) => changed.current(text),
        onUpdate: (update) => {
          setVersion((version) => version + 1)
          setFocused(editor.hasFocus)
          if ((update.docChanged || update.selectionSet) && bottomMargin.current > 0) {
            keepCursorVisible(editor, bottomMargin.current)
          }
        },
      }),
    })
    setView(editor)
    if (autoFocus) editor.focus()

    return () => editor.destroy()
    // The editor is made once: the text it starts with and its settings don't change later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {view && !touch && (
        <Toolbar
          view={view}
          className="sticky top-[var(--app-bar,0px)] z-10 -mx-2 mt-2 border-b border-border px-1 py-1"
        />
      )}
      <div
        ref={host}
        className="mt-4 text-base"
        // The keyboard covers the bottom of the page: without this room below the text, its
        // last lines could not be scrolled up above the keyboard and the toolbar.
        style={
          overKeyboard ? { paddingBottom: keyboardHeight + TOOLBAR_HEIGHT + CURSOR_GAP } : undefined
        }
      />
      {view && overKeyboard && (
        <Toolbar
          view={view}
          className="fixed inset-x-0 z-40 border-t border-border px-1 py-1 pl-[max(0.25rem,env(safe-area-inset-left))]"
          style={{ bottom: keyboardInset }}
        />
      )}
    </>
  )
}
