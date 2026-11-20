import { markdownLanguage } from '@codemirror/lang-markdown'
import { LanguageSupport } from '@codemirror/language'
import { EditorSelection, EditorState, type StateCommand } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  cycleHeading,
  insertLink,
  insertWikiLink,
  linePrefix,
  toggleBold,
  toggleList,
} from '@/modules/notes/editor/commands'
import { continueList } from '@/modules/notes/editor/setup'

/**
 * Runs a command on text where `|` marks the cursor, or two of them a selection; returns the
 * text with the cursor or selection marked the same way.
 */
function run(command: StateCommand, marked: string): string {
  const first = marked.indexOf('|')
  const second = marked.indexOf('|', first + 1)
  const doc = marked.replaceAll('|', '')
  const selection =
    second === -1 ? EditorSelection.single(first) : EditorSelection.single(first, second - 1)
  let state = EditorState.create({
    doc,
    selection,
    extensions: new LanguageSupport(markdownLanguage),
  })
  command({ state, dispatch: (tr) => (state = tr.state) })

  const { from, to } = state.selection.main
  const text = state.doc.toString()
  return from === to
    ? `${text.slice(0, from)}|${text.slice(from)}`
    : `${text.slice(0, from)}|${text.slice(from, to)}|${text.slice(to)}`
}

const link = insertLink({ text: 'tekst', address: 'adres' })

describe('linePrefix', () => {
  it.each([
    ['- [ ] kup mleko', 'task', 6],
    ['[ ] kup mleko', 'task', 4],
    ['  - [x] zrobione', 'task', 8],
    ['- kup mleko', 'bullet', 2],
    ['1. pierwszy', 'ordered', 3],
    ['  zwykły tekst', 'none', 2],
    ['[x](adres)', 'none', 0],
  ])('%s', (text, kind, body) => {
    expect(linePrefix(text)).toMatchObject({ kind, body })
  })
})

describe('toggleList', () => {
  it('puts a box in front of the line, keeping the cursor in the text', () => {
    expect(run(toggleList('task'), 'kup| mleko')).toBe('- [ ] kup| mleko')
    expect(run(toggleList('task'), '|')).toBe('- [ ] |')
  })

  it('writes boxes the standard way, also over a bullet or a lenient box', () => {
    expect(run(toggleList('task'), '- kup| mleko')).toBe('- [ ] kup| mleko')
    expect(run(toggleList('task'), '  1. kup| mleko')).toBe('  - [ ] kup| mleko')
  })

  it('takes the box off when it is there, ticked or not', () => {
    expect(run(toggleList('task'), '- [x] kup| mleko')).toBe('kup| mleko')
    expect(run(toggleList('task'), '[ ] kup| mleko')).toBe('kup| mleko')
  })

  it('switches a box into a bullet and back to plain text', () => {
    expect(run(toggleList('bullet'), '- [ ] kup| mleko')).toBe('- kup| mleko')
    expect(run(toggleList('bullet'), '- kup| mleko')).toBe('kup| mleko')
  })

  it('works on every selected line, skipping empty ones', () => {
    expect(run(toggleList('task'), '|mleko\n\nchleb|')).toBe('- [ ] |mleko\n\n- [ ] chleb|')
  })

  it('adds the marker to all lines when only some have it', () => {
    expect(run(toggleList('bullet'), '|- mleko\nchleb|')).toBe('|- mleko\n- chleb|')
  })

  it('leaves out a line the selection only touches at its start', () => {
    expect(run(toggleList('bullet'), '|mleko\n|chleb')).toBe('- |mleko\n|chleb')
  })
})

describe('cycleHeading', () => {
  it('goes through three levels and back to plain text', () => {
    expect(run(cycleHeading, 'Zaku|py')).toBe('# Zaku|py')
    expect(run(cycleHeading, '# Zaku|py')).toBe('## Zaku|py')
    expect(run(cycleHeading, '## Zaku|py')).toBe('### Zaku|py')
    expect(run(cycleHeading, '### Zaku|py')).toBe('Zaku|py')
  })

  it('makes an empty line ready for a heading', () => {
    expect(run(cycleHeading, '|')).toBe('# |')
  })
})

describe('toggleBold', () => {
  it('wraps the selection and keeps it selected', () => {
    expect(run(toggleBold, 'kup |mleko| dziś')).toBe('kup **|mleko|** dziś')
  })

  it('takes the marks off around or inside the selection', () => {
    expect(run(toggleBold, 'kup **|mleko|** dziś')).toBe('kup |mleko| dziś')
    expect(run(toggleBold, 'kup |**mleko**| dziś')).toBe('kup |mleko| dziś')
  })

  it('without a selection leaves the cursor between the marks, and a second press undoes it', () => {
    expect(run(toggleBold, 'kup |')).toBe('kup **|**')
    expect(run(toggleBold, 'kup **|**')).toBe('kup |')
  })
})

describe('insertLink', () => {
  it('turns selected text into a link with the address selected', () => {
    expect(run(link, 'zobacz |przepis| tutaj')).toBe('zobacz [przepis](|adres|) tutaj')
  })

  it('puts a selected web address in place and selects the text', () => {
    expect(run(link, '|https://example.com|')).toBe('[|tekst|](https://example.com)')
  })

  it('without a selection selects the text to type', () => {
    expect(run(link, 'zobacz |')).toBe('zobacz [|tekst|](adres)')
  })
})

describe('insertWikiLink', () => {
  it('leaves the cursor inside empty brackets', () => {
    expect(run(insertWikiLink, 'zobacz |')).toBe('zobacz [[|]]')
  })

  it('wraps the selection and puts the cursor after it', () => {
    expect(run(insertWikiLink, 'zobacz |Prezenty|')).toBe('zobacz [[Prezenty]]|')
  })
})

describe('Enter in a list', () => {
  it('continues a list of boxes with an empty box, and ends it on an empty one', () => {
    expect(run(continueList, '- [x] mleko|')).toBe('- [x] mleko\n- [ ] |')
    expect(run(continueList, '- [ ] mleko\n- [ ] |')).toBe('- [ ] mleko\n|')
  })
})
