import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import { getInitialHomeState } from './repository.server'

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
    },
  },
}))

describe('financial repository.server getInitialHomeState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('evaluates previous month shortfalls when an applicable snapshot exists', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z')

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
      userId: 'user_1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '500000.00',
      approximateMonthlyExpenses: '250000.00',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '30000.00',
    } as never)

    vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
      id: 'goal_1',
      userId: 'user_1',
      name: 'Colchón financiero',
      type: 'emergency_fund',
      targetAmount: null,
      currency: 'USD',
      emergencyFundMonths: 6,
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
    expect(home?.previousMonthShortfalls).toEqual([
      { kind: 'saving', currency: 'USD', amount: { amount: '20.00', currency: 'USD' } },
    ])
  })

  it('returns empty previousMonthShortfalls for a legacy snapshot with null plannedMonthlyContribution', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z')

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
      userId: 'user_legacy',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '500000.00',
      approximateMonthlyExpenses: null,
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
      approximateMonthlyIncome: '500000.00',
      approximateMonthlyExpenses: null,
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
})
