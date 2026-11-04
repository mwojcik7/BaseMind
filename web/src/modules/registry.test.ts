import { describe, expect, it } from 'vitest'
import { pl } from '@/i18n/pl'
import { getModule, gridModules, modules } from '@/modules/registry'

describe('module registry', () => {
  it('has exactly one entry for every translated module', () => {
    expect(modules.map((module) => module.id).sort()).toEqual(Object.keys(pl.modules).sort())
  })

  it('keeps modules that have their own tab out of the grid', () => {
    const ids = gridModules.map((module) => module.id)

    expect(ids).not.toContain('tasks')
    expect(ids).not.toContain('calendar')
    expect(ids).toHaveLength(modules.length - 2)
  })

  it('returns undefined for an unknown module', () => {
    expect(getModule('finance')?.stage).toBe(3)
    expect(getModule('nope')).toBeUndefined()
  })
})
