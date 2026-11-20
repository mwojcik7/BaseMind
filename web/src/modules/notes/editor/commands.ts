import {
  EditorSelection,
  type ChangeSpec,
  type EditorState,
  type Line,
  type StateCommand,
} from '@codemirror/state'
import { taskItem } from '@/lib/task-items'

/**
 * What the toolbar buttons do to the Markdown text. Each is a plain CodeMirror command on the
 * editor state, so it can be tested without a browser.
 */

type ListKind = 'bullet' | 'task' | 'ordered' | 'none'

interface LinePrefix {
  /** Spaces in front, kept as they are. */
  indent: number
  kind: ListKind
  /** Where the text after the list marker starts, counted from the line start. */
  body: number
}

const INDENT = /^\s*/
// The same lenient forms the preview reads as a box: `- [ ]`, `[ ]`, `-[x]`, `– [ ]`.
const TASK_PREFIX = /^\s*(?:[-*+–—]\s*)?\[(?:\s|x|X)?\]\s*/
const BULLET_PREFIX = /^\s*[-*+]\s+/
const ORDERED_PREFIX = /^\s*\d+[.)]\s+/
const HEADING_PREFIX = /^(#{1,6})(?:\s+|$)/

export function linePrefix(text: string): LinePrefix {
  const indent = INDENT.exec(text)![0].length
  if (taskItem(text)) {
    return { indent, kind: 'task', body: TASK_PREFIX.exec(text)![0].length }
  }
  const bullet = BULLET_PREFIX.exec(text)
  if (bullet) return { indent, kind: 'bullet', body: bullet[0].length }
  const ordered = ORDERED_PREFIX.exec(text)
  if (ordered) return { indent, kind: 'ordered', body: ordered[0].length }
  return { indent, kind: 'none', body: indent }
}

/** Every line touched by a selection, each once. Empty lines are skipped in a longer selection. */
function selectedLines(state: EditorState): Line[] {
  const lines: Line[] = []
  let last = -1
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number
    // A selection ending at the very start of a line does not take that line in.
    const end = state.doc.lineAt(range.to)
    const lastNumber = range.to > range.from && end.from === range.to ? end.number - 1 : end.number
    for (let number = Math.max(first, last + 1); number <= lastNumber; number++) {
      lines.push(state.doc.line(number))
      last = number
    }
  }
  return lines.length > 1 ? lines.filter((line) => line.text.trim() !== '') : lines
}

/**
 * Applies line-start changes. Cursors move along with the text after them, so one at the start
 * of an empty line ends up after the marker put there.
 */
function changeLines(
  state: EditorState,
  dispatch: Parameters<StateCommand>[0]['dispatch'],
  changes: ChangeSpec[],
) {
  const set = state.changes(changes)
  const selection = EditorSelection.create(
    state.selection.ranges.map((range) =>
      EditorSelection.range(set.mapPos(range.anchor, 1), set.mapPos(range.head, 1)),
    ),
    state.selection.mainIndex,
  )
  dispatch(state.update({ changes: set, selection, scrollIntoView: true, userEvent: 'input' }))
}

const MARKERS: Record<'bullet' | 'task', string> = { bullet: '- ', task: '- [ ] ' }

/**
 * Turns the lines into a list (or a list with boxes); when they all are one already, back into
 * plain text. A bullet becomes a box and the other way round.
 */
export function toggleList(kind: 'bullet' | 'task'): StateCommand {
  return ({ state, dispatch }) => {
    const lines = selectedLines(state)
    const prefixes = lines.map((line) => linePrefix(line.text))
    const remove = prefixes.every((prefix) => prefix.kind === kind)

    changeLines(
      state,
      dispatch,
      lines.map((line, index) => ({
        from: line.from + prefixes[index].indent,
        to: line.from + prefixes[index].body,
        insert: remove ? '' : MARKERS[kind],
      })),
    )
    return true
  }
}

/** Plain text → `#` → `##` → `###` → plain text again. */
export const cycleHeading: StateCommand = ({ state, dispatch }) => {
  const lines = selectedLines(state)
  changeLines(
    state,
    dispatch,
    lines.map((line) => {
      const match = HEADING_PREFIX.exec(line.text)
      const level = match ? match[1].length : 0
      const next = level >= 3 ? 0 : level + 1
      return {
        from: line.from,
        to: line.from + (match ? match[0].length : 0),
        insert: next ? `${'#'.repeat(next)} ` : '',
      }
    }),
  )
  return true
}

const BOLD = '**'

/** Wraps the selection in `**`, or takes the marks off when they are already there. */
export const toggleBold: StateCommand = ({ state, dispatch }) => {
  const doc = state.doc
  dispatch(
    state.update(
      state.changeByRange((range) => {
        const before = doc.sliceString(range.from - BOLD.length, range.from)
        const after = doc.sliceString(range.to, range.to + BOLD.length)
        if (before === BOLD && after === BOLD) {
          return {
            changes: [
              { from: range.from - BOLD.length, to: range.from },
              { from: range.to, to: range.to + BOLD.length },
            ],
            range: EditorSelection.range(range.from - BOLD.length, range.to - BOLD.length),
          }
        }

        const text = doc.sliceString(range.from, range.to)
        if (text.length >= 2 * BOLD.length && text.startsWith(BOLD) && text.endsWith(BOLD)) {
          return {
            changes: { from: range.from, to: range.to, insert: text.slice(2, -2) },
            range: EditorSelection.range(range.from, range.to - 2 * BOLD.length),
          }
        }

        return {
          changes: [
            { from: range.from, insert: BOLD },
            { from: range.to, insert: BOLD },
          ],
          range: EditorSelection.range(range.from + BOLD.length, range.to + BOLD.length),
        }
      }),
      { scrollIntoView: true, userEvent: 'input' },
    ),
  )
  return true
}

const WEB_ADDRESS = /^(https?:\/\/|www\.)\S+$/i

/**
 * `[text](address)`. The part still to fill in gets selected, so typing replaces it: the address
 * for selected text, the text for a selected web address, otherwise the text.
 */
export function insertLink(words: { text: string; address: string }): StateCommand {
  return ({ state, dispatch }) => {
    dispatch(
      state.update(
        state.changeByRange((range) => {
          const selected = state.doc.sliceString(range.from, range.to)
          const isUrl = WEB_ADDRESS.test(selected.trim())
          const text = selected && !isUrl ? selected : words.text
          const address = isUrl ? selected.trim() : words.address
          const insert = `[${text}](${address})`

          // Text, then the address, as offsets in what is inserted.
          const start = selected && !isUrl ? range.from + text.length + 3 : range.from + 1
          const length = selected && !isUrl ? address.length : text.length
          return {
            changes: { from: range.from, to: range.to, insert },
            range: EditorSelection.range(start, start + length),
          }
        }),
        { scrollIntoView: true, userEvent: 'input' },
      ),
    )
    return true
  }
}

/** `[[…]]` around the selection, or empty with the cursor inside, ready for a title. */
export const insertWikiLink: StateCommand = ({ state, dispatch }) => {
  dispatch(
    state.update(
      state.changeByRange((range) => {
        const selected = state.doc.sliceString(range.from, range.to)
        const insert = `[[${selected}]]`
        const cursor = selected ? range.from + insert.length : range.from + 2
        return {
          changes: { from: range.from, to: range.to, insert },
          range: EditorSelection.cursor(cursor),
        }
      }),
      { scrollIntoView: true, userEvent: 'input' },
    ),
  )
  return true
}
