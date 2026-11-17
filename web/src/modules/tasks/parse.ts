import {
  dateRules,
  repeatRules,
  timeAfterO,
  timeAndReminderRules,
  type DateFields,
} from '@/lib/date-rules'
import type { ParserRule } from '@/lib/quick-parser'
import type { TaskList } from '@/modules/tasks/repo'

/** `date` and `time` are the task's due date and time. */
export interface ParsedTaskFields extends DateFields {
  priority: number
  list_id: string
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const priorityRule: ParserRule<ParsedTaskFields> = {
  pattern: /(?<!\S)!([1-4])(?!\S)/,
  apply: (match) => ({ priority: Number(match[1]) }),
}

/**
 * The quick-add rules. Lists are matched by name after "#", longest name first, so
 * "#Dom i ogród" wins over "#Dom"; an unknown name stays in the title.
 */
export function taskRules(
  lists: readonly Pick<TaskList, 'id' | 'name'>[] = [],
): ParserRule<ParsedTaskFields>[] {
  const byLength = [...lists].sort((a, b) => b.name.length - a.name.length)
  const listRule: ParserRule<ParsedTaskFields>[] =
    byLength.length === 0
      ? []
      : [
          {
            pattern: new RegExp(
              `(?<!\\S)#(${byLength.map((list) => escape(list.name)).join('|')})(?![\\p{L}\\p{N}])`,
              'iu',
            ),
            apply: (match) => {
              const name = match[1].toLocaleLowerCase('pl')
              const list = byLength.find(
                (candidate) => candidate.name.toLocaleLowerCase('pl') === name,
              )
              return list ? { list_id: list.id } : {}
            },
          },
        ]

  return [
    ...listRule,
    ...repeatRules,
    timeAfterO,
    ...dateRules,
    ...timeAndReminderRules,
    priorityRule,
  ]
}
