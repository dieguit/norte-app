import { describe, expect, it } from 'vitest'
import { createIncomeSchema } from './incomes.schema'

describe('income payloads', () => {
  const validDraft = {
    source: { kind: 'salary' },
    amount: '100000',
    currency: 'ARS',
    recurring: true,
    effectiveMonth: '2026-09',
  }

  it('accepts a fixed source and a new custom source', () => {
    expect(createIncomeSchema.parse({ draft: validDraft }).draft.source).toEqual({ kind: 'salary' })
    expect(
      createIncomeSchema.parse({
        draft: { ...validDraft, source: { kind: 'custom', name: 'Freelance' } },
      }).draft.source,
    ).toEqual({ kind: 'custom', name: 'Freelance' })
  })

  it('rejects a non-positive amount and invalid calendar month', () => {
    expect(() => createIncomeSchema.parse({ draft: { ...validDraft, amount: '0' } })).toThrow()
    expect(() =>
      createIncomeSchema.parse({ draft: { ...validDraft, effectiveMonth: '2026-13' } }),
    ).toThrow()
  })
})
