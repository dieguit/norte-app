import { describe, expect, it } from 'vitest'
import {
  allocationChangeDraftSchema,
  confirmAllocationChangeSchema,
} from './allocation-change.schema'

describe('allocation change schemas', () => {
  it('accepts active allocations totaling exactly 100% with valid dedication percentage', () => {
    expect(allocationChangeDraftSchema.parse({
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '60.00' },
        { goalId: 'goal-2', percentage: '40,00' },
      ],
    })).toEqual({
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '60.00' },
        { goalId: 'goal-2', percentage: '40,00' },
      ],
    })
  })

  it('validates dedicationPercentage as an integer between 0 and 100', () => {
    const base = {
      dedicationPercentage: 90,
      allocations: [{ goalId: 'goal-1', percentage: '100.00' }],
    }

    expect(allocationChangeDraftSchema.safeParse({ ...base, dedicationPercentage: 0 }).success).toBe(true)
    expect(allocationChangeDraftSchema.safeParse({ ...base, dedicationPercentage: 90 }).success).toBe(true)
    expect(allocationChangeDraftSchema.safeParse({ ...base, dedicationPercentage: 100 }).success).toBe(true)
    expect(allocationChangeDraftSchema.safeParse({ ...base, dedicationPercentage: -1 }).success).toBe(false)
    expect(allocationChangeDraftSchema.safeParse({ ...base, dedicationPercentage: 101 }).success).toBe(false)
    expect(allocationChangeDraftSchema.safeParse({ ...base, dedicationPercentage: 90.5 }).success).toBe(false)
    expect(allocationChangeDraftSchema.safeParse({ allocations: [{ goalId: 'goal-1', percentage: '100.00' }] }).success).toBe(false)
  })

  it('rejects totals other than 100%', () => {
    expect(() => allocationChangeDraftSchema.parse({
      dedicationPercentage: 90,
      allocations: [{ goalId: 'goal-1', percentage: '99.99' }],
    })).toThrow('La distribución debe sumar 100%')
  })

  it('requires a SHA-256 preview token to confirm', () => {
    expect(() => confirmAllocationChangeSchema.parse({
      draft: {
        dedicationPercentage: 90,
        allocations: [{ goalId: 'goal-1', percentage: '100.00' }],
      },
      previewToken: 'stale',
    })).toThrow()
  })
})
