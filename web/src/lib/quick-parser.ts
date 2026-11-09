export interface ParserContext {
  now: Date
}

/** One thing recognised in quick-add text. Modules define their own rules. */
export interface ParserRule<Fields> {
  pattern: RegExp
  apply: (match: RegExpExecArray, context: ParserContext) => Partial<Fields>
}

export interface ParseResult<Fields> {
  /** What is left once everything recognised has been taken out. */
  text: string
  fields: Partial<Fields>
}

/** Matches whole words only; JavaScript's \b doesn't understand Polish letters. */
export function wordPattern(source: string) {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu')
}

/**
 * Applies each rule once, in order. A rule whose fields are already set is skipped, so
 * in "jutro kupić dziś" the later word stays in the text instead of silently vanishing.
 */
export function parseQuickText<Fields>(
  input: string,
  rules: readonly ParserRule<Fields>[],
  context: ParserContext,
): ParseResult<Fields> {
  let text = input
  let fields: Partial<Fields> = {}

  for (const rule of rules) {
    const match = rule.pattern.exec(text)
    if (!match) {
      continue
    }

    const found = rule.apply(match, context)
    if (Object.keys(found).some((field) => field in fields)) {
      continue
    }

    fields = { ...fields, ...found }
    text = text.slice(0, match.index) + text.slice(match.index + match[0].length)
  }

  return { text: text.replace(/\s+/g, ' ').trim(), fields }
}
