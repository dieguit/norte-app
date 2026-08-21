import { describe, it, expect } from 'vitest'
import {
  buildSavingPreview,
  deriveMonthlySavingTargets,
  deriveUsdPurchase,
  parseSavingDraft,
  selectEligibleGoals,
  serializeContributionState,
  serializeSavingContributionState,
  type ContributionKind,
  type EligibleGoalSource,
  type SavingDraftInput,
  type EligibleGoal,
} from './saving-contribution'
import type { GoalsWorkspaceSource } from '../goals/goals'

describe('saving-contribution domain', () => {
  describe('deriveMonthlySavingTargets', () => {
    it('derives ARS and USD monthly saving targets from global commitment and save-strategy allocations', () => {
      const result = deriveMonthlySavingTargets({
        monthlyCommitmentArs: '150000.00',
        goals: [
          { id: 'g1', currency: 'ARS', strategy: 'save', percentage: '40.00' },
          { id: 'g2', currency: 'USD', strategy: 'save', percentage: '30.00' },
          { id: 'g3', currency: 'USD', strategy: 'invest', percentage: '30.00' },
        ],
      })

      // ARS target: 150000 * 40% = 60000.00 ARS
      expect(result.monthlyTargetArs).toEqual({
        amount: '60000.00',
        currency: 'ARS',
      })

      // USD target: (150000 * 30%) / 1500 = 45000 / 1500 = 30.00 USD
      expect(result.monthlyTargetUsd).toEqual({
        amount: '30.00',
        currency: 'USD',
      })
    })

    it('deducts contributions made in the current month from the target and clamps to zero when exceeded', () => {
      const result = deriveMonthlySavingTargets({
        monthlyCommitmentArs: '200000.00',
        goals: [
          { id: 'g1', currency: 'ARS', strategy: 'save', percentage: '100.00' },
          { id: 'g2', currency: 'USD', strategy: 'save', percentage: '50.00' },
        ],
        existingContributions: [
          // Current month ARS contribution of 100.000 -> remaining 100.000
          { amount: '100000.00', currency: 'ARS', createdAt: '2026-08-10T12:00:00Z' },
          // Prior month contribution (ignored)
          { amount: '50000.00', currency: 'ARS', createdAt: '2026-07-15T12:00:00Z' },
          // USD contribution of 70 USD (when target was 200.000 * 50% / 1500 = 66.67 USD -> remaining 0.00)
          { amount: '70.00', currency: 'USD', createdAt: '2026-08-12T12:00:00Z' },
        ],
        currentMonth: '2026-08',
      })

      expect(result.monthlyTargetArs).toEqual({
        amount: '100000.00',
        currency: 'ARS',
      })
      expect(result.monthlyTargetUsd).toEqual({
        amount: '0.00',
        currency: 'USD',
      })
    })

    it('returns null when no save strategy goals exist for that currency', () => {
      const result = deriveMonthlySavingTargets({
        monthlyCommitmentArs: '100000.00',
        goals: [
          { id: 'g1', currency: 'USD', strategy: 'invest', percentage: '100.00' },
        ],
      })

      expect(result.monthlyTargetArs).toBeNull()
      expect(result.monthlyTargetUsd).toBeNull()
    })
  })
  describe('buildSavingPreview', () => {
    it('allocates ARS amount proportionally among eligible goals matching brief example', () => {
      const draft: SavingDraftInput = { currency: 'ARS', amount: '100.00', location: '' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'ars-a', name: 'Viaje', percentage: '30.00' },
        { id: 'ars-b', name: 'Auto', percentage: '70.00' },
      ]

      const result = buildSavingPreview({ draft, eligibleGoals })

      expect(result).toMatchObject({
        allocations: [
          { goalId: 'ars-a', amount: { amount: '30.00', currency: 'ARS' } },
          { goalId: 'ars-b', amount: { amount: '70.00', currency: 'ARS' } },
        ],
      })
      expect(result.allocations[0].percentage).toBe('30.00')
      expect(result.allocations[1].percentage).toBe('70.00')
    })

    it('normalizes a 20%/30% compatible slice to 40%/60%', () => {
      const draft: SavingDraftInput = { currency: 'ARS', amount: '500.00' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'g-1', name: 'Fondo de Emergencia', percentage: '20.00' },
        { id: 'g-2', name: 'Vacaciones', percentage: '30.00' },
      ]

      const result = buildSavingPreview({ draft, eligibleGoals })

      expect(result.allocations).toEqual([
        {
          goalId: 'g-1',
          goalName: 'Fondo de Emergencia',
          percentage: '40.00',
          amount: { amount: '200.00', currency: 'ARS' },
        },
        {
          goalId: 'g-2',
          goalName: 'Vacaciones',
          percentage: '60.00',
          amount: { amount: '300.00', currency: 'ARS' },
        },
      ])
    })

    it('distributes cent remainder deterministically using largest remainder rule', () => {
      const draft: SavingDraftInput = { currency: 'ARS', amount: '100.00' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'g-1', name: 'Goal 1', percentage: '10.00' },
        { id: 'g-2', name: 'Goal 2', percentage: '10.00' },
        { id: 'g-3', name: 'Goal 3', percentage: '10.00' },
      ]

      const result = buildSavingPreview({ draft, eligibleGoals })

      // Scaled percentages: 33.34%, 33.33%, 33.33%
      expect(result.allocations[0].percentage).toBe('33.34')
      expect(result.allocations[1].percentage).toBe('33.33')
      expect(result.allocations[2].percentage).toBe('33.33')

      // 100.00 allocated
      expect(result.allocations[0].amount.amount).toBe('33.34')
      expect(result.allocations[1].amount.amount).toBe('33.33')
      expect(result.allocations[2].amount.amount).toBe('33.33')
    })

    it('handles equal split when all eligible goals have 0% allocation', () => {
      const draft: SavingDraftInput = { currency: 'USD', amount: '100.00', effectiveRate: '1500.00' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'usd-1', name: 'Retiro', percentage: '0.00' },
        { id: 'usd-2', name: 'Inversión', percentage: '0.00' },
      ]

      const result = buildSavingPreview({ draft, eligibleGoals })

      expect(result.allocations).toEqual([
        {
          goalId: 'usd-1',
          goalName: 'Retiro',
          percentage: '50.00',
          amount: { amount: '50.00', currency: 'USD' },
        },
        {
          goalId: 'usd-2',
          goalName: 'Inversión',
          percentage: '50.00',
          amount: { amount: '50.00', currency: 'USD' },
        },
      ])
    })

    it('throws when eligible goals array is empty', () => {
      const draft: SavingDraftInput = { currency: 'ARS', amount: '100.00' }
      expect(() => buildSavingPreview({ draft, eligibleGoals: [] })).toThrow('No eligible goals')
    })

    it('throws for zero, negative, or invalid amounts', () => {
      const eligibleGoals: EligibleGoal[] = [{ id: 'g-1', name: 'Meta', percentage: '100.00' }]

      expect(() =>
        buildSavingPreview({
          draft: { currency: 'ARS', amount: '0' },
          eligibleGoals,
        }),
      ).toThrow('Contribution amount must be positive')

      expect(() =>
        buildSavingPreview({
          draft: { currency: 'ARS', amount: '-50.00' },
          eligibleGoals,
        }),
      ).toThrow('Contribution amount must be positive')

      expect(() =>
        buildSavingPreview({
          draft: { currency: 'ARS', amount: 'not-a-number' },
          eligibleGoals,
        }),
      ).toThrow('Contribution amount must be positive')
    })

    it('computes in-memory before/after progress and projected date when workspaceSource and currentMonth are provided', () => {
      const draft: SavingDraftInput = { currency: 'ARS', amount: '300.00', location: 'Santander' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'goal-1', name: 'Viaje', percentage: '100.00' },
      ]

      const workspaceSource: GoalsWorkspaceSource = {
        profile: {
          userId: 'u1',
          baseCurrency: 'ARS',
          approximateMonthlyIncome: '1000000.00',
          approximateMonthlyExpenses: '500000.00',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: '100000.00',
          onboardingCompleted: true,
        },
        goals: [
          {
            id: 'goal-1',
            userId: 'u1',
            name: 'Viaje',
            type: 'purchase',
            targetAmount: '1000.00',
            currency: 'ARS',
            priority: 'high',
            strategy: 'save',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        savingsPositions: [
          {
            id: 'pos-1',
            goalId: 'goal-1',
            amount: '200.00',
            currency: 'ARS',
            location: 'Efectivo',
          },
        ],
        investmentPositions: [],
        snapshots: [
          {
            id: 'snap-1',
            userId: 'u1',
            effectiveMonth: '2026-08-01',
          },
        ],
        allocations: [
          {
            id: 'alloc-1',
            snapshotId: 'snap-1',
            goalId: 'goal-1',
            percentage: '100.00',
          },
        ],
      }

      const result = buildSavingPreview({
        draft,
        eligibleGoals,
        workspaceSource,
        currentMonth: '2026-08',
      })

      expect(result.allocations).toHaveLength(1)
      const alloc = result.allocations[0]
      expect(alloc.goalId).toBe('goal-1')
      expect(alloc.amount).toEqual({ amount: '300.00', currency: 'ARS' })
      expect(alloc.progressBefore).toBe('20.00') // 200 / 1000
      expect(alloc.progressAfter).toBe('50.00') // 500 / 1000
      expect(alloc.projectionBefore).toBeDefined()
      expect(alloc.projectionAfter).toBeDefined()
    })
  })

  describe('deriveUsdPurchase', () => {
    it('derives effectiveRate when usdAmount and arsSpent are provided', () => {
      expect(
        deriveUsdPurchase({ usdAmount: '100.00', arsSpent: '150000.00' }),
      ).toEqual({ effectiveRate: '1500.00' })
    })

    it('derives arsSpent when usdAmount and effectiveRate are provided', () => {
      expect(
        deriveUsdPurchase({ usdAmount: '100.00', effectiveRate: '1500.00' }),
      ).toEqual({ arsSpent: '150000.00' })
    })

    it('derives usdAmount when arsSpent and effectiveRate are provided', () => {
      expect(
        deriveUsdPurchase({ arsSpent: '150000.00', effectiveRate: '1500.00' }),
      ).toEqual({ usdAmount: '100.00' })
    })

    it('validates and returns normalized values when all three values are coherent', () => {
      expect(
        deriveUsdPurchase({
          usdAmount: '100.00',
          arsSpent: '150000.00',
          effectiveRate: '1500.00',
        }),
      ).toEqual({
        usdAmount: '100.00',
        arsSpent: '150000.00',
        effectiveRate: '1500.00',
      })
    })

    it('rejects incoherence when all 3 values do not match within rounding', () => {
      expect(() =>
        deriveUsdPurchase({
          usdAmount: '100.00',
          arsSpent: '120000.00',
          effectiveRate: '1500.00',
        }),
      ).toThrow('USD purchase values are incoherent')
    })

    it('rejects one-field inputs', () => {
      expect(() => deriveUsdPurchase({ usdAmount: '100.00' })).toThrow(
        'USD purchase derivation requires at least two positive values',
      )
      expect(() => deriveUsdPurchase({ arsSpent: '150000.00' })).toThrow(
        'USD purchase derivation requires at least two positive values',
      )
      expect(() => deriveUsdPurchase({ effectiveRate: '1500.00' })).toThrow(
        'USD purchase derivation requires at least two positive values',
      )
      expect(() => deriveUsdPurchase({})).toThrow(
        'USD purchase derivation requires at least two positive values',
      )
    })

    it('rejects zero or negative values', () => {
      expect(() =>
        deriveUsdPurchase({ usdAmount: '0.00', arsSpent: '150000.00' }),
      ).toThrow('USD purchase values must be positive')
      expect(() =>
        deriveUsdPurchase({ usdAmount: '-10.00', arsSpent: '150000.00' }),
      ).toThrow('USD purchase values must be positive')
      expect(() =>
        deriveUsdPurchase({ usdAmount: '100.00', effectiveRate: '-500.00' }),
      ).toThrow('USD purchase values must be positive')
    })
  })

  describe('parseSavingDraft', () => {
    it('parses valid ARS draft', () => {
      const parsed = parseSavingDraft({
        currency: 'ARS',
        amount: '12.500,50',
        location: ' Santander Rio ',
      })
      expect(parsed).toEqual({
        currency: 'ARS',
        amount: { amount: '12500.50', currency: 'ARS' },
        location: 'Santander Rio',
      })
    })

    it('parses valid USD draft with derived ARS spent', () => {
      const parsed = parseSavingDraft({
        currency: 'USD',
        amount: '100.00',
        effectiveRate: '1500.00',
      })
      expect(parsed).toEqual({
        currency: 'USD',
        amount: { amount: '100.00', currency: 'USD' },
        arsSpent: { amount: '150000.00', currency: 'ARS' },
        effectiveRate: '1500.00',
      })
    })

    it('rejects unsupported currency', () => {
      expect(() =>
        parseSavingDraft({
          currency: 'EUR' as any,
          amount: '100.00',
        }),
      ).toThrow('Invalid currency')
    })
  })

  describe('selectEligibleGoals', () => {
    it('filters goals by strategy matching contribution kind and currency', () => {
      const goals: EligibleGoalSource[] = [
        { id: 'save-ars', name: 'Save ARS', currency: 'ARS', strategy: 'save', status: 'active' },
        { id: 'invest-ars', name: 'Invest ARS', currency: 'ARS', strategy: 'invest', status: 'active' },
        { id: 'save-usd', name: 'Save USD', currency: 'USD', strategy: 'save', status: 'active' },
        { id: 'invest-usd', name: 'Invest USD', currency: 'USD', strategy: 'invest', status: 'active' },
        { id: 'paused-save-ars', name: 'Paused Save', currency: 'ARS', strategy: 'save', status: 'paused' },
        { id: 'archived-invest-ars', name: 'Archived Invest', currency: 'ARS', strategy: 'invest', status: 'archived' },
      ]

      const savingKind: ContributionKind = 'saving'
      const investmentKind: ContributionKind = 'investment'

      expect(selectEligibleGoals(goals, savingKind, 'ARS').map((goal) => goal.id)).toEqual(['save-ars'])
      expect(selectEligibleGoals(goals, investmentKind, 'ARS').map((goal) => goal.id)).toEqual(['invest-ars'])
      expect(selectEligibleGoals(goals, savingKind, 'USD').map((goal) => goal.id)).toEqual(['save-usd'])
      expect(selectEligibleGoals(goals, investmentKind, 'USD').map((goal) => goal.id)).toEqual(['invest-usd'])
    })
  })

  describe('serializeSavingContributionState', () => {
    it('serializes state deterministically sorting eligible goals by ID', () => {
      const str1 = serializeSavingContributionState({
        draft: { currency: 'ARS', amount: '100.00' },
        eligibleGoals: [
          { id: 'b', name: 'B', percentage: '50.00' },
          { id: 'a', name: 'A', percentage: '50.00' },
        ],
        currentMonth: '2026-08',
      })

      const str2 = serializeSavingContributionState({
        draft: { currency: 'ARS', amount: '100.00' },
        eligibleGoals: [
          { id: 'a', name: 'A', percentage: '50.00' },
          { id: 'b', name: 'B', percentage: '50.00' },
        ],
        currentMonth: '2026-08',
      })

      expect(str1).toBe(str2)
    })
  })

  describe('serializeContributionState', () => {
    it('produces distinct serialized representations for saving vs investment with identical inputs', () => {
      const draft: SavingDraftInput = { currency: 'ARS', amount: '100.00' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'goal-1', name: 'Goal 1', percentage: '100.00' },
      ]
      const currentMonth = '2026-08'

      expect(
        serializeContributionState({ kind: 'investment', draft, eligibleGoals, currentMonth }),
      ).not.toBe(
        serializeContributionState({ kind: 'saving', draft, eligibleGoals, currentMonth }),
      )
    })

    it('defaults kind to saving when kind is omitted', () => {
      const draft: SavingDraftInput = { currency: 'ARS', amount: '100.00' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'goal-1', name: 'Goal 1', percentage: '100.00' },
      ]
      const currentMonth = '2026-08'

      expect(serializeContributionState({ draft, eligibleGoals, currentMonth })).toBe(
        serializeContributionState({ kind: 'saving', draft, eligibleGoals, currentMonth }),
      )
    })
  })

  describe('buildSavingPreview with investment kind', () => {
    it('allocates total draft amount to investment goals and updates investment projection in workspaceSource', () => {
      const draft: SavingDraftInput = { currency: 'USD', amount: '250.00' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'inv-1', name: 'Cedears', percentage: '60.00' },
        { id: 'inv-2', name: 'SPY', percentage: '40.00' },
      ]

      const workspaceSource: GoalsWorkspaceSource = {
        profile: {
          userId: 'u1',
          baseCurrency: 'USD',
          approximateMonthlyIncome: '5000.00',
          expensesKnowledge: 'known',
          onboardingCompleted: true,
        },
        goals: [
          {
            id: 'inv-1',
            userId: 'u1',
            name: 'Cedears',
            type: 'investment',
            targetAmount: '1000.00',
            currency: 'USD',
            priority: 'high',
            strategy: 'invest',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'inv-2',
            userId: 'u1',
            name: 'SPY',
            type: 'investment',
            targetAmount: '1000.00',
            currency: 'USD',
            priority: 'high',
            strategy: 'invest',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        savingsPositions: [],
        investmentPositions: [
          {
            id: 'pos-inv-1',
            goalId: 'inv-1',
            currentValue: '100.00',
            currency: 'USD',
          },
          {
            id: 'pos-inv-2',
            goalId: 'inv-2',
            currentValue: '200.00',
            currency: 'USD',
          },
        ],
        snapshots: [
          {
            id: 'snap-1',
            userId: 'u1',
            effectiveMonth: '2026-08-01',
          },
        ],
        allocations: [
          {
            id: 'alloc-1',
            snapshotId: 'snap-1',
            goalId: 'inv-1',
            percentage: '60.00',
          },
          {
            id: 'alloc-2',
            snapshotId: 'snap-1',
            goalId: 'inv-2',
            percentage: '40.00',
          },
        ],
      }

      const result = buildSavingPreview({
        kind: 'investment',
        draft,
        eligibleGoals,
        workspaceSource,
        currentMonth: '2026-08',
      })

      expect(result.allocations).toHaveLength(2)
      expect(result.allocations[0].amount).toEqual({ amount: '150.00', currency: 'USD' })
      expect(result.allocations[1].amount).toEqual({ amount: '100.00', currency: 'USD' })

      // Progress before: inv-1 = 100/1000 = 10%, inv-2 = 200/1000 = 20%
      // Progress after: inv-1 = 250/1000 = 25%, inv-2 = 300/1000 = 30%
      expect(result.allocations[0].progressBefore).toBe('10.00')
      expect(result.allocations[0].progressAfter).toBe('25.00')
      expect(result.allocations[1].progressBefore).toBe('20.00')
      expect(result.allocations[1].progressAfter).toBe('30.00')
    })
  })
})
