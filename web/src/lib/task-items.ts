/**
 * Boxes to tick in Markdown, read leniently: besides `- [ ] text` also what phone keyboards
 * and quick typing give: `[ ] text`, `[] text`, `-[ ] text`, `– [ ] text`, a non-breaking
 * space or no text. The preview, note cards and filters all read them through here, so
 * they always agree.
 */

export interface TaskItem {
  indent: string
  checked: boolean
  text: string
}

// Per line, so `\s` is any space, the non-breaking one included. A list marker (also an en
// or em dash) is optional; the brackets may be empty. Not a link: `[x](address)` keeps its
// meaning.
const TASK_ITEM = /^(\s*)(?:[-*+–—]\s*)?\[(\s|x|X)?\](?!\()(?:\s+(.*)|$)/
const MARK = /\[(?:\s|x|X)?\]/
const FENCE = /^\s*(```|~~~)/
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b)

export function taskItem(line: string): TaskItem | null {
  const match = TASK_ITEM.exec(line)
  if (!match) return null
  return {
    indent: match[1].replace(/\s/g, ' '),
    checked: match[2] === 'x' || match[2] === 'X',
    text: (match[3] ?? '').replace(/\s/g, ' ').trim(),
  }
}

/** The 0-based indexes of lines holding a box, outside code blocks. */
export function taskLines(text: string): number[] {
  const indexes: number[] = []
  let inCode = false
  text.split('\n').forEach((line, index) => {
    if (FENCE.test(line)) {
      inCode = !inCode
    } else if (!inCode && taskItem(line)) {
      indexes.push(index)
    }
  })
  return indexes
}

function standard({ indent, checked, text }: TaskItem): string {
  // Without text, GitHub Markdown would not show a box; an invisible character keeps it.
  return `${indent}- [${checked ? 'x' : ' '}] ${text || ZERO_WIDTH_SPACE}`
}

/**
 * The text with every box written the standard way, for the Markdown parser. Each line stays
 * a line, so line numbers still point at the text as typed.
 */
export function normalizeTaskItems(text: string): string {
  const lines = text.split('\n')
  for (const index of taskLines(text)) {
    const item = taskItem(lines[index])
    if (item) lines[index] = standard(item)
  }
  return lines.join('\n')
}

/** Ticks or unticks the box on the given line (1-based, as the parser counts). */
export function toggleTaskLine(text: string, line: number): string {
  const lines = text.split('\n')
  const index = line - 1
  const item = taskLines(text).includes(index) ? taskItem(lines[index]) : null
  if (!item) return text

  // Only the mark changes; the rest stays as it was typed.
  lines[index] = lines[index].replace(MARK, item.checked ? '[ ]' : '[x]')
  return lines.join('\n')
}

/** Is there a box still to tick? */
export function hasOpenTaskItems(text: string | null): boolean {
  if (!text) return false
  const lines = text.split('\n')
  return taskLines(text).some((index) => taskItem(lines[index])?.checked === false)
}
