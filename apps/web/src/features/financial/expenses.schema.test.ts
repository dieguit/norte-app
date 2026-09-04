import { describe, expect, it } from 'vitest'
import {
  createExpenseSchema,
  deleteExpenseSchema,
  updateExpenseSchema,
} from './expenses.schema'

describe('expense payloads', () => {
  const validDraft = {
    concept: 'Alquiler',
    source: { kind: 'housing' as const },
    amount: '100000',
    currency: 'ARS' as const,
    recurring: true,
  }

  const validUuid = '123e4567-e89b-12d3-a456-426614174000'

  describe('createExpenseSchema', () => {
    it('accepts a fixed source and a new custom source', () => {
      const parsedFixed = createExpenseSchema.parse({
        draft: validDraft,
        effectiveMonth: '2026-09',
      })
      expect(parsedFixed.draft.source).toEqual({ kind: 'housing' })
      expect(parsedFixed.effectiveMonth).toBe('2026-09')

      const parsedCustom = createExpenseSchema.parse({
        draft: { ...validDraft, source: { kind: 'custom', name: 'Gimnasio' } },
        effectiveMonth: '2026-09',
      })
      expect(parsedCustom.draft.source).toEqual({ kind: 'custom', name: 'Gimnasio' })

      const parsedCustomId = createExpenseSchema.parse({
        draft: { ...validDraft, source: { kind: 'custom', sourceId: validUuid } },
        effectiveMonth: '2026-09',
      })
      expect(parsedCustomId.draft.source).toEqual({ kind: 'custom', sourceId: validUuid })
    })

    it('rejects a non-positive amount and invalid calendar month', () => {
      expect(() =>
        createExpenseSchema.parse({
          draft: { ...validDraft, amount: '0' },
          effectiveMonth: '2026-09',
        }),
      ).toThrow()
      expect(() =>
        createExpenseSchema.parse({
          draft: { ...validDraft, amount: '-100' },
          effectiveMonth: '2026-09',
        }),
      ).toThrow()
      expect(() =>
        createExpenseSchema.parse({
          draft: validDraft,
          effectiveMonth: '2026-13',
        }),
      ).toThrow()
      expect(() =>
        createExpenseSchema.parse({
          draft: validDraft,
          effectiveMonth: 'invalid',
        }),
      ).toThrow()
    })

    it('rejects custom source without a name or with blank name', () => {
      expect(() =>
        createExpenseSchema.parse({
          draft: { ...validDraft, source: { kind: 'custom', name: '' } },
          effectiveMonth: '2026-09',
        }),
      ).toThrow('Ingresá una categoría.')
      expect(() =>
        createExpenseSchema.parse({
          draft: { ...validDraft, source: { kind: 'custom', name: '   ' } },
          effectiveMonth: '2026-09',
        }),
      ).toThrow('Ingresá una categoría.')
    })

    it('trims the concept', () => {
      expect(
        createExpenseSchema.parse({
          draft: { ...validDraft, concept: '  Alquiler  ' },
          effectiveMonth: '2026-09',
        }).draft.concept,
      ).toBe('Alquiler')
    })

    it('normalizes absent and blank concepts to null while preserving valid concepts', () => {
      const draftWithoutConcept = Object.fromEntries(
        Object.entries(validDraft).filter(([key]) => key !== 'concept'),
      )

      expect(
        createExpenseSchema.parse({ draft: draftWithoutConcept, effectiveMonth: '2026-09' }).draft
          .concept,
      ).toBeNull()
      expect(
        createExpenseSchema.parse({
          draft: { ...validDraft, concept: '' },
          effectiveMonth: '2026-09',
        }).draft.concept,
      ).toBeNull()
      expect(
        createExpenseSchema.parse({
          draft: { ...validDraft, concept: '   ' },
          effectiveMonth: '2026-09',
        }).draft.concept,
      ).toBeNull()
      expect(
        createExpenseSchema.parse({
          draft: { ...validDraft, concept: '  Alquiler  ' },
          effectiveMonth: '2026-09',
        }).draft.concept,
      ).toBe('Alquiler')

      const maxConcept = createExpenseSchema.parse({
        draft: { ...validDraft, concept: 'a'.repeat(120) },
        effectiveMonth: '2026-09',
      }).draft.concept
      expect(maxConcept).toHaveLength(120)
      expect(() =>
        createExpenseSchema.parse({
          draft: { ...validDraft, concept: 'a'.repeat(121) },
          effectiveMonth: '2026-09',
        }),
      ).toThrow('Máximo 120 caracteres.')

      const parsedOnce = createExpenseSchema.parse({
        draft: { ...validDraft, concept: '' },
        effectiveMonth: '2026-09',
      })
      const reparsed = createExpenseSchema.parse(parsedOnce)
      expect(reparsed.draft.concept).toBeNull()
    })

    it('requires a category', () => {
      const draftWithoutSource = Object.fromEntries(
        Object.entries(validDraft).filter(([key]) => key !== 'source'),
      )

      expect(() =>
        createExpenseSchema.parse({ draft: draftWithoutSource, effectiveMonth: '2026-09' }),
      ).toThrow('Seleccioná una categoría.')
    })

    it('rejects create payload without effectiveMonth', () => {
      expect(() =>
        createExpenseSchema.parse({
          draft: validDraft,
        }),
      ).toThrow()
    })
  })

  describe('updateExpenseSchema', () => {
    it('accepts valid update payload with expenseId, draft, and effectiveMonth', () => {
      const parsed = updateExpenseSchema.parse({
        expenseId: validUuid,
        draft: validDraft,
        effectiveMonth: '2026-09',
      })
      expect(parsed.expenseId).toBe(validUuid)
      expect(parsed.draft).toEqual(validDraft)
      expect(parsed.effectiveMonth).toBe('2026-09')
    })

    it('rejects update payload without effectiveMonth or non-uuid expenseId', () => {
      expect(() =>
        updateExpenseSchema.parse({
          expenseId: validUuid,
          draft: validDraft,
        }),
      ).toThrow()
      expect(() =>
        updateExpenseSchema.parse({
          expenseId: 'invalid-id',
          draft: validDraft,
          effectiveMonth: '2026-09',
        }),
      ).toThrow()
    })
  })

  describe('deleteExpenseSchema', () => {
    it('accepts valid delete payload with expenseId and effectiveMonth', () => {
      const parsed = deleteExpenseSchema.parse({
        expenseId: validUuid,
        effectiveMonth: '2026-09',
      })
      expect(parsed.expenseId).toBe(validUuid)
      expect(parsed.effectiveMonth).toBe('2026-09')
    })

    it('rejects delete payload without effectiveMonth or non-uuid expenseId', () => {
      expect(() =>
        deleteExpenseSchema.parse({
          expenseId: validUuid,
        }),
      ).toThrow()
      expect(() =>
        deleteExpenseSchema.parse({
          expenseId: 'not-a-uuid',
          effectiveMonth: '2026-09',
        }),
      ).toThrow()
    })
  })
})
