import { describe, expect, it } from 'vitest'
import {
  allocationChangeDraftSchema,
  confirmAllocationChangeSchema,
} from './allocation-change.schema'

describe('allocation change schemas', () => {
  it('accepts active allocations totaling exactly 100%', () => {
    expect(allocationChangeDraftSchema.parse({
      allocations: [
        { goalId: 'goal-1', percentage: '60.00' },
        { goalId: 'goal-2', percentage: '40,00' },
      ],
    })).toEqual({
      allocations: [
        { goalId: 'goal-1', percentage: '60.00' },
        { goalId: 'goal-2', percentage: '40,00' },
      ],
    })
  })

  it('rejects totals other than 100%', () => {
    expect(() => allocationChangeDraftSchema.parse({
      allocations: [{ goalId: 'goal-1', percentage: '99.99' }],
    })).toThrow('La distribución debe sumar 100%')
  })

  it('requires a SHA-256 preview token to confirm', () => {
    expect(() => confirmAllocationChangeSchema.parse({
      draft: { allocations: [{ goalId: 'goal-1', percentage: '100.00' }] },
      previewToken: 'stale',
    })).toThrow()
  })
})
