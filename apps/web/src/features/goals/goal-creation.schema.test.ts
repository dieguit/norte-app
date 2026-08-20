import { describe, expect, it } from 'vitest'
import {
  confirmGoalCreationSchema,
  confirmGoalEditSchema,
  createObjectiveSchema,
  goalCreationDraftSchema,
  goalEditRequestSchema,
  goalImpactSchema,
  goalPlanSchema,
  goalPrioritySchema,
  goalStrategySchema,
  goalTypeSchema,
  investmentAvailabilitySchema,
  parseGoalCreationSubmission,
  type GoalCreationDraft,
} from './goal-creation.schema'

const baseDraft: GoalCreationDraft = {
  type: 'purchase',
  name: 'Viaje al sur',
  targetAmount: '3.500.000',
  currency: 'ARS',
  desiredMonth: '2027-04',
  priority: 'medium',
  strategy: 'save',
  annualReturnRate: '8',
  availability: 'available_now',
  availableFromMonth: '',
  allocations: [
    { goalId: 'pending-goal', percentage: '100.00' },
  ],
}

describe('Goal Creation Schemas', () => {
  describe('Enums and Draft Schema', () => {
    it('validates canonical goal types, priorities, strategies, and investment availabilities', () => {
      expect(goalTypeSchema.safeParse('emergency_fund').success).toBe(true)
      expect(goalTypeSchema.safeParse('purchase').success).toBe(true)
      expect(goalTypeSchema.safeParse('retirement').success).toBe(true)
      expect(goalTypeSchema.safeParse('other').success).toBe(true)
      expect(goalTypeSchema.safeParse('invalid_type').success).toBe(false)

      expect(goalPrioritySchema.safeParse('high').success).toBe(true)
      expect(goalPrioritySchema.safeParse('medium').success).toBe(true)
      expect(goalPrioritySchema.safeParse('low').success).toBe(true)
      expect(goalPrioritySchema.safeParse('urgent').success).toBe(false)

      expect(goalStrategySchema.safeParse('save').success).toBe(true)
      expect(goalStrategySchema.safeParse('invest').success).toBe(true)
      expect(goalStrategySchema.safeParse('both').success).toBe(false)
      expect(goalStrategySchema.safeParse('other').success).toBe(false)

      expect(investmentAvailabilitySchema.safeParse('available_now').success).toBe(true)
      expect(investmentAvailabilitySchema.safeParse('available_from').success).toBe(true)
      expect(investmentAvailabilitySchema.safeParse('long_term').success).toBe(true)
      expect(investmentAvailabilitySchema.safeParse('locked').success).toBe(false)
    })

    it('validates name requirements in draft schema', () => {
      expect(goalCreationDraftSchema.safeParse({ ...baseDraft, name: '  ' }).success).toBe(false)
      expect(goalCreationDraftSchema.safeParse({ ...baseDraft, name: 'A'.repeat(121) }).success).toBe(false)
      expect(goalCreationDraftSchema.safeParse({ ...baseDraft, name: 'A'.repeat(120) }).success).toBe(true)
    })

    it('rejects invalid strategy in draft schema', () => {
      expect(goalCreationDraftSchema.safeParse({ ...baseDraft, strategy: 'both' as any }).success).toBe(false)
    })

    it('allows empty allocations array in draft schema', () => {
      expect(goalCreationDraftSchema.safeParse({ ...baseDraft, allocations: [] }).success).toBe(true)
    })
  })

  describe('createObjectiveSchema', () => {
    const currentMonth = '2026-08'

    it('accepts valid purchase objective with future desired month and positive amount', () => {
      const result = createObjectiveSchema(currentMonth).safeParse(baseDraft)
      expect(result.success).toBe(true)
    })

    it('rejects desiredMonth equal to or earlier than currentMonth', () => {
      const equalMonth = createObjectiveSchema(currentMonth).safeParse({
        ...baseDraft,
        desiredMonth: '2026-08',
      })
      expect(equalMonth.success).toBe(false)
      if (!equalMonth.success) {
        expect(equalMonth.error.issues[0].message).toBe('Elegí un mes posterior al actual.')
      }

      const pastMonth = createObjectiveSchema(currentMonth).safeParse({
        ...baseDraft,
        desiredMonth: '2026-07',
      })
      expect(pastMonth.success).toBe(false)
    })

    it('allows empty desiredMonth', () => {
      const emptyMonth = createObjectiveSchema(currentMonth).safeParse({
        ...baseDraft,
        desiredMonth: '',
      })
      expect(emptyMonth.success).toBe(true)
    })

    it('requires positive targetAmount for non-emergency goals', () => {
      const emptyAmount = createObjectiveSchema(currentMonth).safeParse({
        ...baseDraft,
        targetAmount: '',
      })
      expect(emptyAmount.success).toBe(false)
      if (!emptyAmount.success) {
        expect(emptyAmount.error.issues[0].message).toBe('Ingresá un monto objetivo mayor a cero.')
      }

      const zeroAmount = createObjectiveSchema(currentMonth).safeParse({
        ...baseDraft,
        targetAmount: '0',
      })
      expect(zeroAmount.success).toBe(false)

      const invalidAmount = createObjectiveSchema(currentMonth).safeParse({
        ...baseDraft,
        targetAmount: 'abc',
      })
      expect(invalidAmount.success).toBe(false)
    })

    it('validates emergency fund currency must be USD and ignores targetAmount requirement', () => {
      const validEmergency = createObjectiveSchema(currentMonth).safeParse({
        ...baseDraft,
        type: 'emergency_fund',
        currency: 'USD',
        targetAmount: '',
      })
      expect(validEmergency.success).toBe(true)

      const invalidEmergencyCurrency = createObjectiveSchema(currentMonth).safeParse({
        ...baseDraft,
        type: 'emergency_fund',
        currency: 'ARS',
      })
      expect(invalidEmergencyCurrency.success).toBe(false)
      if (!invalidEmergencyCurrency.success) {
        expect(invalidEmergencyCurrency.error.issues[0].message).toBe('El colchón financiero se planifica en USD.')
      }
    })
  })

  describe('goalPlanSchema', () => {
    it('accepts save strategy without requiring investment fields', () => {
      const saveDraft = {
        ...baseDraft,
        strategy: 'save' as const,
        annualReturnRate: '',
        availability: 'available_now' as const,
        availableFromMonth: '',
      }
      expect(goalPlanSchema.safeParse(saveDraft).success).toBe(true)
    })

    it('validates annualReturnRate when strategy is invest', () => {
      const validRates = ['0', '8', '8.5', '8,25', '100', '12.345']
      for (const rate of validRates) {
        expect(goalPlanSchema.safeParse({
          ...baseDraft,
          strategy: 'invest',
          annualReturnRate: rate,
        }).success).toBe(true)
      }

      const invalidRates = ['-1', '101', '100.0001', 'invalid']
      for (const rate of invalidRates) {
        const result = goalPlanSchema.safeParse({
          ...baseDraft,
          strategy: 'invest',
          annualReturnRate: rate,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Ingresá un rendimiento entre 0% y 100%, con hasta tres decimales.')
        }
      }
    })

    it('validates availableFromMonth when strategy is invest and availability is available_from', () => {
      const valid = goalPlanSchema.safeParse({
        ...baseDraft,
        strategy: 'invest',
        availability: 'available_from',
        availableFromMonth: '2027-01',
      })
      expect(valid.success).toBe(true)

      const missing = goalPlanSchema.safeParse({
        ...baseDraft,
        strategy: 'invest',
        availability: 'available_from',
        availableFromMonth: '',
      })
      expect(missing.success).toBe(false)
      if (!missing.success) {
        expect(missing.error.issues[0].message).toBe('Elegí desde qué mes estará disponible.')
      }

      const invalidFormat = goalPlanSchema.safeParse({
        ...baseDraft,
        strategy: 'invest',
        availability: 'available_from',
        availableFromMonth: '2027/01',
      })
      expect(invalidFormat.success).toBe(false)
    })
  })

  describe('goalImpactSchema & allocationEntrySchema', () => {
    it('accepts allocations summing to 100%', () => {
      const result = goalImpactSchema.safeParse({
        allocations: [
          { goalId: 'goal-1', percentage: '60.00' },
          { goalId: 'pending-goal', percentage: '40.00' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('accepts allocation with comma decimal separator summing to 100%', () => {
      const result = goalImpactSchema.safeParse({
        allocations: [
          { goalId: 'goal-1', percentage: '33,33' },
          { goalId: 'pending-goal', percentage: '66,67' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects allocations not summing to 100%', () => {
      const result = goalImpactSchema.safeParse({
        allocations: [{ goalId: 'pending-goal', percentage: '99.99' }],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La distribución debe sumar 100%. Ahora suma 99.99%.')
      }
    })

    it('rejects invalid percentage values in allocation entries', () => {
      const negativeResult = goalImpactSchema.safeParse({
        allocations: [
          { goalId: 'goal-1', percentage: '-10' },
          { goalId: 'pending-goal', percentage: '110' },
        ],
      })
      expect(negativeResult.success).toBe(false)

      const excessDecimals = goalImpactSchema.safeParse({
        allocations: [
          { goalId: 'pending-goal', percentage: '100.001' },
        ],
      })
      expect(excessDecimals.success).toBe(false)
    })
  })

  describe('parseGoalCreationSubmission', () => {
    it('parses valid submission through all stages', () => {
      const validSubmission = {
        ...baseDraft,
        name: 'Nuevo auto',
        targetAmount: '5.000.000',
        currency: 'ARS',
        desiredMonth: '2028-12',
        priority: 'high',
        strategy: 'invest',
        annualReturnRate: '7.5',
        availability: 'long_term',
        availableFromMonth: '',
        allocations: [{ goalId: 'pending-goal', percentage: '100.00' }],
      }

      const parsed = parseGoalCreationSubmission(validSubmission, '2026-08')
      expect(parsed.name).toBe('Nuevo auto')
      expect(parsed.strategy).toBe('invest')
    })

    it('throws error if any stage validation fails', () => {
      const invalidSubmission = {
        ...baseDraft,
        desiredMonth: '2025-01', // in the past
      }

      expect(() => parseGoalCreationSubmission(invalidSubmission, '2026-08')).toThrow()
    })
  })

  describe('confirmGoalCreationSchema', () => {
    const validHexToken = 'a'.repeat(64)

    it('accepts valid draft with a valid 64-character sha256 hex previewToken', () => {
      const result = confirmGoalCreationSchema.safeParse({
        draft: baseDraft,
        previewToken: validHexToken,
      })
      expect(result.success).toBe(true)
    })

    it('rejects malformed previewToken (not 64 chars, non-hex, or uppercase)', () => {
      const shortToken = confirmGoalCreationSchema.safeParse({
        draft: baseDraft,
        previewToken: 'abcdef123456',
      })
      expect(shortToken.success).toBe(false)

      const nonHexToken = confirmGoalCreationSchema.safeParse({
        draft: baseDraft,
        previewToken: 'z'.repeat(64),
      })
      expect(nonHexToken.success).toBe(false)

      const uppercaseToken = confirmGoalCreationSchema.safeParse({
        draft: baseDraft,
        previewToken: 'A'.repeat(64),
      })
      expect(uppercaseToken.success).toBe(false)
    })

    it('rejects invalid final allocations in draft', () => {
      const invalidAllocationDraft = {
        ...baseDraft,
        allocations: [{ goalId: 'pending-goal', percentage: '90.00' }], // not 100%
      }

      const result = confirmGoalCreationSchema.safeParse({
        draft: invalidAllocationDraft,
        previewToken: validHexToken,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('goalEditRequestSchema', () => {
    it('accepts valid UUID goalId', () => {
      const result = goalEditRequestSchema.safeParse({
        goalId: '123e4567-e89b-12d3-a456-426614174000',
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-UUID goalId', () => {
      const result = goalEditRequestSchema.safeParse({
        goalId: 'invalid-id',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('confirmGoalEditSchema', () => {
    const validHexToken = 'a'.repeat(64)
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    it('accepts valid edit confirmation with valid UUID, draft, and previewToken', () => {
      const result = confirmGoalEditSchema.safeParse({
        goalId: validUuid,
        draft: baseDraft,
        previewToken: validHexToken,
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-UUID goalId', () => {
      const result = confirmGoalEditSchema.safeParse({
        goalId: 'not-a-uuid',
        draft: baseDraft,
        previewToken: validHexToken,
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid previewToken', () => {
      const result = confirmGoalEditSchema.safeParse({
        goalId: validUuid,
        draft: baseDraft,
        previewToken: 'short-token',
      })
      expect(result.success).toBe(false)
    })

    it('rejects draft allocations not summing to 100%', () => {
      const invalidDraft = {
        ...baseDraft,
        allocations: [{ goalId: validUuid, percentage: '80.00' }],
      }
      const result = confirmGoalEditSchema.safeParse({
        goalId: validUuid,
        draft: invalidDraft,
        previewToken: validHexToken,
      })
      expect(result.success).toBe(false)
    })
  })
})

