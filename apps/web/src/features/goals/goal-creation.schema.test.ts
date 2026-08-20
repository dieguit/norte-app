import { describe, expect, it } from 'vitest'
import {
  confirmGoalCreationSchema,
  createObjectiveSchema,
  goalCreationDraftSchema,
  goalImpactSchema,
  goalPlanSchema,
  goalPrioritySchema,
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
  saveEnabled: true,
  investEnabled: false,
  defineSaveCommitment: false,
  saveMonthlyCommitment: '',
  defineInvestCommitment: false,
  investMonthlyCommitment: '',
  annualReturnRate: '8',
  availability: 'available_now',
  availableFromMonth: '',
  allocations: [],
}

describe('Goal Creation Schemas', () => {
  describe('Enums and Draft Schema', () => {
    it('validates canonical goal types, priorities, and investment availabilities', () => {
      expect(goalTypeSchema.safeParse('emergency_fund').success).toBe(true)
      expect(goalTypeSchema.safeParse('purchase').success).toBe(true)
      expect(goalTypeSchema.safeParse('retirement').success).toBe(true)
      expect(goalTypeSchema.safeParse('other').success).toBe(true)
      expect(goalTypeSchema.safeParse('invalid_type').success).toBe(false)

      expect(goalPrioritySchema.safeParse('high').success).toBe(true)
      expect(goalPrioritySchema.safeParse('medium').success).toBe(true)
      expect(goalPrioritySchema.safeParse('low').success).toBe(true)
      expect(goalPrioritySchema.safeParse('urgent').success).toBe(false)

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
    it('requires at least one funding method enabled', () => {
      const neither = goalPlanSchema.safeParse({
        ...baseDraft,
        saveEnabled: false,
        investEnabled: false,
      })
      expect(neither.success).toBe(false)
      if (!neither.success) {
        expect(neither.error.issues[0].message).toBe('Elegí ahorrar, invertir o ambas opciones.')
      }
    })

    it('validates saveMonthlyCommitment when save is enabled and commitment is defined', () => {
      const withoutCommitment = goalPlanSchema.safeParse({
        ...baseDraft,
        saveEnabled: true,
        defineSaveCommitment: false,
        saveMonthlyCommitment: '',
      })
      expect(withoutCommitment.success).toBe(true)

      const withValidCommitment = goalPlanSchema.safeParse({
        ...baseDraft,
        saveEnabled: true,
        defineSaveCommitment: true,
        saveMonthlyCommitment: '50.000',
      })
      expect(withValidCommitment.success).toBe(true)

      const withInvalidCommitment = goalPlanSchema.safeParse({
        ...baseDraft,
        saveEnabled: true,
        defineSaveCommitment: true,
        saveMonthlyCommitment: '0',
      })
      expect(withInvalidCommitment.success).toBe(false)
      if (!withInvalidCommitment.success) {
        expect(withInvalidCommitment.error.issues[0].message).toBe('Ingresá un aporte mensual mayor a cero.')
      }
    })

    it('validates investMonthlyCommitment when invest is enabled and commitment is defined', () => {
      const withValidCommitment = goalPlanSchema.safeParse({
        ...baseDraft,
        investEnabled: true,
        defineInvestCommitment: true,
        investMonthlyCommitment: '100.000',
      })
      expect(withValidCommitment.success).toBe(true)

      const withEmptyCommitment = goalPlanSchema.safeParse({
        ...baseDraft,
        investEnabled: true,
        defineInvestCommitment: true,
        investMonthlyCommitment: '',
      })
      expect(withEmptyCommitment.success).toBe(false)
      if (!withEmptyCommitment.success) {
        expect(withEmptyCommitment.error.issues[0].message).toBe('Ingresá un aporte mensual mayor a cero.')
      }
    })

    it('validates annualReturnRate when invest is enabled', () => {
      const validRates = ['0', '8', '8.5', '8,25', '100', '12.345']
      for (const rate of validRates) {
        expect(goalPlanSchema.safeParse({
          ...baseDraft,
          investEnabled: true,
          annualReturnRate: rate,
        }).success).toBe(true)
      }

      const invalidRates = ['-1', '101', '100.0001', 'invalid']
      for (const rate of invalidRates) {
        const result = goalPlanSchema.safeParse({
          ...baseDraft,
          investEnabled: true,
          annualReturnRate: rate,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Ingresá un rendimiento entre 0% y 100%, con hasta tres decimales.')
        }
      }
    })

    it('validates availableFromMonth when availability is available_from', () => {
      const valid = goalPlanSchema.safeParse({
        ...baseDraft,
        investEnabled: true,
        availability: 'available_from',
        availableFromMonth: '2027-01',
      })
      expect(valid.success).toBe(true)

      const missing = goalPlanSchema.safeParse({
        ...baseDraft,
        investEnabled: true,
        availability: 'available_from',
        availableFromMonth: '',
      })
      expect(missing.success).toBe(false)
      if (!missing.success) {
        expect(missing.error.issues[0].message).toBe('Elegí desde qué mes estará disponible.')
      }

      const invalidFormat = goalPlanSchema.safeParse({
        ...baseDraft,
        investEnabled: true,
        availability: 'available_from',
        availableFromMonth: '2027/01',
      })
      expect(invalidFormat.success).toBe(false)
    })
  })

  describe('goalImpactSchema & allocationGroupSchema', () => {
    it('accepts allocation groups summing to 100%', () => {
      const result = goalImpactSchema.safeParse({
        ...baseDraft,
        allocations: [{
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [
            { goalId: 'goal-1', percentage: '60.00' },
            { goalId: 'pending-goal', percentage: '40.00' },
          ],
        }],
      })
      expect(result.success).toBe(true)
    })

    it('accepts allocation with comma decimal separator summing to 100%', () => {
      const result = goalImpactSchema.safeParse({
        ...baseDraft,
        allocations: [{
          key: 'invest:USD',
          fundingMethod: 'invest',
          destinationCurrency: 'USD',
          entries: [
            { goalId: 'goal-1', percentage: '33,33' },
            { goalId: 'pending-goal', percentage: '66,67' },
          ],
        }],
      })
      expect(result.success).toBe(true)
    })

    it('rejects allocation groups not summing to 100%', () => {
      const result = goalImpactSchema.safeParse({
        ...baseDraft,
        allocations: [{
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [{ goalId: 'pending-goal', percentage: '99.99' }],
        }],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La distribución debe sumar 100%. Ahora suma 99.99%.')
      }
    })

    it('rejects invalid percentage values in allocation entries', () => {
      const negativeResult = goalImpactSchema.safeParse({
        ...baseDraft,
        allocations: [{
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [
            { goalId: 'goal-1', percentage: '-10' },
            { goalId: 'pending-goal', percentage: '110' },
          ],
        }],
      })
      expect(negativeResult.success).toBe(false)

      const excessDecimals = goalImpactSchema.safeParse({
        ...baseDraft,
        allocations: [{
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [
            { goalId: 'pending-goal', percentage: '100.001' },
          ],
        }],
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
        saveEnabled: true,
        investEnabled: true,
        defineSaveCommitment: true,
        saveMonthlyCommitment: '100.000',
        defineInvestCommitment: false,
        investMonthlyCommitment: '',
        annualReturnRate: '7.5',
        availability: 'long_term',
        availableFromMonth: '',
        allocations: [{
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [{ goalId: 'pending-goal', percentage: '100' }],
        }],
      }

      const parsed = parseGoalCreationSubmission(validSubmission, '2026-08')
      expect(parsed.name).toBe('Nuevo auto')
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
        allocations: [{
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [{ goalId: 'pending-goal', percentage: '90.00' }], // not 100%
        }],
      }

      const result = confirmGoalCreationSchema.safeParse({
        draft: invalidAllocationDraft,
        previewToken: validHexToken,
      })
      expect(result.success).toBe(false)
    })
  })
})

