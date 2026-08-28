import { describe, expect, it } from 'vitest'
import { createIncomeSchema } from './incomes.schema'

describe('income payloads', () => {
  const validDraft = {
    concept: 'Sueldo',
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

  it('uses category terminology for blank custom source names', () => {
    for (const name of ['', '   ']) {
      expect(() =>
        createIncomeSchema.parse({
          draft: { ...validDraft, source: { kind: 'custom', name } },
        }),
      ).toThrow('Ingresá una categoría.')
    }
  })

  it('rejects a non-positive amount and invalid calendar month', () => {
    expect(() => createIncomeSchema.parse({ draft: { ...validDraft, amount: '0' } })).toThrow()
    expect(() =>
      createIncomeSchema.parse({ draft: { ...validDraft, effectiveMonth: '2026-13' } }),
    ).toThrow()
  })

  it('trims the concept', () => {
    expect(
      createIncomeSchema.parse({ draft: { ...validDraft, concept: '  Sueldo  ' } }).draft.concept,
    ).toBe('Sueldo')
  })

  it('rejects missing, empty, whitespace-only, and overly long concepts', () => {
    const draftWithoutConcept = Object.fromEntries(
      Object.entries(validDraft).filter(([key]) => key !== 'concept'),
    )

    expect(() => createIncomeSchema.parse({ draft: draftWithoutConcept })).toThrow()
    for (const concept of ['', '   ']) {
      expect(() => createIncomeSchema.parse({ draft: { ...validDraft, concept } })).toThrow('Ingresá un concepto.')
    }
    const maxConcept = createIncomeSchema.parse({ draft: { ...validDraft, concept: 'a'.repeat(120) } }).draft.concept
    expect(maxConcept).toHaveLength(120)
    expect(() => createIncomeSchema.parse({ draft: { ...validDraft, concept: 'a'.repeat(121) } })).toThrow()
  })
})
