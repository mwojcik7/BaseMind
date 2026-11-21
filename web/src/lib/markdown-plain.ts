// Also loaded in the search worker: no React, no DOM.
import { taskItem } from '@/lib/task-items'

const RULE = /^\s*[-*_]{3,}\s*$/

/** One line of Markdown as plain text: no heading marks, emphasis, list markers or link targets. */
export function plainLine(line: string): string {
  const box = taskItem(line)
  return (
    (box ? box.text : line)
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*>\s?/, '')
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, '')
      // [[Note]] and [text](url) leave their text; images their description.
      .replace(/!?\[\[([^\]]+)\]\]/g, '$1')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__|~~|`)/g, '')
      .replace(/(^|\W)[*_](\S(?:.*?\S)?)[*_](?=\W|$)/g, '$1$2')
      .trim()
  )
}

/** Lines worth showing: an empty box counts, an empty line or a rule doesn't. */
export function contentLines(content: string | null): string[] {
  return (content ?? '')
    .split('\n')
    .filter((line) => !RULE.test(line) && (taskItem(line) !== null || plainLine(line) !== ''))
}

/** Markdown as one plain line of text, e.g. for a search result. */
export function markdownToPlain(content: string | null): string {
  return contentLines(content).map(plainLine).filter(Boolean).join(' ')
}

/** What a note is called in lists: its title, or else its first line; '' for an empty note. */
export function noteTitleText(note: { title: string | null; content: string | null }): string {
  const first = contentLines(note.content)[0]
  return note.title?.trim() || (first ? plainLine(first) : '')
}

/** The text under the note's title as plain text: without the first line when that is the title. */
export function noteBodyText(note: { title: string | null; content: string | null }): string {
  const lines = contentLines(note.content)
  return (note.title?.trim() ? lines : lines.slice(1)).map(plainLine).filter(Boolean).join(' ')
}
