import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  expenses,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
  incomes,
} from '../../db/schema'
import { getInitialHomeState, persistFinancialOnboarding } from './repository.server'

vi.mock('../../db/client', () => ({
  db: {
    transaction: vi.fn(),
    query: {
      financialProfiles: {
        findFirst: vi.fn(),
      },
      financialGoals: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      allocationPlanSnapshots: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      allocationPlanEntries: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      savingContributions: {
        findMany: vi.fn(),
      },
      investmentContributions: {
        findMany: vi.fn(),
      },
      incomes: {
        findMany: vi.fn(),
      },
      expenses: {
        findMany: vi.fn(),
      },
    },
  },
}))

describe('financial repository.server getInitialHomeState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.query.incomes.findMany).mockResolvedValue([
      { amount: '500000.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-01-01' },
    ] as never)
    vi.mocked(db.query.expenses.findMany).mockResolvedValue([] as never)
  })

  it('evaluates previous month shortfalls when an applicable snapshot exists', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z')

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
      userId: 'user_1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '30000.00',
    } as never)

    vi.mocked(db.query.expenses.findMany).mockResolvedValue([
      {
        amount: '250000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-01-01',
        endMonth: null,
      },
      {
        amount: '100000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-09-01',
        endMonth: null,
      },
    ] as never)

    vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
      id: 'goal_1',
      userId: 'user_1',
      name: 'Colchón financiero',
      type: 'emergency_fund',
      targetAmount: null,
      currency: 'USD',
      emergencyFundMonths: null,
      strategy: 'save',
    } as never)

    vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
      id: 'snapshot_1',
      userId: 'user_1',
      effectiveMonth: '2026-07-01',
      plannedMonthlyContribution: '30000.00',
    } as never)

    vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
      snapshotId: 'snapshot_1',
      goalId: 'goal_1',
      percentage: '100.00',
    } as never)

    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([
      {
        id: 'snapshot_1',
        userId: 'user_1',
        effectiveMonth: '2026-07-01',
        plannedMonthlyContribution: '30000.00',
      },
    ] as never)

    vi.mocked(db.query.allocationPlanEntries.findMany).mockResolvedValue([
      {
        id: 'entry_1',
        snapshotId: 'snapshot_1',
        goalId: 'goal_1',
        percentage: '100.00',
      },
    ] as never)

    vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([
      {
        id: 'goal_1',
        userId: 'user_1',
        name: 'Colchón financiero',
        type: 'emergency_fund',
        currency: 'USD',
        strategy: 'save',
      },
    ] as never)

    vi.mocked(db.query.savingContributions.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.investmentContributions.findMany).mockResolvedValue([] as never)

    const home = await getInitialHomeState('user_1', fixedNow)
    expect(home).not.toBeNull()
    expect(home).not.toHaveProperty('projection')
    expect(home?.expenses).toEqual({ amount: '250000.00', currency: 'ARS' })
    expect(home?.goal.targetAmount).toEqual({ amount: '500.00', currency: 'USD' })
    expect(home?.goal.emergencyFundMonths).toBe(3)
    expect(home?.previousMonthShortfalls).toEqual([
      { kind: 'saving', currency: 'USD', amount: { amount: '20.00', currency: 'USD' } },
    ])
  })

  it('returns empty previousMonthShortfalls for a legacy snapshot with null plannedMonthlyContribution', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z')

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
      userId: 'user_legacy',
      baseCurrency: 'ARS',
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '50000.00',
    } as never)

    vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
      id: 'goal_legacy',
      userId: 'user_legacy',
      name: 'Colchón financiero',
      type: 'emergency_fund',
      targetAmount: null,
      currency: 'USD',
      emergencyFundMonths: 6,
      strategy: 'save',
    } as never)

    vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
      id: 'snapshot_legacy',
      userId: 'user_legacy',
      effectiveMonth: '2026-06-01',
      plannedMonthlyContribution: null,
    } as never)

    vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
      snapshotId: 'snapshot_legacy',
      goalId: 'goal_legacy',
      percentage: '100.00',
    } as never)

    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([
      {
        id: 'snapshot_legacy',
        userId: 'user_legacy',
        effectiveMonth: '2026-06-01',
        plannedMonthlyContribution: null,
      },
    ] as never)

    const legacyHome = await getInitialHomeState('user_legacy', fixedNow)
    expect(legacyHome).not.toBeNull()
    expect(legacyHome?.previousMonthShortfalls).toEqual([])
  })

  it('returns empty previousMonthShortfalls when no snapshot is effective on or before closed month', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z')

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
      userId: 'user_future',
      baseCurrency: 'ARS',
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '50000.00',
    } as never)

    vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
      id: 'goal_1',
      userId: 'user_future',
      name: 'Colchón financiero',
      type: 'emergency_fund',
      targetAmount: null,
      currency: 'USD',
      emergencyFundMonths: 6,
      strategy: 'save',
    } as never)

    vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
      id: 'snapshot_future',
      userId: 'user_future',
      effectiveMonth: '2026-08-01',
      plannedMonthlyContribution: '50000.00',
    } as never)

    vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
      snapshotId: 'snapshot_future',
      goalId: 'goal_1',
      percentage: '100.00',
    } as never)

    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([
      {
        id: 'snapshot_future',
        userId: 'user_future',
        effectiveMonth: '2026-08-01',
        plannedMonthlyContribution: '50000.00',
      },
    ] as never)

    const home = await getInitialHomeState('user_future', fixedNow)
    expect(home).not.toBeNull()
    expect(home?.previousMonthShortfalls).toEqual([])
  })

  it('uses recurring incomes in the current month instead of the onboarding approximation', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z')
    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
      userId: 'user_income',
      baseCurrency: 'ARS',
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '50000.00',
    } as never)
    vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
      id: 'goal_income', userId: 'user_income', name: 'Meta', type: 'fixed_savings',
      targetAmount: '1000000.00', currency: 'ARS', emergencyFundMonths: null, strategy: 'save',
    } as never)
    vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
      id: 'snapshot_income', userId: 'user_income', effectiveMonth: '2026-08-01', plannedMonthlyContribution: '50000.00',
    } as never)
    vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
      snapshotId: 'snapshot_income', goalId: 'goal_income', percentage: '100.00',
    } as never)
    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.incomes.findMany).mockResolvedValue([
      { amount: '100000.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-08-01' },
      { amount: '100.00', currency: 'USD', recurring: true, effectiveMonth: '2026-08-01' },
      { amount: '900000.00', currency: 'ARS', recurring: false, effectiveMonth: '2026-08-01' },
    ] as never)

    const home = await getInitialHomeState('user_income', fixedNow)
    expect(home?.income).toEqual({ amount: '250000.00', currency: 'ARS' })
  })

  it('returns null when the user has no financial profile', async () => {
    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined)

    await expect(getInitialHomeState('user_missing', new Date('2026-08-15T12:00:00Z'))).resolves.toBeNull()
    expect(db.query.incomes.findMany).not.toHaveBeenCalled()
  })

  it('returns null when the user has no goal, snapshot, or allocation', async () => {
    const profile = {
      userId: 'user_missing_data',
      baseCurrency: 'ARS',
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '50000.00',
    }
    const goal = {
      id: 'goal_missing_data',
      userId: 'user_missing_data',
      name: 'Meta',
      type: 'purchase',
      targetAmount: '1000000.00',
      currency: 'ARS',
      emergencyFundMonths: null,
      strategy: 'save',
    }
    const snapshot = {
      id: 'snapshot_missing_data',
      userId: 'user_missing_data',
      effectiveMonth: '2026-08-01',
      plannedMonthlyContribution: '50000.00',
    }

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(profile as never)
    vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue(undefined)
    await expect(getInitialHomeState('user_missing_data')).resolves.toBeNull()

    vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue(goal as never)
    vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue(undefined)
    await expect(getInitialHomeState('user_missing_data')).resolves.toBeNull()

    vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue(snapshot as never)
    vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue(undefined)
    await expect(getInitialHomeState('user_missing_data')).resolves.toBeNull()
  })

  it('uses an explicit non-emergency goal target in the home projection', async () => {
    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
      userId: 'user_target',
      baseCurrency: 'ARS',
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '50000.00',
    } as never)
    vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
      id: 'goal_target',
      userId: 'user_target',
      name: 'Meta',
      type: 'purchase',
      targetAmount: '1000000.00',
      currency: 'ARS',
      emergencyFundMonths: null,
      strategy: 'save',
    } as never)
    vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
      id: 'snapshot_target',
      userId: 'user_target',
      effectiveMonth: '2026-08-01',
      plannedMonthlyContribution: '50000.00',
    } as never)
    vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
      snapshotId: 'snapshot_target',
      goalId: 'goal_target',
      percentage: '100.00',
    } as never)
    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([] as never)

    const home = await getInitialHomeState('user_target', new Date('2026-08-15T12:00:00Z'))

    expect(home?.goal.targetAmount).toEqual({ amount: '1000000.00', currency: 'ARS' })
  })

  it('uses the goal still allocated by the latest snapshot when the oldest goal is completed', async () => {
    const oldestCompletedGoal = {
      id: 'goal_completed',
      userId: 'user_snapshot_goal',
      name: 'Objetivo completado',
      type: 'purchase',
      targetAmount: '1000000.00',
      currency: 'ARS',
      emergencyFundMonths: null,
      strategy: 'save',
      status: 'completed',
    }
    const latestGoal = {
      ...oldestCompletedGoal,
      id: 'goal_active',
      name: 'Objetivo vigente',
      status: 'active',
      targetAmount: '2000000.00',
    }
    let allocationQueried = false

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
      userId: 'user_snapshot_goal',
      baseCurrency: 'ARS',
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '50000.00',
    } as never)
    vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
      id: 'snapshot_latest',
      userId: 'user_snapshot_goal',
      effectiveMonth: '2026-08-01',
      plannedMonthlyContribution: '50000.00',
    } as never)
    vi.mocked(db.query.allocationPlanEntries.findFirst).mockImplementation((async () => {
      allocationQueried = true
      return { snapshotId: 'snapshot_latest', goalId: latestGoal.id, percentage: '100.00' }
    }) as never)
    vi.mocked(db.query.financialGoals.findFirst).mockImplementation((async () => {
      return (allocationQueried ? latestGoal : oldestCompletedGoal) as never
    }) as never)
    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([] as never)

    const home = await getInitialHomeState(
      'user_snapshot_goal',
      new Date('2026-08-15T12:00:00Z'),
    )

    expect(home?.goal.name).toBe('Objetivo vigente')
    expect(home?.goal.targetAmount).toEqual({ amount: '2000000.00', currency: 'ARS' })
  })
})

