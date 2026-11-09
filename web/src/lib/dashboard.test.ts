import { describe, expect, it } from 'vitest'
import { arrangeWidgets, toDashboardLayout } from '@/lib/dashboard'

const WIDGETS = [
  { id: 'a', defaultVisible: true },
  { id: 'b', defaultVisible: true },
  { id: 'c', defaultVisible: false },
]

const summary = (layout: Parameters<typeof arrangeWidgets>[1]) =>
  arrangeWidgets(WIDGETS, layout).map(({ id, visible }) => [id, visible])

describe('arrangeWidgets', () => {
  it('uses the registry and default visibility without a saved layout', () => {
    expect(summary(null)).toEqual([
      ['a', true],
      ['b', true],
      ['c', false],
    ])
  })

  it('applies the saved order and visibility', () => {
    expect(summary({ order: ['c', 'b', 'a'], hidden: ['b'] })).toEqual([
      ['c', true],
      ['b', false],
      ['a', true],
    ])
  })

  it('puts widgets missing from the layout last, with their default visibility', () => {
    expect(summary({ order: ['b'], hidden: [] })).toEqual([
      ['b', true],
      ['a', true],
      ['c', false],
    ])
  })

  it('ignores widgets this version of the app does not have', () => {
    expect(summary({ order: ['future', 'b', 'a', 'c'], hidden: ['future'] })).toEqual([
      ['b', true],
      ['a', true],
      ['c', true],
    ])
  })
})

describe('toDashboardLayout', () => {
  it('keeps the order and lists the hidden widgets', () => {
    expect(
      toDashboardLayout([
        { id: 'b', visible: false },
        { id: 'a', visible: true },
      ]),
    ).toEqual({ order: ['b', 'a'], hidden: ['b'] })
  })

  it('round-trips through arrangeWidgets', () => {
    const arranged = arrangeWidgets(WIDGETS, { order: ['c', 'a', 'b'], hidden: ['a'] })

    expect(toDashboardLayout(arranged)).toEqual({ order: ['c', 'a', 'b'], hidden: ['a'] })
  })
})
