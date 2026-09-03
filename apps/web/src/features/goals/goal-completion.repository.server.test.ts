import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
  goalCompletionWithdrawals,
  savingsPlaces,
} from '../../db/schema'
import {
  confirmGoalCompletionInRepository,
  createGoalCompletionPreviewToken,
  getGoalCompletionState,
  GoalCompletionStateInvalidError,
  StaleGoalCompletionPreviewError,
} from './goal-completion.repository.server'
import { buildGoalCompletionProposal } from './goal-completion'

const profile = {
  userId: 'user_1',
  baseCurrency: 'ARS',
  expensesKnowledge: 'unknown',
  plannedMonthlyContribution: '60000.00',
  goalDedicationPercentage: '90.00',
  onboardingCompleted: true,
}

const goal = {
  id: 'goal_1',
  userId: 'user_1',
  name: 'Auto',
  type: 'purchase',
  targetAmount: '100.00',
  currency: 'USD',
  priority: 'high',
  strategy: 'save',
  status: 'active',
  desiredDate: null,
  completedAt: null,
  emergencyFundMonths: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

const places = [
  { id: 'place_1', userId: 'user_1', name: 'Banco', normalizedName: 'banco' },
  { id: 'place_2', userId: 'user_1', name: 'Billetera', normalizedName: 'billetera' },
]

const otherGoal = {
  ...goal,
  id: 'goal_2',
  name: 'Viaje',
  targetAmount: '500.00',
}

const { query, tx } = vi.hoisted(() => {
  const query = {
    financialProfiles: { findFirst: vi.fn() },
    financialGoals: { findMany: vi.fn() },
    incomes: { findMany: vi.fn() },
    expenses: { findMany: vi.fn() },
    goalSavingsPositions: { findMany: vi.fn() },
    goalInvestmentPositions: { findMany: vi.fn() },
    allocationPlanSnapshots: { findMany: vi.fn(), findFirst: vi.fn() },
    allocationPlanEntries: { findMany: vi.fn() },
    savingsPlaces: { findMany: vi.fn() },
    savingContributions: { findMany: vi.fn() },
    savingsPlaceTransfers: { findMany: vi.fn() },
    goalCompletionWithdrawals: { findMany: vi.fn() },
  }
  return { query, tx: { query, select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() } }
})

vi.mock('../../db/client', () => ({
  db: {
    query,
    transaction: vi.fn((callback) => callback(tx)),
  },
}))

function setup() {
  vi.clearAllMocks()
  query.financialProfiles.findFirst.mockResolvedValue(profile)
  query.financialGoals.findMany.mockResolvedValue([goal])
  query.incomes.findMany.mockResolvedValue([])
  query.expenses.findMany.mockResolvedValue([])
  query.goalSavingsPositions.findMany.mockResolvedValue([
    { id: 'position_1', goalId: 'goal_1', amount: '100.00', currency: 'USD' },
  ])
  query.goalInvestmentPositions.findMany.mockResolvedValue([])
  query.allocationPlanSnapshots.findMany.mockResolvedValue([])
  query.allocationPlanEntries.findMany.mockResolvedValue([])
  query.savingsPlaces.findMany.mockResolvedValue(places)
  query.savingContributions.findMany.mockResolvedValue([
    { id: 'contribution_1', userId: 'user_1', placeId: 'place_1', amount: '80.00', currency: 'USD', createdAt: new Date() },
    { id: 'contribution_2', userId: 'user_1', placeId: 'place_2', amount: '50.00', currency: 'USD', createdAt: new Date() },
  ])
  query.savingsPlaceTransfers.findMany.mockResolvedValue([
    { id: 'transfer_1', userId: 'user_1', fromPlaceId: 'place_1', toPlaceId: 'place_2', amount: '10.00', currency: 'USD', createdAt: new Date() },
  ])
  query.goalCompletionWithdrawals.findMany.mockResolvedValue([
    { id: 'withdrawal_1', goalId: 'goal_1', placeId: 'place_2', amount: '5.00', currency: 'USD', createdAt: new Date() },
  ])
  tx.select.mockImplementation(() => ({
    from: vi.fn((table: unknown) => ({
      where: vi.fn(() => ({
        for: vi.fn().mockResolvedValue(table === financialProfiles ? [profile] : [places[0]]),
      })),
    })),
  }))
}

const completionDraft = {
  goalId: 'goal_1',
  withdrawals: [
    { placeId: 'place_1', amount: '70.00' },
    { placeId: 'place_2', amount: '30.00' },
  ],
  allocations: [],
}

const staleCases = [
  {
    name: 'goal status',
    prepare: () => query.financialGoals.findMany.mockResolvedValue([goal, otherGoal]),
    mutate: () => query.financialGoals.findMany.mockResolvedValue([goal, { ...otherGoal, status: 'paused' }]),
  },
  {
    name: 'place balance',
    prepare: () => undefined,
    mutate: () => query.savingContributions.findMany.mockResolvedValue([
      { id: 'contribution_1', userId: 'user_1', placeId: 'place_1', amount: '90.00', currency: 'USD', createdAt: new Date() },
      { id: 'contribution_2', userId: 'user_1', placeId: 'place_2', amount: '50.00', currency: 'USD', createdAt: new Date() },
    ]),
  },
  {
    name: 'pending plan',
    prepare: () => undefined,
    mutate: () => {
      query.allocationPlanSnapshots.findMany.mockResolvedValue([
        { id: 'pending_1', userId: 'user_1', effectiveMonth: '2026-09-01', createdAt: new Date() },
      ])
      query.allocationPlanEntries.findMany.mockResolvedValue([
        { id: 'allocation_1', snapshotId: 'pending_1', goalId: 'goal_1', percentage: '100.00' },
      ])
    },
  },
]

const invalidStaleCases = [
  {
    name: 'lowered place balance',
    mutate: () => query.savingContributions.findMany.mockResolvedValue([
      { id: 'contribution_1', userId: 'user_1', placeId: 'place_1', amount: '50.00', currency: 'USD', createdAt: new Date() },
      { id: 'contribution_2', userId: 'user_1', placeId: 'place_2', amount: '50.00', currency: 'USD', createdAt: new Date() },
    ]),
  },
  {
    name: 'ineligible goal',
    mutate: () => query.financialGoals.findMany.mockResolvedValue([{ ...goal, status: 'paused' }]),
  },
]

describe('goal-completion.repository.server', () => {
  beforeEach(setup)

  it('loads positive owned places after transfers and prior withdrawals', async () => {
    const state = await getGoalCompletionState('user_1', '2026-08', 'goal_1')

    expect(state?.savingsPlaces).toEqual([
      { id: 'place_1', name: 'Banco', balance: { amount: '70.00', currency: 'USD' } },
      { id: 'place_2', name: 'Billetera', balance: { amount: '55.00', currency: 'USD' } },
    ])
    const withdrawalWhere = query.goalCompletionWithdrawals.findMany.mock.calls[0][0].where
    expect(withdrawalWhere({ placeId: 'placeId', goalId: 'goalId' }, { and: vi.fn((...args) => args), inArray: vi.fn((column, values) => ({ column, values })) })).toHaveLength(2)
  })

  it('rejects an unowned or missing goal with the generic error', async () => {
    await expect(getGoalCompletionState('user_1', '2026-08', 'other-goal')).rejects.toThrow('Objetivo no encontrado.')
  })

  it('returns a sha256 completion token and reports stale confirmations before writes', async () => {
    const state = await getGoalCompletionState('user_1', '2026-08', 'goal_1')
    const draft = { goalId: 'goal_1', withdrawals: [{ placeId: 'place_1', amount: '70.00' }, { placeId: 'place_2', amount: '30.00' }], allocations: [] }
    const token = createGoalCompletionPreviewToken(state!, '2026-08', draft)

    expect(token).toMatch(/^[a-f0-9]{64}$/)
    const staleError = await confirmGoalCompletionInRepository({ userId: 'user_1', currentMonth: '2026-08', draft, previewToken: 'f'.repeat(64) }).catch((error: unknown) => error)
    expect(staleError).toBeInstanceOf(StaleGoalCompletionPreviewError)
    if (!(staleError instanceof StaleGoalCompletionPreviewError)) throw staleError
    expect(staleError.code).toBe('STALE_GOAL_COMPLETION_PREVIEW')
    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it.each(staleCases)('returns the refreshed proposal and token when $name changes', async ({ prepare, mutate }) => {
    prepare()
    const state = await getGoalCompletionState('user_1', '2026-08', 'goal_1')
    const token = createGoalCompletionPreviewToken(state!, '2026-08', completionDraft)
    mutate()

    const refreshedState = await getGoalCompletionState('user_1', '2026-08', 'goal_1')
    const refreshedProposal = buildGoalCompletionProposal({
      state: refreshedState!,
      currentMonth: '2026-08',
      draft: completionDraft,
    })
    const refreshedToken = createGoalCompletionPreviewToken(refreshedState!, '2026-08', completionDraft)

    const error = await confirmGoalCompletionInRepository({
      userId: 'user_1',
      currentMonth: '2026-08',
      draft: completionDraft,
      previewToken: token,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(StaleGoalCompletionPreviewError)
    if (!(error instanceof StaleGoalCompletionPreviewError)) throw error
    expect(error.code).toBe('STALE_GOAL_COMPLETION_PREVIEW')
    expect(error.refreshedPreview).toEqual({ proposal: refreshedProposal, previewToken: refreshedToken })
    expect(tx.insert).not.toHaveBeenCalled()
    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.delete).not.toHaveBeenCalled()
  })

  it.each(invalidStaleCases)('returns a safe invalid-state error when stale $name prevents a refreshed proposal', async ({ mutate }) => {
    const state = await getGoalCompletionState('user_1', '2026-08', 'goal_1')
    const token = createGoalCompletionPreviewToken(state!, '2026-08', completionDraft)
    mutate()

    const error = await confirmGoalCompletionInRepository({
      userId: 'user_1',
      currentMonth: '2026-08',
      draft: completionDraft,
      previewToken: token,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(GoalCompletionStateInvalidError)
    if (!(error instanceof GoalCompletionStateInvalidError)) throw error
    expect(error.code).toBe('INVALID_GOAL_COMPLETION_STATE')
    expect(error.message).toBe('No se puede completar el objetivo con el estado actual.')
    expect('refreshedPreview' in error).toBe(false)
    expect(tx.insert).not.toHaveBeenCalled()
    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.delete).not.toHaveBeenCalled()
  })

  it('locks selected savings places in sorted ID order before stale validation', async () => {
    const lockedPlaceIds: unknown[] = []
    const lockedTables: unknown[] = []
    tx.select.mockImplementation(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn((condition: any) => {
          lockedTables.push(table)
          if (table === savingsPlaces) {
            const nested = condition.queryChunks[1].queryChunks[0].queryChunks[3]
            lockedPlaceIds.push(nested.value)
          }
           return { for: vi.fn().mockResolvedValue(table === financialProfiles ? [profile] : table === financialGoals ? [goal] : [places[0]]) }
        }),
      })),
    }))

    await expect(
      confirmGoalCompletionInRepository({
        userId: 'user_1',
        currentMonth: '2026-08',
        draft: { ...completionDraft, withdrawals: [...completionDraft.withdrawals].reverse() },
        previewToken: 'f'.repeat(64),
      }),
    ).rejects.toBeInstanceOf(StaleGoalCompletionPreviewError)

    expect(lockedPlaceIds).toEqual(['place_1', 'place_2'])
     expect(lockedTables).toEqual([financialProfiles, financialGoals, savingsPlaces, savingsPlaces])
     expect(tx.insert).not.toHaveBeenCalled()
     expect(tx.update).not.toHaveBeenCalled()
   })

    it('rejects a missing owned target goal after locking the profile and before places', async () => {
      const lockedTables: unknown[] = []
      tx.select.mockImplementation(() => ({
       from: vi.fn((table: unknown) => ({
         where: vi.fn(() => {
           lockedTables.push(table)
           return { for: vi.fn().mockResolvedValue(table === financialProfiles ? [profile] : table === financialGoals ? [] : [places[0]]) }
         }),
       })),
     }))

     await expect(
       confirmGoalCompletionInRepository({
         userId: 'user_1',
         currentMonth: '2026-08',
         draft: completionDraft,
         previewToken: 'f'.repeat(64),
       }),
     ).rejects.toThrow('Objetivo no encontrado.')

     expect(lockedTables).toEqual([financialProfiles, financialGoals])
     expect(tx.insert).not.toHaveBeenCalled()
      expect(tx.update).not.toHaveBeenCalled()
    })

    it('returns an invalid-state error when the locked target is no longer active', async () => {
      const lockedTables: unknown[] = []
      const state = await getGoalCompletionState('user_1', '2026-08', 'goal_1')
      const previewToken = createGoalCompletionPreviewToken(state!, '2026-08', completionDraft)
      query.financialGoals.findMany.mockResolvedValue([{ ...goal, status: 'paused' }])
      tx.select.mockImplementation(() => ({
        from: vi.fn((table: unknown) => ({
          where: vi.fn((condition: any) => {
            lockedTables.push(table)
            const containsValue = (chunk: any, value: string): boolean =>
              chunk?.value === value || Boolean(chunk?.queryChunks?.some((nested: any) => containsValue(nested, value)))
            const hasActivePredicate = containsValue(condition, 'active')
            return {
              for: vi.fn().mockResolvedValue(
                table === financialProfiles
                  ? [profile]
                  : table === financialGoals
                    ? (hasActivePredicate ? [] : [{ ...goal, status: 'paused' }])
                    : [places[0]],
              ),
            }
          }),
        })),
      }))

      await expect(
        confirmGoalCompletionInRepository({
          userId: 'user_1',
          currentMonth: '2026-08',
          draft: completionDraft,
          previewToken,
        }),
      ).rejects.toBeInstanceOf(GoalCompletionStateInvalidError)

      expect(lockedTables).toEqual([financialProfiles, financialGoals, savingsPlaces, savingsPlaces])
      expect(tx.insert).not.toHaveBeenCalled()
      expect(tx.update).not.toHaveBeenCalled()
      expect(tx.delete).not.toHaveBeenCalled()
    })

   it('rejects a selected foreign place before loading or writing completion data', async () => {
     tx.select.mockImplementationOnce(() => ({
       from: vi.fn(() => ({
         where: vi.fn(() => ({ for: vi.fn().mockResolvedValue([profile]) })),
       })),
     })).mockImplementationOnce(() => ({
       from: vi.fn(() => ({
         where: vi.fn(() => ({ for: vi.fn().mockResolvedValue([goal]) })),
       })),
     })).mockImplementationOnce(() => ({
       from: vi.fn(() => ({
         where: vi.fn(() => ({ for: vi.fn().mockResolvedValue([]) })),
      })),
    }))

    await expect(
      confirmGoalCompletionInRepository({
        userId: 'user_1',
        currentMonth: '2026-08',
        draft: { goalId: 'goal_1', withdrawals: [{ placeId: 'foreign-place', amount: '100.00' }], allocations: [] },
        previewToken: 'f'.repeat(64),
      }),
    ).rejects.toThrow('Lugar de ahorro no encontrado.')
    expect(tx.update).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalled()
  })

  it('persists exact withdrawals, completion status, and the next plan atomically', async () => {
    const insertedValues = vi.fn()
    const updatedValues = vi.fn()
    const goalReturning = vi.fn().mockResolvedValue([{ id: 'goal_1' }])
    tx.select.mockImplementation(() => ({
      from: vi.fn((table: unknown) => ({
           where: vi.fn(() => ({
           for: vi.fn().mockResolvedValue(table === financialProfiles ? [profile] : table === financialGoals ? [goal] : [places[0]])
         })),
      })),
    }))
    tx.insert.mockImplementation(() => ({
      values: insertedValues.mockImplementation((_values) => ({ returning: vi.fn().mockResolvedValue([{ id: 'snapshot_1' }]) })),
    }))
    tx.update.mockReturnValue({ set: updatedValues.mockImplementation(() => ({ where: vi.fn(() => ({ returning: goalReturning })) })) })
    tx.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })

    const state = await getGoalCompletionState('user_1', '2026-08', 'goal_1')
    const draft = { goalId: 'goal_1', withdrawals: [{ placeId: 'place_1', amount: '70.00' }, { placeId: 'place_2', amount: '30.00' }], allocations: [] }
    const token = createGoalCompletionPreviewToken(state!, '2026-08', draft)
    const result = await confirmGoalCompletionInRepository({ userId: 'user_1', currentMonth: '2026-08', draft, previewToken: token })

    expect(tx.insert).toHaveBeenCalledWith(goalCompletionWithdrawals)
    expect(tx.update).toHaveBeenCalledWith(financialGoals)
    expect(tx.delete).toHaveBeenCalledWith(allocationPlanEntries)
    expect(tx.insert).not.toHaveBeenCalledWith(allocationPlanEntries)
    expect(tx.update).toHaveBeenCalledWith(financialProfiles)
    expect(goalReturning).toHaveBeenCalledWith({ id: financialGoals.id })
    expect(insertedValues.mock.calls[0][0]).toEqual([
      expect.objectContaining({ goalId: 'goal_1', placeId: 'place_1', amount: '70.00', currency: 'USD', createdAt: expect.any(Date) }),
      expect.objectContaining({ goalId: 'goal_1', placeId: 'place_2', amount: '30.00', currency: 'USD', createdAt: expect.any(Date) }),
    ])
    expect(insertedValues.mock.calls[0][0][0].createdAt).toBe(insertedValues.mock.calls[0][0][1].createdAt)
    expect(updatedValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', completedAt: insertedValues.mock.calls[0][0][0].createdAt }))
    expect(result).toEqual({ completedAt: insertedValues.mock.calls[0][0][0].createdAt.toISOString() })
    expect(insertedValues.mock.calls[1][0]).toEqual({
      userId: 'user_1',
      effectiveMonth: '2026-09-01',
      plannedMonthlyContribution: null,
    })
  })

  it('propagates a write failure so the surrounding transaction can roll back', async () => {
    const state = await getGoalCompletionState('user_1', '2026-08', 'goal_1')
    const draft = { goalId: 'goal_1', withdrawals: [{ placeId: 'place_1', amount: '70.00' }, { placeId: 'place_2', amount: '30.00' }], allocations: [] }
    const token = createGoalCompletionPreviewToken(state!, '2026-08', draft)
    tx.insert.mockImplementationOnce(() => {
      throw new Error('database failure')
    })

    await expect(
      confirmGoalCompletionInRepository({ userId: 'user_1', currentMonth: '2026-08', draft, previewToken: token }),
    ).rejects.toThrow('database failure')
  })

  it('throws before plan writes when the active goal update affects no rows', async () => {
    const state = await getGoalCompletionState('user_1', '2026-08', 'goal_1')
    tx.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
      })),
    })

    await expect(
      confirmGoalCompletionInRepository({
        userId: 'user_1',
        currentMonth: '2026-08',
        draft: completionDraft,
        previewToken: createGoalCompletionPreviewToken(state!, '2026-08', completionDraft),
      }),
    ).rejects.toThrow('Objetivo no encontrado.')

    expect(tx.insert).toHaveBeenCalledWith(goalCompletionWithdrawals)
    expect(tx.delete).not.toHaveBeenCalled()
    expect(tx.insert).not.toHaveBeenCalledWith(allocationPlanSnapshots)
    expect(tx.insert).not.toHaveBeenCalledWith(allocationPlanEntries)
  })
})
