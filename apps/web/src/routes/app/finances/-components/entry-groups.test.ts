import { describe, expect, it } from 'vitest'
import { chartColor } from '../../../../components/norte/CategoryDonut'
import { categoryName, entryLabel, formatShare, groupByCategory, groupByDay, type GroupableEntry } from './entry-groups'

const entry = (over: Partial<GroupableEntry>): GroupableEntry => ({
  id: 'x', sourceKind: 'custom', sourceId: null, sourceName: 'X', concept: null, amount: '0.00',
  currency: 'ARS', recurring: false, effectiveMonth: '2026-08-01', createdAt: '2026-08-05T12:00:00.000Z', arsEquivalent: null, ...over,
})

const food1 = entry({ id: 'b', sourceId: 'food', sourceName: 'Comida', amount: '50.00', recurring: true, effectiveMonth: '2026-06-01' })
const food2 = entry({ id: 'a', sourceId: 'food', sourceName: 'Comida', amount: '100.00' })
const flight = entry({ id: 'c', sourceId: 'flight', sourceName: 'Vuelo', amount: '10.00', currency: 'USD', arsEquivalent: '300.00', concept: 'Pasaje' })
const housing = entry({ id: 'd', sourceKind: 'housing', sourceName: 'housing', amount: '150.00' })
const labels = { housing: 'Alquiler / vivienda' }

describe('groupByCategory', () => {
  it('sums ARS equivalents per category, largest first, ties by label', () => {
    const groups = groupByCategory([food1, food2, flight, housing], labels)
    expect(groups.map((g) => [g.label, g.total.amount, g.share, g.rank])).toEqual([
      ['Vuelo', '300.00', 0.5, 0],
      ['Alquiler / vivienda', '150.00', 0.25, 1],
      ['Comida', '150.00', 0.25, 2],
    ])
  })

  it('lists entries newest first inside a category', () => {
    const comida = groupByCategory([food1, food2]).find((g) => g.label === 'Comida')
    expect(comida?.entries.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('is empty without entries', () => {
    expect(groupByCategory([])).toEqual([])
  })
})

describe('groupByDay', () => {
  it('groups by computed day, newest first', () => {
    const days = groupByDay([{ id: 'a', d: '2026-10-05' }, { id: 'b', d: '2026-10-21' }, { id: 'c', d: '2026-10-05' }], (x) => x.d)
    expect(days.map((g) => [g.day, g.entries.map((e) => e.id)])).toEqual([['2026-10-21', ['b']], ['2026-10-05', ['a', 'c']]])
  })
})

describe('labels and shares', () => {
  it('resolves the category name from fixed labels or custom name', () => {
    expect(categoryName(housing, labels)).toBe('Alquiler / vivienda')
    expect(categoryName(food2, labels)).toBe('Comida')
  })

  it('prefers the concept, then the fixed label, then the custom name', () => {
    expect(entryLabel(flight, labels)).toBe('Pasaje')
    expect(entryLabel(housing, labels)).toBe('Alquiler / vivienda')
    expect(entryLabel(food2, labels)).toBe('Comida')
  })

  it('rounds shares and never shows 0% for a real amount', () => {
    expect([0.6, 0.004, 0.996].map(formatShare)).toEqual(['60%', '<1%', '100%'])
  })

  it('reuses the last chart step beyond nine categories', () => {
    expect(chartColor('expense', 0)).toBe('var(--chart-expense-1)')
    expect(chartColor('expense', 12)).toBe('var(--chart-expense-9)')
  })
})
