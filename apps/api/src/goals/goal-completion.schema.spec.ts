import { describe, expect, it } from 'vitest'
import {
  confirmGoalCompletionSchema,
  goalCompletionPreviewSchema,
  goalCompletionRequestSchema,
} from './goal-completion.schema'

const validPreview = {
  goalId: '11111111-1111-4111-8111-111111111111',
  withdrawals: [
    {
      placeId: '22222222-2222-4222-8222-222222222222',
      amount: '750000.00',
    },
  ],
  allocations: [
    {
      goalId: '33333333-3333-4333-8333-333333333333',
      percentage: '100.00',
    },
  ],
}

describe('goal completion schemas', () => {
  it('accepts a valid request and preview', () => {
    expect(
      goalCompletionRequestSchema.safeParse({ goalId: validPreview.goalId }).success,
    ).toBe(true)
    expect(goalCompletionPreviewSchema.parse(validPreview)).toEqual(validPreview)
  })

  it.each([
    '0',
    '-1',
    '1.001',
    'not-a-number',
    '0x10',
    '1e3',
    'Infinity',
    'NaN',
  ])('rejects invalid withdrawal amount %s', (amount) => {
    expect(
      goalCompletionPreviewSchema.safeParse({
        ...validPreview,
        withdrawals: [{ ...validPreview.withdrawals[0], amount }],
      }).success,
    ).toBe(false)
  })

  it('rejects malformed ids and duplicate places', () => {
    expect(
      goalCompletionPreviewSchema.safeParse({
        ...validPreview,
        goalId: 'not-a-uuid',
      }).success,
    ).toBe(false)
    expect(
      goalCompletionPreviewSchema.safeParse({
        ...validPreview,
        withdrawals: [validPreview.withdrawals[0], validPreview.withdrawals[0]],
      }).success,
    ).toBe(false)
  })

  it('requires a nonempty withdrawal list and preserves the duplicate refinement on confirm', () => {
    expect(
      goalCompletionPreviewSchema.safeParse({ ...validPreview, withdrawals: [] }).success,
    ).toBe(false)
    expect(
      confirmGoalCompletionSchema.safeParse({
        ...validPreview,
        withdrawals: [validPreview.withdrawals[0], validPreview.withdrawals[0]],
        previewToken: 'a'.repeat(64),
      }).success,
    ).toBe(false)
  })

  it('accepts only a 64-character lowercase hexadecimal preview token', () => {
    expect(
      confirmGoalCompletionSchema.safeParse({
        ...validPreview,
        previewToken: 'a'.repeat(64),
      }).success,
    ).toBe(true)
    expect(
      confirmGoalCompletionSchema.safeParse({
        ...validPreview,
        previewToken: 'A'.repeat(64),
      }).success,
    ).toBe(false)
    expect(
      confirmGoalCompletionSchema.safeParse({
        ...validPreview,
        previewToken: 'a'.repeat(63),
      }).success,
    ).toBe(false)
  })
})
