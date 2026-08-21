import { describe, expect, it } from 'vitest'
import {
  confirmGoalLifecycleSchema,
  goalLifecyclePreviewSchema,
  goalLifecycleRequestSchema,
} from './goal-lifecycle.schema'

describe('goal lifecycle schemas', () => {
  const validGoalId = '11111111-1111-4111-8111-111111111111'
  const validToken = 'a'.repeat(64)

  it('validates goalLifecycleRequestSchema for pause and resume', () => {
    expect(goalLifecycleRequestSchema.parse({
      goalId: validGoalId,
      lifecycle: 'pause',
    })).toEqual({
      goalId: validGoalId,
      lifecycle: 'pause',
    })

    expect(goalLifecycleRequestSchema.parse({
      goalId: validGoalId,
      lifecycle: 'resume',
    })).toEqual({
      goalId: validGoalId,
      lifecycle: 'resume',
    })

    expect(() => goalLifecycleRequestSchema.parse({
      goalId: 'invalid-id',
      lifecycle: 'pause',
    })).toThrow()

    expect(() => goalLifecycleRequestSchema.parse({
      goalId: validGoalId,
      lifecycle: 'delete',
    })).toThrow()
  })

  it('validates goalLifecyclePreviewSchema with optional allocations', () => {
    expect(goalLifecyclePreviewSchema.parse({
      goalId: validGoalId,
      lifecycle: 'pause',
    })).toEqual({
      goalId: validGoalId,
      lifecycle: 'pause',
    })

    expect(goalLifecyclePreviewSchema.parse({
      goalId: validGoalId,
      lifecycle: 'resume',
      allocations: [
        { goalId: validGoalId, percentage: '20.00' },
        { goalId: '22222222-2222-4222-8222-222222222222', percentage: '80.00' },
      ],
    })).toEqual({
      goalId: validGoalId,
      lifecycle: 'resume',
      allocations: [
        { goalId: validGoalId, percentage: '20.00' },
        { goalId: '22222222-2222-4222-8222-222222222222', percentage: '80.00' },
      ],
    })
  })

  it('requires a 64-character SHA-256 preview token and allocations to confirm', () => {
    expect(confirmGoalLifecycleSchema.parse({
      goalId: validGoalId,
      lifecycle: 'pause',
      allocations: [],
      previewToken: validToken,
    })).toEqual({
      goalId: validGoalId,
      lifecycle: 'pause',
      allocations: [],
      previewToken: validToken,
    })

    expect(() => confirmGoalLifecycleSchema.parse({
      goalId: validGoalId,
      lifecycle: 'pause',
      allocations: [],
      previewToken: 'short-token',
    })).toThrow()
  })
})