describe('persistFinancialOnboarding', () => {
  let mockTx: any
  let persistedProfile: any
  let persistedIncomes: any[]
  let persistedExpenses: any[]
  let persistedGoal: any
  let persistedInvestment: any
  let persistedSnapshot: any
  let persistedAllocation: any

  beforeEach(() => {
    persistedProfile = null
    persistedIncomes = []
    persistedExpenses = []
    persistedGoal = null
    persistedInvestment = null
    persistedSnapshot = null
    persistedAllocation = null

    mockTx = {
      insert: vi.fn((table) => {
        if (table === financialProfiles) {
          return {
            values: (val: any) => {
              persistedProfile = val
              return {
                onConflictDoNothing: () => ({
                  returning: () => [{ userId: val.userId }],
                }),
              }
            },
          }
        }
        if (table === incomes) {
          return {
            values: (val: any) => {
              persistedIncomes.push(val)
              return {
                returning: () => [{ id: `inc_${persistedIncomes.length}`, ...val }],
              }
            },
          }
        }
        if (table === expenses) {
          return {
            values: (val: any) => {
              persistedExpenses.push(val)
              return {
                returning: () => [{ id: `exp_${persistedExpenses.length}`, ...val }],
              }
            },
          }
        }
        if (table === financialGoals) {
          return {
            values: (val: any) => {
              persistedGoal = val
              return {
                returning: () => [{ id: 'goal_1', ...val }],
              }
            },
          }
        }
        if (table === goalInvestmentPositions) {
          return {
            values: (val: any) => {
              persistedInvestment = val
              return { returning: vi.fn() }
            },
          }
        }
        if (table === allocationPlanSnapshots) {
          return {
            values: (val: any) => {
              persistedSnapshot = val
              return {
                returning: () => [{ id: 'snapshot_1', ...val }],
              }
            },
          }
        }
        if (table === allocationPlanEntries) {
          return {
            values: (val: any) => {
              persistedAllocation = val
              return {
                returning: () => [{ id: 'entry_1', ...val }],
              }
            },
          }
        }
        throw new Error(`Unexpected table insert: ${table}`)
      }),
      query: {
        incomeSources: { findFirst: vi.fn() },
        expenseSources: { findFirst: vi.fn() },
      },
    }

    vi.mocked(db.transaction).mockImplementation((callback) => callback(mockTx))
  })

  const standardInput = {
    goal: {
      type: 'emergency_fund' as const,
      name: 'Fondo de emergencia',
      targetAmount: '0',
      currency: 'USD' as const,
      desiredMonth: '',
      priority: 'high' as const,
      strategy: 'save' as const,
      annualReturnRate: '0',
      availability: 'available_now' as const,
      availableFromMonth: '',
      allocations: [],
    },
    incomes: [
      {
        source: { kind: 'salary' as const },
        concept: 'Sueldo principal',
        amount: '500000.00',
        currency: 'ARS' as const,
        recurring: true,
        effectiveMonth: '2026-08',
      },
    ],
    expenses: [
      {
        source: { kind: 'housing' as const },
        concept: 'Alquiler',
        amount: '250000.00',
        currency: 'ARS' as const,
        recurring: true,
      },
    ],
  }

  it('persists profile, goal, snapshot, entries, incomes, and expenses in one transaction with 90% positive balance', async () => {
    const result = await persistFinancialOnboarding('user_1', standardInput, '2026-08')

    expect(result).toEqual({ created: true })
    expect(db.transaction).toHaveBeenCalledOnce()
    expect(persistedProfile).toMatchObject({
      userId: 'user_1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '225000.00',
      goalDedicationPercentage: '90.00',
      onboardingCompleted: true,
    })
    expect(persistedGoal).toMatchObject({
      name: 'Fondo de emergencia',
      type: 'emergency_fund',
      targetAmount: '500.00',
      currency: 'USD',
      emergencyFundMonths: 3,
      strategy: 'save',
      status: 'active',
    })
    expect(persistedSnapshot).toMatchObject({
      userId: 'user_1',
      effectiveMonth: '2026-08-01',
      plannedMonthlyContribution: '225000.00',
    })
    expect(persistedAllocation).toEqual({
      snapshotId: 'snapshot_1',
      goalId: 'goal_1',
      percentage: '100.00',
    })
    expect(persistedIncomes).toHaveLength(1)
    expect(persistedIncomes[0]).toMatchObject({
      userId: 'user_1',
      concept: 'Sueldo principal',
      amount: '500000.00',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
    })
    expect(persistedExpenses).toHaveLength(1)
    expect(persistedExpenses[0]).toMatchObject({
      userId: 'user_1',
      concept: 'Alquiler',
      amount: '250000.00',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
      endMonth: null,
    })
  })

  it('handles USD conversion for income and expenses at the planning rate', async () => {
    const usdInput = {
      ...standardInput,
      incomes: [
        {
          source: { kind: 'independent' as const },
          concept: 'Consultoría',
          amount: '200.00',
          currency: 'USD' as const,
          recurring: true,
          effectiveMonth: '2026-08',
        },
      ],
      expenses: [
        {
          source: { kind: 'subscriptions' as const },
          concept: 'Suscripciones',
          amount: '100.00',
          currency: 'USD' as const,
          recurring: true,
        },
      ],
    }

    const result = await persistFinancialOnboarding('user_1', usdInput, '2026-08')

    expect(result).toEqual({ created: true })
    expect(persistedProfile.plannedMonthlyContribution).toBe('135000.00')
    expect(persistedGoal.targetAmount).toBe('300.00')
    expect(persistedSnapshot.plannedMonthlyContribution).toBe('135000.00')
  })

  it('persists non-emergency goal target and desired date', async () => {
    const purchaseInput = {
      ...standardInput,
      goal: {
        type: 'purchase' as const,
        name: 'Auto nuevo',
        targetAmount: '5000000.00',
        currency: 'ARS' as const,
        desiredMonth: '2027-12',
        priority: 'high' as const,
        strategy: 'save' as const,
        annualReturnRate: '0',
        availability: 'available_now' as const,
        availableFromMonth: '',
        allocations: [],
      },
    }

    const result = await persistFinancialOnboarding('user_1', purchaseInput, '2026-08')

    expect(result).toEqual({ created: true })
    expect(persistedGoal).toMatchObject({
      type: 'purchase',
      name: 'Auto nuevo',
      targetAmount: '5000000.00',
      currency: 'ARS',
      desiredDate: '2027-12-01',
      emergencyFundMonths: null,
    })
  })

  it('sets contribution to zero when expenses exceed income', async () => {
    const deficitInput = {
      ...standardInput,
      incomes: [
        {
          source: { kind: 'salary' as const },
          concept: 'Sueldo principal',
          amount: '200000.00',
          currency: 'ARS' as const,
          recurring: true,
          effectiveMonth: '2026-08',
        },
      ],
      expenses: [
        {
          source: { kind: 'housing' as const },
          concept: 'Alquiler',
          amount: '300000.00',
          currency: 'ARS' as const,
          recurring: true,
        },
      ],
    }

    const result = await persistFinancialOnboarding('user_1', deficitInput, '2026-08')

    expect(result).toEqual({ created: true })
    expect(persistedProfile.plannedMonthlyContribution).toBe('0.00')
    expect(persistedSnapshot.plannedMonthlyContribution).toBe('0.00')
  })

  it('persists an investment goal with availability details', async () => {
    const investmentInput = {
      ...standardInput,
      goal: {
        ...standardInput.goal,
        type: 'purchase' as const,
        targetAmount: '1000000.00',
        currency: 'ARS' as const,
        strategy: 'invest' as const,
        availability: 'available_from' as const,
        availableFromMonth: '2027-01',
      },
    }

    const result = await persistFinancialOnboarding('user_1', investmentInput, '2026-08')

    expect(result).toEqual({ created: true })
    expect(persistedGoal.targetAmount).toBe('1000000.00')
    expect(persistedInvestment).toMatchObject({
      goalId: 'goal_1',
      currentValue: '0.00',
      currency: 'ARS',
      annualReturnRate: '0',
      availability: 'available_from',
      availableFrom: '2027-01-01',
    })
  })

  it('returns created: false on retry when financial profile already exists', async () => {
    mockTx.insert.mockImplementation((table: any) => {
      if (table === financialProfiles) {
        return {
          values: () => ({
            onConflictDoNothing: () => ({
              returning: () => [],
            }),
          }),
        }
      }
      throw new Error('Should not reach other inserts')
    })

    const result = await persistFinancialOnboarding('user_1', standardInput, '2026-08')

    expect(result).toEqual({ created: false })
  })

  it('propagates error and rolls back when an insert fails inside transaction', async () => {
    mockTx.insert.mockImplementation((table: any) => {
      if (table === financialProfiles) {
        return {
          values: () => ({
            onConflictDoNothing: () => ({
              returning: () => [{ userId: 'user_1' }],
            }),
          }),
        }
      }
      if (table === incomes) {
        throw new Error('Database disk error')
      }
      return { values: () => ({ returning: () => [{ id: '1' }] }) }
    })

    await expect(
      persistFinancialOnboarding('user_1', standardInput, '2026-08'),
    ).rejects.toThrow('Database disk error')
  })
})
