import { describe, expect, it } from 'vitest'
import { INITIAL_GOAL_NAMES, deriveInitialGoal, parseInitialPlan } from './financial'

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
        targetAmount: { amount: '750000.00', currency: 'ARS' },
        emergencyFundMonths: 6,
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
        emergencyFundMonths: 6,
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
        emergencyFundMonths: undefined,
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
        emergencyFundMonths: undefined,
      })
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

    it('requires a positive planned monthly contribution', () => {
      expect(() =>
        parseInitialPlan({
          goalKind: 'emergency_fund',
          income: '100.000',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '0',
          fixedTarget: '',
        }),
      ).toThrow('Ingresá un aporte mensual mayor a cero.')

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

  describe('INITIAL_GOAL_NAMES', () => {
    it('has exact Spanish names for each goal kind', () => {
      expect(INITIAL_GOAL_NAMES.emergency_fund).toBe('Colchón financiero')
      expect(INITIAL_GOAL_NAMES.fixed_savings).toBe('Quiero ahorrar cierta suma de dinero')
      expect(INITIAL_GOAL_NAMES.car).toBe('Quiero cambiar el auto')
    })
  })
})
