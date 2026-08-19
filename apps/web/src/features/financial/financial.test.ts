import { describe, expect, it } from 'vitest'
import {
  INITIAL_GOAL_NAMES,
  PLANNING_ARS_PER_USD,
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  deriveInitialChannel,
  deriveInitialGoal,
  getNextCalendarMonth,
  parseInitialPlan,
  projectCompletionMonth,
} from './financial'

describe('initial financial plan domain rules', () => {
  describe('parseInitialPlan and deriveInitialGoal', () => {
    it('allows zero income and derives a six-month emergency target from known expenses', () => {
      const plan = parseInitialPlan({
        goalKind: 'emergency_fund',
        income: '0',
        expensesKnowledge: 'known',
        expenses: '125.000',
        plannedContribution: '20.000',
        fixedTarget: '',
      })

      expect(plan).toEqual({
        goalKind: 'emergency_fund',
        income: { amount: '0.00', currency: 'ARS' },
        expensesKnowledge: 'known',
        expenses: { amount: '125000.00', currency: 'ARS' },
        plannedContribution: { amount: '20000.00', currency: 'ARS' },
        fixedTarget: undefined,
      })

      expect(deriveInitialGoal(plan)).toEqual({
        type: 'emergency_fund',
        name: 'Colchón financiero',
        targetAmount: undefined,
        currency: 'USD',
        emergencyFundMonths: 6,
        saveEnabled: true,
        investEnabled: false,
      })
    })

    it('omits an emergency target when expenses are unknown', () => {
      const plan = parseInitialPlan({
        goalKind: 'emergency_fund',
        income: '1',
        expensesKnowledge: 'unknown',
        expenses: '999.000',
        plannedContribution: '1',
        fixedTarget: '',
      })

      expect(plan.expenses).toBeUndefined()
      expect(deriveInitialGoal(plan)).toEqual({
        type: 'emergency_fund',
        name: 'Colchón financiero',
        targetAmount: undefined,
        currency: 'USD',
        emergencyFundMonths: 6,
        saveEnabled: true,
        investEnabled: false,
      })
    })

    it('derives fixed savings goal target and name', () => {
      const plan = parseInitialPlan({
        goalKind: 'fixed_savings',
        income: '500.000',
        expensesKnowledge: 'unknown',
        expenses: '',
        plannedContribution: '50.000',
        fixedTarget: '300.000',
      })

      expect(deriveInitialGoal(plan)).toEqual({
        type: 'fixed_savings',
        name: 'Quiero ahorrar cierta suma de dinero',
        targetAmount: { amount: '300000.00', currency: 'ARS' },
        currency: 'ARS',
        emergencyFundMonths: undefined,
        saveEnabled: true,
        investEnabled: false,
      })
    })

    it('derives car goal target and name', () => {
      const plan = parseInitialPlan({
        goalKind: 'car',
        income: '1.200.000',
        expensesKnowledge: 'known',
        expenses: '600.000',
        plannedContribution: '150.000',
        fixedTarget: '15.000.000',
      })

      expect(deriveInitialGoal(plan)).toEqual({
        type: 'car',
        name: 'Quiero cambiar el auto',
        targetAmount: { amount: '15000000.00', currency: 'ARS' },
        currency: 'ARS',
        emergencyFundMonths: undefined,
        saveEnabled: true,
        investEnabled: false,
      })
    })

    it.each([
      ['emergency_fund', 'USD'],
      ['fixed_savings', 'ARS'],
      ['car', 'ARS'],
    ] as const)('derives the save channel for %s', (goalKind, destinationCurrency) => {
      const plan = parseInitialPlan({
        goalKind,
        income: '500.000',
        expensesKnowledge: 'unknown',
        plannedContribution: '75.000',
        fixedTarget: goalKind === 'emergency_fund' ? '' : '1.000.000',
      })

      expect(deriveInitialChannel(plan, new Date('2026-08-19T12:00:00Z'))).toEqual({
        fundingMethod: 'save',
        destinationCurrency,
        monthlyCommitment: { amount: '75000.00', currency: 'ARS' },
        effectiveMonth: '2026-09',
      })
    })

    it('converts the emergency target and monthly commitment at the planning rate', () => {
      expect(PLANNING_ARS_PER_USD).toBe('1500')
      expect(deriveEmergencyFundTarget({ amount: '250000.00', currency: 'ARS' }, 6)).toEqual({
        amount: '1000.00',
        currency: 'USD',
      })
      expect(
        convertCommitmentToDestination(
          { amount: '50000.00', currency: 'ARS' },
          'USD',
        ),
      ).toEqual({ amount: '33.33', currency: 'USD' })
    })

    it('keeps an ARS commitment unchanged for an ARS channel', () => {
      expect(
        convertCommitmentToDestination(
          { amount: '50000.00', currency: 'ARS' },
          'ARS',
        ),
      ).toEqual({ amount: '50000.00', currency: 'ARS' })
    })

    it.each(['fixed_savings', 'car'] as const)('requires a positive fixed target for %s', (goalKind) => {
      expect(() =>
        parseInitialPlan({
          goalKind,
          income: '1',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '1',
          fixedTarget: '0',
        }),
      ).toThrow('Ingresá un monto objetivo mayor a cero.')

      expect(() =>
        parseInitialPlan({
          goalKind,
          income: '1',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '1',
          fixedTarget: '',
        }),
      ).toThrow('Ingresá un monto objetivo mayor a cero.')
    })

    it('accepts a zero planned monthly contribution but rejects an empty one', () => {
      expect(
        parseInitialPlan({
          goalKind: 'emergency_fund',
          income: '0',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '0',
          fixedTarget: '',
        }).plannedContribution.amount,
      ).toBe('0.00')

      expect(() =>
        parseInitialPlan({
          goalKind: 'emergency_fund',
          income: '100.000',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '',
          fixedTarget: '',
        }),
      ).toThrow('Ingresá un aporte mensual mayor a cero.')
    })

    it('requires expenses when expensesKnowledge is known', () => {
      expect(() =>
        parseInitialPlan({
          goalKind: 'emergency_fund',
          income: '100.000',
          expensesKnowledge: 'known',
          expenses: '',
          plannedContribution: '10.000',
          fixedTarget: '',
        }),
      ).toThrow('Ingresá tus gastos mensuales aproximados.')

      expect(() =>
        parseInitialPlan({
          goalKind: 'emergency_fund',
          income: '100.000',
          expensesKnowledge: 'known',
          expenses: 'invalid',
          plannedContribution: '10.000',
          fixedTarget: '',
        }),
      ).toThrow('Ingresá tus gastos mensuales aproximados.')
    })

    it('requires approximate monthly income', () => {
      expect(() =>
        parseInitialPlan({
          goalKind: 'emergency_fund',
          income: '',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '10.000',
          fixedTarget: '',
        }),
      ).toThrow('Ingresá tus ingresos mensuales aproximados.')

      expect(() =>
        parseInitialPlan({
          goalKind: 'emergency_fund',
          income: 'invalid',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '10.000',
          fixedTarget: '',
        }),
      ).toThrow('Ingresá tus ingresos mensuales aproximados.')
    })
  })

  describe('projectCompletionMonth', () => {
    it('returns the month containing the final contribution', () => {
      expect(
        projectCompletionMonth(
          { amount: '1000.00', currency: 'USD' },
          { amount: '250.00', currency: 'USD' },
          '2026-09',
        ),
      ).toEqual({ status: 'available', completionMonth: '2026-12' })
    })

    it('returns outside_horizon for zero commitments and projections beyond 720 months', () => {
      expect(
        projectCompletionMonth(
          { amount: '1000.00', currency: 'USD' },
          { amount: '0.00', currency: 'USD' },
          '2026-09',
        ),
      ).toEqual({ status: 'outside_horizon' })

      expect(
        projectCompletionMonth(
          { amount: '721.00', currency: 'USD' },
          { amount: '1.00', currency: 'USD' },
          '2026-09',
        ),
      ).toEqual({ status: 'outside_horizon' })
    })

    it('uses the first day of the next UTC calendar month', () => {
      expect(getNextCalendarMonth(new Date('2026-12-31T23:59:59Z'))).toBe('2027-01')
    })
  })

  describe('INITIAL_GOAL_NAMES', () => {
    it('has exact Spanish names for each goal kind', () => {
      expect(INITIAL_GOAL_NAMES.emergency_fund).toBe('Colchón financiero')
      expect(INITIAL_GOAL_NAMES.fixed_savings).toBe('Quiero ahorrar cierta suma de dinero')
      expect(INITIAL_GOAL_NAMES.car).toBe('Quiero cambiar el auto')
    })
  })
})
