import { describe, it, expect } from 'vitest'
import {
  buildSavingPreview,
  deriveMonthlySavingTargets,
  derivePreviousMonthShortfalls,
  deriveUsdPurchase,
  getInvestmentContributionDataState,
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

    it('derives ARS and USD monthly investment targets when kind is investment', () => {
      const result = deriveMonthlySavingTargets({
        monthlyCommitmentArs: '300000.00',
        goals: [
          { id: 'g1', currency: 'ARS', strategy: 'invest', percentage: '50.00' },
          { id: 'g2', currency: 'USD', strategy: 'invest', percentage: '50.00' },
          { id: 'g3', currency: 'ARS', strategy: 'save', percentage: '0.00' },
        ],
        existingContributions: [
          { amount: '50000.00', currency: 'ARS', createdAt: '2026-08-01T12:00:00Z' },
        ],
        currentMonth: '2026-08',
        kind: 'investment',
      })

      // ARS investment target: 300000 * 50% = 150000 - 50000 = 100000.00
      expect(result.monthlyTargetArs).toEqual({
        amount: '100000.00',
        currency: 'ARS',
      })
      // USD investment target: (300000 * 50%) / 1500 = 100.00 USD
      expect(result.monthlyTargetUsd).toEqual({
        amount: '100.00',
        currency: 'USD',
      })
    })

    it('classifies offset timestamps by their UTC month at both month boundaries', () => {
      const result = deriveMonthlySavingTargets({
        monthlyCommitmentArs: '100000.00',
        goals: [{ id: 'g1', currency: 'ARS', strategy: 'save', percentage: '100.00' }],
        existingContributions: [
          { amount: '10000.00', currency: 'ARS', createdAt: '2026-07-31T23:30:00-02:00' },
          { amount: '10000.00', currency: 'ARS', createdAt: '2026-09-01T00:30:00+02:00' },
        ],
        currentMonth: '2026-08',
      })

      expect(result.monthlyTargetArs).toEqual({ amount: '80000.00', currency: 'ARS' })
    })

    it('ignores invalid contribution timestamps instead of using their string prefix', () => {
      const result = deriveMonthlySavingTargets({
        monthlyCommitmentArs: '100000.00',
        goals: [{ id: 'g1', currency: 'ARS', strategy: 'save', percentage: '100.00' }],
        existingContributions: [
          { amount: '10000.00', currency: 'ARS', createdAt: '2026-08-not-a-date' },
        ],
        currentMonth: '2026-08',
      })

      expect(result.monthlyTargetArs).toEqual({ amount: '100000.00', currency: 'ARS' })
    })
  })

  describe('investment contribution data state', () => {
    it('keeps USD ready when an active ARS investment goal has no persisted position', () => {
      expect(getInvestmentContributionDataState({
        goals: [
          { id: 'investment-ars', currency: 'ARS', status: 'active', strategy: 'invest' },
          { id: 'investment-usd', currency: 'USD', status: 'active', strategy: 'invest' },
        ],
        investmentPositions: [
          { goalId: 'investment-ars', currency: 'USD' },
          { goalId: 'investment-usd', currency: 'USD' },
        ],
      } as any)).toEqual({
        ars: { status: 'incomplete', reason: 'missing_investment_position' },
        usd: { status: 'ready' },
      })
    })

    it('keeps ARS ready when an active USD investment goal has no persisted position', () => {
      expect(getInvestmentContributionDataState({
        goals: [
          { id: 'investment-ars', currency: 'ARS', status: 'active', strategy: 'invest' },
          { id: 'investment-usd', currency: 'USD', status: 'active', strategy: 'invest' },
        ],
        investmentPositions: [
          { goalId: 'investment-ars', currency: 'ARS' },
          { goalId: 'investment-usd', currency: 'ARS' },
        ],
      } as any)).toEqual({
        ars: { status: 'ready' },
        usd: { status: 'incomplete', reason: 'missing_investment_position' },
      })
    })

  })
  describe('buildSavingPreview', () => {
    it('allocates ARS amount proportionally among eligible goals matching brief example', () => {
      const draft: SavingDraftInput = { currency: 'ARS', amount: '100.00' }
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
      const draft: SavingDraftInput = { currency: 'ARS', amount: '300.00' }
      const eligibleGoals: EligibleGoal[] = [
        { id: 'goal-1', name: 'Viaje', percentage: '100.00' },
      ]

      const workspaceSource: GoalsWorkspaceSource = {
        profile: {
          userId: 'u1',
          baseCurrency: 'ARS',
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

    it('rejects either one-cent mismatch even when the values are otherwise rounded to cents', () => {
      for (const arsSpent of ['150000.01', '149999.99']) {
        expect(() =>
          deriveUsdPurchase({
            usdAmount: '100.00',
            arsSpent,
            effectiveRate: '1500.00',
          }),
        ).toThrow('USD purchase values are incoherent')
      }
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
      })
      expect(parsed).toEqual({
        currency: 'ARS',
        amount: { amount: '12500.50', currency: 'ARS' },
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

    it('changes serialized representation when financial-plan rows change', () => {
      const workspaceSource: GoalsWorkspaceSource = {
        profile: {
          userId: 'user-1',
          baseCurrency: 'ARS',
          expensesKnowledge: 'known',
          onboardingCompleted: true,
        },
        goals: [
          {
            id: 'goal-1',
            userId: 'user-1',
            name: 'Objetivo',
            type: 'purchase',
            targetAmount: '500000.00',
            currency: 'ARS',
            priority: 'high',
            strategy: 'save',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        savingsPositions: [],
        investmentPositions: [],
        snapshots: [
          {
            id: 'snap-1',
            userId: 'user-1',
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
        incomes: [
          {
            id: 'income-1',
            sourceKind: 'fixed',
            sourceId: null,
            sourceName: 'Sueldo',
            concept: null,
            amount: '100000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-01-01',
          },
        ],
        expenses: [
          {
            id: 'expense-1',
            sourceKind: 'fixed',
            sourceId: null,
            sourceName: 'Alquiler',
            concept: null,
            amount: '40000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-01-01',
            endMonth: null,
          },
        ],
      }

      const baseline = serializeContributionState({
        draft: { currency: 'ARS', amount: '100.00' },
        eligibleGoals: [{ id: 'goal-1', name: 'Objetivo', percentage: '100.00' }],
        currentMonth: '2026-08',
        workspaceSource,
      })
      const changedIncome = serializeContributionState({
        draft: { currency: 'ARS', amount: '100.00' },
        eligibleGoals: [{ id: 'goal-1', name: 'Objetivo', percentage: '100.00' }],
        currentMonth: '2026-08',
        workspaceSource: {
          ...workspaceSource,
          incomes: workspaceSource.incomes?.map((income, index) =>
            index === 0 ? { ...income, amount: '100001.00' } : income,
          ),
        },
      })

      expect(changedIncome).not.toBe(baseline)
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

    it('does not synthesize an investment position when the persisted position is missing', () => {
      const result = buildSavingPreview({
        kind: 'investment',
        draft: { kind: 'investment', currency: 'USD', amount: '100.00' },
        eligibleGoals: [{ id: 'inv-1', name: 'Cedears', percentage: '100.00' }],
        currentMonth: '2026-08',
        workspaceSource: {
          profile: {
            userId: 'u1',
            baseCurrency: 'USD',
            expensesKnowledge: 'known',
            plannedMonthlyContribution: '100000.00',
            onboardingCompleted: true,
          },
          goals: [{
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
          }],
          savingsPositions: [],
          investmentPositions: [],
          snapshots: [{ id: 'snap-1', userId: 'u1', effectiveMonth: '2026-08-01' }],
          allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'inv-1', percentage: '100.00' }],
        },
      })

      expect(result.allocations[0].progressBefore).toBe('0.00')
      expect(result.allocations[0].progressAfter).toBe('0.00')
    })
  })

  describe('derivePreviousMonthShortfalls', () => {
    const baseInput = {
      closedMonth: '2026-07',
      plannedMonthlyContribution: '150000.00',
      goals: [
        { id: 'g-save-ars', strategy: 'save', currency: 'ARS' as const },
        { id: 'g-save-usd', strategy: 'save', currency: 'USD' as const },
        { id: 'g-invest-ars', strategy: 'invest', currency: 'ARS' as const },
        { id: 'g-invest-usd', strategy: 'invest', currency: 'USD' as const },
      ],
      allocations: [
        { goalId: 'g-save-ars', percentage: '20.00' }, // 150000 * 20% = 30000 ARS
        { goalId: 'g-save-usd', percentage: '30.00' }, // (150000 * 30%) / 1500 = 30 USD
        { goalId: 'g-invest-ars', percentage: '33.333333333333336' }, // 150000 * (1/3) = 50000 ARS
        { goalId: 'g-invest-usd', percentage: '16.666666666666668' }, // (150000 * (1/6)) / 1500 = 16.67 USD
      ],
      savingContributions: [],
      investmentContributions: [],
    }

    it('returns separate saving USD and investment ARS shortfalls for the prior month', () => {
      const input = {
        closedMonth: '2026-07',
        plannedMonthlyContribution: '150000.00',
        goals: [
          { id: 'g-save-usd', strategy: 'save', currency: 'USD' as const },
          { id: 'g-invest-ars', strategy: 'invest', currency: 'ARS' as const },
        ],
        allocations: [
          { goalId: 'g-save-usd', percentage: '30.00' }, // Expected: (150000 * 30%) / 1500 = 30.00 USD
          { goalId: 'g-invest-ars', percentage: '33.333333333333336' }, // Expected: 150000 * (1/3) = 50000.00 ARS
        ],
        savingContributions: [
          { amount: '10.00', currency: 'USD', createdAt: '2026-07-15T10:00:00.000Z' },
        ],
        investmentContributions: [
          { amount: '25000.00', currency: 'ARS', createdAt: new Date('2026-07-20T12:00:00.000Z') },
        ],
      }

      expect(derivePreviousMonthShortfalls(input)).toEqual([
        { kind: 'saving', currency: 'USD', amount: { amount: '20.00', currency: 'USD' } },
        { kind: 'investment', currency: 'ARS', amount: { amount: '25000.00', currency: 'ARS' } },
      ])
    })

    it('returns no result when plannedMonthlyContribution is null or non-positive', () => {
      expect(derivePreviousMonthShortfalls({ ...baseInput, plannedMonthlyContribution: null })).toEqual([])
      expect(derivePreviousMonthShortfalls({ ...baseInput, plannedMonthlyContribution: '0.00' })).toEqual([])
      expect(derivePreviousMonthShortfalls({ ...baseInput, plannedMonthlyContribution: '-1000.00' })).toEqual([])
      expect(derivePreviousMonthShortfalls({ ...baseInput, plannedMonthlyContribution: '' })).toEqual([])
    })

    it('returns no result when allocations are empty', () => {
      expect(derivePreviousMonthShortfalls({ ...baseInput, allocations: [] })).toEqual([])
    })

    it('omits categories where actual contributions meet or exceed expected targets', () => {
      const input = {
        ...baseInput,
        allocations: [
          { goalId: 'g-save-ars', percentage: '20.00' }, // Expected: 30000 ARS
          { goalId: 'g-save-usd', percentage: '30.00' }, // Expected: 30 USD
        ],
        savingContributions: [
          { amount: '30000.00', currency: 'ARS', createdAt: '2026-07-05T00:00:00.000Z' }, // Exact match
          { amount: '50.00', currency: 'USD', createdAt: '2026-07-10T00:00:00.000Z' }, // Over target (30 USD expected)
        ],
      }

      expect(derivePreviousMonthShortfalls(input)).toEqual([])
    })

    it('ignores contributions outside the closed UTC month', () => {
      const input = {
        ...baseInput,
        allocations: [
          { goalId: 'g-save-ars', percentage: '20.00' }, // Expected: 30000 ARS
        ],
        savingContributions: [
          // Different months
          { amount: '30000.00', currency: 'ARS', createdAt: '2026-06-30T23:59:59.999Z' },
          { amount: '30000.00', currency: 'ARS', createdAt: '2026-08-01T00:00:00.000Z' },
          // Partial in closed month
          { amount: '10000.00', currency: 'ARS', createdAt: '2026-07-15T12:00:00.000Z' },
        ],
      }

      // Expected 30000 ARS - 10000 ARS = 20000.00 ARS
      expect(derivePreviousMonthShortfalls(input)).toEqual([
        { kind: 'saving', currency: 'ARS', amount: { amount: '20000.00', currency: 'ARS' } },
      ])
    })

    it('ignores negative or invalid contribution amounts', () => {
      const input = {
        ...baseInput,
        allocations: [
          { goalId: 'g-save-ars', percentage: '20.00' }, // Expected: 30000 ARS
        ],
        savingContributions: [
          { amount: '-5000.00', currency: 'ARS', createdAt: '2026-07-10T00:00:00.000Z' },
          { amount: '0.00', currency: 'ARS', createdAt: '2026-07-11T00:00:00.000Z' },
          { amount: 'invalid', currency: 'ARS', createdAt: '2026-07-12T00:00:00.000Z' },
          { amount: '5000.00', currency: 'ARS', createdAt: '2026-07-13T00:00:00.000Z' },
        ],
      }

      // Expected 30000 ARS - 5000 ARS = 25000.00 ARS
      expect(derivePreviousMonthShortfalls(input)).toEqual([
        { kind: 'saving', currency: 'ARS', amount: { amount: '25000.00', currency: 'ARS' } },
      ])
    })

    it('ignores malformed historical investment contribution amounts', () => {
      const input = {
        closedMonth: '2026-07',
        plannedMonthlyContribution: '100000.00',
        goals: [{ id: 'g-invest-ars', strategy: 'invest', currency: 'ARS' as const }],
        allocations: [{ goalId: 'g-invest-ars', percentage: '50.00' }],
        savingContributions: [],
        investmentContributions: [
          { amount: 'invalid', currency: 'ARS', createdAt: '2026-07-12T00:00:00.000Z' },
        ],
      }

      expect(derivePreviousMonthShortfalls(input)).toEqual([
        { kind: 'investment', currency: 'ARS', amount: { amount: '50000.00', currency: 'ARS' } },
      ])
    })

    it('aggregates multiple goals for the same kind and currency correctly', () => {
      const input = {
        closedMonth: '2026-07',
        plannedMonthlyContribution: '200000.00',
        goals: [
          { id: 'g-save-ars-1', strategy: 'save', currency: 'ARS' as const },
          { id: 'g-save-ars-2', strategy: 'save', currency: 'ARS' as const },
        ],
        allocations: [
          { goalId: 'g-save-ars-1', percentage: '25.00' },
          { goalId: 'g-save-ars-2', percentage: '25.00' },
        ],
        savingContributions: [
          { amount: '40000.00', currency: 'ARS', createdAt: '2026-07-10T00:00:00.000Z' },
        ],
        investmentContributions: [],
      }

      // Expected: 200000 * 50% = 100000 ARS. Actual: 40000 ARS. Shortfall: 60000.00 ARS
      expect(derivePreviousMonthShortfalls(input)).toEqual([
        { kind: 'saving', currency: 'ARS', amount: { amount: '60000.00', currency: 'ARS' } },
      ])
    })
  })
})
