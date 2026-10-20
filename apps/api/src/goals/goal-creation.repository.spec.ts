import { describe, expect, it, vi } from 'vitest'
import { allocationPlanEntries, allocationPlanSnapshots, financialGoals, financialProfiles, goalInvestmentPositions } from '../profile/profile.schema'
import { buildGoalCreationProposal } from './goal-creation'
import { buildGoalLifecycleProposal } from './goal-lifecycle'
import { goalCreationDraftSchema } from '@repo/shared-types'
import { confirmAllocationChangeInRepository, confirmGoalCreationInRepository, confirmGoalEditInRepository, confirmGoalLifecycleInRepository, createAllocationChangePreviewToken, createGoalCreationPreviewToken, createGoalEditPreviewToken, createGoalLifecyclePreviewToken, getGoalCreationState, getGoalEditState, getGoalLifecycleState, StaleAllocationChangePreviewError, StaleGoalCreationPreviewError, StaleGoalEditPreviewError, StaleGoalLifecyclePreviewError } from './goal-creation.repository'
import { allocationChangeDraftSchema } from './allocation-change.schema'

const draft = goalCreationDraftSchema.parse({
  type: 'purchase', name: 'Auto', targetAmount: '1000', currency: 'ARS', desiredMonth: '2027-01',
  priority: 'medium', strategy: 'save', annualReturnRate: '', availability: 'available_now',
  availableFromMonth: '', allocations: [{ goalId: 'pending-goal', percentage: '100' }],
})

function stateQueries(overrides: Record<string, unknown> = {}) {
  const queries = {
    financialProfiles: { findFirst: vi.fn().mockResolvedValue({ userId: 'u', baseCurrency: 'ARS', expensesKnowledge: 'known', plannedMonthlyContribution: '100.00', goalDedicationPercentage: '90.00', onboardingCompleted: true }) },
    financialGoals: { findMany: vi.fn().mockResolvedValue([]) }, incomes: { findMany: vi.fn().mockResolvedValue([]) },
    expenses: { findMany: vi.fn().mockResolvedValue([]) }, allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue([]) },
    goalSavingsPositions: { findMany: vi.fn().mockResolvedValue([]) }, goalInvestmentPositions: { findMany: vi.fn().mockResolvedValue([]) },
    allocationPlanEntries: { findMany: vi.fn().mockResolvedValue([]) },
  }
  return Object.assign(queries, overrides)
}

describe('goal creation repository', () => {
  it('loads edit state with active and paused goals plus pending snapshot allocations', async () => {
    const queries = stateQueries({
      financialGoals: { findMany: vi.fn().mockResolvedValue([
        { id: 'active', userId: 'u', name: 'A', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', createdAt: new Date() },
        { id: 'paused', userId: 'u', name: 'P', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'paused', createdAt: new Date() },
        { id: 'completed', userId: 'u', name: 'C', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'completed', createdAt: new Date() },
      ]) },
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue([
        { id: 'current', userId: 'u', effectiveMonth: '2026-08-01' },
        { id: 'pending', userId: 'u', effectiveMonth: '2026-09-01' },
      ]) },
      allocationPlanEntries: { findMany: vi.fn().mockResolvedValue([
        { id: 'a1', snapshotId: 'current', goalId: 'active', percentage: '60.00' },
        { id: 'a2', snapshotId: 'pending', goalId: 'paused', percentage: '40.00' },
      ]) },
    })
    const state = await getGoalEditState({ query: queries } as never, 'u', '2026-08', 'paused')
    expect(state?.source.goals.map(({ id }) => id)).toEqual(['active', 'paused', 'completed'])
    expect(state?.source.allocations.map(({ goalId }) => goalId)).toEqual(['active'])
    expect(state?.pendingSnapshots.map(({ id }) => id)).toEqual(['pending'])
    expect(state?.pendingAllocations.map(({ goalId }) => goalId)).toEqual(['paused'])
  })

  it('rejects completed and foreign edit targets while preserving all owned state', async () => {
    const goals = [
      { id: 'owned', userId: 'u', name: 'Owned', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', createdAt: new Date() },
      { id: 'done', userId: 'u', name: 'Done', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'completed', createdAt: new Date() },
    ]
    const queries = stateQueries({ financialGoals: { findMany: vi.fn().mockResolvedValue(goals) } })
    const state = await getGoalEditState({ query: queries } as never, 'u', '2026-08', 'owned')
    expect(state?.source.goals.map(({ id }) => id)).toEqual(['owned', 'done'])
    await expect(getGoalEditState({ query: queries } as never, 'u', '2026-08', 'done')).rejects.toThrow('Cannot edit a completed goal.')
    await expect(getGoalEditState({ query: queries } as never, 'u', '2026-08', 'foreign')).rejects.toThrow('Goal not found or is not active.')
  })

  it('binds edit tokens to goal, draft, state, and month', async () => {
    const queries = stateQueries({ financialGoals: { findMany: vi.fn().mockResolvedValue([
      { id: 'g', userId: 'u', name: 'Goal', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', targetAmount: '500.00', createdAt: new Date() },
    ]) } })
    const state = await getGoalEditState({ query: queries } as never, 'u', '2026-08', 'g')
    const token = createGoalEditPreviewToken(state!, '2026-08', 'g', draft)
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(createGoalEditPreviewToken(state!, '2026-08', 'other', draft)).not.toBe(token)
    expect(createGoalEditPreviewToken(state!, '2026-09', 'g', draft)).not.toBe(token)
    expect(createGoalEditPreviewToken(state!, '2026-08', 'g', { ...draft, name: 'Other' })).not.toBe(token)
    expect(createGoalEditPreviewToken({ ...state!, source: { ...state!.source, goals: state!.source.goals.map((goal) => ({ ...goal, name: 'Changed' })) } }, '2026-08', 'g', draft)).not.toBe(token)
  })

  it('confirms an edit under the profile lock without replacing investment principal or goal status', async () => {
    const editDraft = goalCreationDraftSchema.parse({ ...draft, name: 'Renamed', strategy: 'invest', annualReturnRate: '9', allocations: [{ goalId: 'g', percentage: '100' }] })
    const goals = [
      { id: 'g', userId: 'u', name: 'Active', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', targetAmount: '500.00', desiredDate: '2027-01-01', createdAt: new Date() },
      { id: 'p', userId: 'u', name: 'Goal', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'invest', status: 'paused', targetAmount: '500.00', desiredDate: '2027-01-01', createdAt: new Date() },
    ]
    const snapshots = [{ id: 's', userId: 'u', effectiveMonth: '2026-08-01' }]
    const investment = { id: 'pos', goalId: 'p', currentValue: '321.00', currency: 'ARS', annualReturnRate: '8', availability: 'available_now', availableFrom: null }
    const queries = stateQueries({
      financialGoals: { findMany: vi.fn().mockResolvedValue(goals) },
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue(snapshots) },
      allocationPlanEntries: { findMany: vi.fn().mockResolvedValue([{ id: 'old', snapshotId: 's', goalId: 'g', percentage: '100.00' }]) },
      goalInvestmentPositions: { findMany: vi.fn().mockResolvedValue([investment]) },
    })
    const before = await getGoalEditState({ query: queries } as never, 'u', '2026-08', 'p')
    const token = createGoalEditPreviewToken(before!, '2026-08', 'p', editDraft)
    const updates: Array<{ table: unknown; values: any }> = []
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({ for: async () => [{ userId: 'u', plannedMonthlyContribution: '100.00' }], limit: async () => [{ id: 's' }] }) }) }),
      update: (table: unknown) => ({ set: (values: any) => ({ where: async () => { updates.push({ table, values }) } }) }),
      delete: () => ({ where: async () => [] }),
      insert: () => ({ values: async () => ({ returning: async () => [] }) }),
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => callback(tx) }
    await confirmGoalEditInRepository(db as never, { userId: 'u', goalId: 'p', currentMonth: '2026-08', draft: editDraft, previewToken: token })
    expect(updates).toContainEqual({ table: financialGoals, values: expect.objectContaining({ name: 'Renamed' }) })
    const positionUpdate = updates.find(({ table }) => table === goalInvestmentPositions)
    expect(positionUpdate?.values).toMatchObject({ annualReturnRate: '9', availability: 'available_now' })
    expect(positionUpdate?.values).not.toHaveProperty('currentValue')
  })

  it('returns refreshed stale edit preview before writes when source state changes', async () => {
    const editDraft = { ...draft, allocations: [{ goalId: 'g', percentage: '100.00' }] }
    const allocationRows = [{ id: 'a', snapshotId: 's', goalId: 'g', percentage: '100.00' }]
    const goal = { id: 'g', userId: 'u', name: 'Goal', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', targetAmount: '500.00', createdAt: new Date() }
    const queries = stateQueries({
      financialGoals: { findMany: vi.fn().mockResolvedValue([goal]) },
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue([{ id: 's', userId: 'u', effectiveMonth: '2026-08-01' }]) },
      allocationPlanEntries: { findMany: vi.fn().mockImplementation(async () => allocationRows) },
    })
    const dbRead = { query: queries }
    const before = await getGoalEditState(dbRead as never, 'u', '2026-08', 'g')
    const token = createGoalEditPreviewToken(before!, '2026-08', 'g', editDraft)
    goal.name = 'Changed after preview'
    const writes: string[] = []
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({ for: async () => [{ userId: 'u', plannedMonthlyContribution: '100.00' }] }) }) }),
      update: () => ({ set: () => ({ where: async () => { writes.push('update') } }) }),
      delete: () => ({ where: async () => { writes.push('delete') } }),
      insert: () => ({ values: async () => { writes.push('insert'); return { returning: async () => [] } } }),
    }
    const db = { ...dbRead, transaction: async (callback: (executor: typeof tx) => unknown) => callback(tx) }
    const error = await confirmGoalEditInRepository(db as never, { userId: 'u', goalId: 'g', currentMonth: '2026-08', draft: editDraft, previewToken: token }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(StaleGoalEditPreviewError)
    expect((error as any).refreshedPreview.previewToken).not.toBe(token)
    expect((error as any).refreshedPreview.proposal.normalizedGoal.name).toBe('Auto')
    expect(writes).toEqual([])
  })

  it('rejects editing a completed goal even with an invalid draft', async () => {
    const goal = { id: 'g', userId: 'u', name: 'Goal', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'completed', targetAmount: '500.00', createdAt: new Date() }
    const queries = stateQueries({ financialGoals: { findMany: vi.fn().mockResolvedValue([goal]) } })
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({ for: async () => [{ userId: 'u' }] }) }) }),
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => callback(tx) }
    const invalidDraft = { ...draft, targetAmount: '-50' } as any
    await expect(confirmGoalEditInRepository(db as never, {
      userId: 'u', goalId: 'g', currentMonth: '2026-08', draft: invalidDraft, previewToken: '0'.repeat(64),
    })).rejects.toThrow('Cannot edit a completed goal.')
  })

  it('rejects immutable edits before any database write', async () => {
    const goal = { id: 'g', userId: 'u', name: 'Goal', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', targetAmount: '500.00', createdAt: new Date() }
    const queries = stateQueries({ financialGoals: { findMany: vi.fn().mockResolvedValue([goal]) } })
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({ for: async () => [{ userId: 'u' }] }) }) }),
      update: () => { throw new Error('unexpected write') }, delete: () => { throw new Error('unexpected write') }, insert: () => { throw new Error('unexpected write') },
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => callback(tx) }
    for (const invalidDraft of [
      { ...draft, currency: 'USD' as const },
      { ...draft, type: 'retirement' as const },
      { ...draft, strategy: 'invest' as const, annualReturnRate: '8' },
    ]) {
      await expect(confirmGoalEditInRepository(db as never, {
        userId: 'u', goalId: 'g', currentMonth: '2026-08', draft: invalidDraft, previewToken: '0'.repeat(64),
      })).rejects.toThrow('Cannot modify immutable goal fields (type, currency, strategy).')
    }
  })

  it('rolls back edit and plan changes when allocation persistence fails', async () => {
    const goal = { id: 'g', userId: 'u', name: 'Goal', type: 'purchase', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', targetAmount: '500.00', createdAt: new Date() }
    const snapshot = { id: 's', userId: 'u', effectiveMonth: '2026-08-01' }
    const queries = stateQueries({
      financialGoals: { findMany: vi.fn().mockResolvedValue([goal]) },
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue([snapshot]) },
      allocationPlanEntries: { findMany: vi.fn().mockResolvedValue([{ id: 'a', snapshotId: 's', goalId: 'g', percentage: '100.00' }]) },
    })
    const initial = { name: goal.name, commitment: '100.00', entries: ['old'] as string[] }
    const persisted = { ...initial }
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({ for: async () => [{ userId: 'u', plannedMonthlyContribution: '200.00' }], limit: async () => [snapshot] }) }) }),
      update: (table: unknown) => ({ set: (values: any) => ({ where: async () => {
        if (table === financialGoals) persisted.name = values.name
        if (table === allocationPlanSnapshots) persisted.commitment = values.plannedMonthlyContribution
      } }) }),
      delete: (table: unknown) => ({ where: async () => { if (table === allocationPlanEntries) persisted.entries = [] } }),
      insert: (table: unknown) => ({ values: async () => {
        if (table === allocationPlanEntries) throw new Error('allocation insert failed')
        return { returning: async () => [] }
      } }),
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => {
      const before = { name: persisted.name, commitment: persisted.commitment, entries: [...persisted.entries] }
      try { return await callback(tx) } catch (error) { Object.assign(persisted, before); throw error }
    } }
    const state = await getGoalEditState(db as never, 'u', '2026-08', 'g')
    const token = createGoalEditPreviewToken(state!, '2026-08', 'g', { ...draft, allocations: [{ goalId: 'g', percentage: '100.00' }] })
    await expect(confirmGoalEditInRepository(db as never, {
      userId: 'u', goalId: 'g', currentMonth: '2026-08', draft: { ...draft, allocations: [{ goalId: 'g', percentage: '100.00' }] }, previewToken: token,
    })).rejects.toThrow('allocation insert failed')
    expect(persisted).toEqual(initial)
  })

  it('keeps next-month snapshots and their allocations separate from the current source', async () => {
    const queries = stateQueries({
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue([
        { id: 'past', userId: 'u', effectiveMonth: '2026-07-01' },
        { id: 'current', userId: 'u', effectiveMonth: '2026-08-01' },
        { id: 'pending', userId: 'u', effectiveMonth: '2026-09-01' },
      ]) },
      allocationPlanEntries: { findMany: vi.fn().mockResolvedValue([
        { id: 'a1', snapshotId: 'current', goalId: 'g', percentage: '100.00' },
        { id: 'a2', snapshotId: 'pending', goalId: 'g', percentage: '100.00' },
      ]) },
    })
    const state = await getGoalCreationState({ query: queries } as never, 'u', '2026-08')
    expect(state?.source.snapshots.map(({ id }) => id)).toEqual(['current'])
    expect(state?.pendingSnapshots.map(({ id }) => id)).toEqual(['pending'])
    expect(state?.pendingAllocations.map(({ snapshotId }) => snapshotId)).toEqual(['pending'])
  })

  it('locks profile and reloads state on the transaction executor before atomic writes', async () => {
    const queries = stateQueries()
    const inserted: unknown[] = []
    let profileLocked = false
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({ for: async () => { profileLocked = true; return [{ userId: 'u', plannedMonthlyContribution: '100.00' }] }, limit: async () => [] }) }) }),
      insert: (table: unknown) => ({ values: (values: unknown) => {
        inserted.push({ table, values })
        return { returning: async () => [{ id: table === financialGoals ? 'new-goal' : 'new-snapshot' }] }
      } }),
      update: () => ({ set: () => ({ where: async () => [] }) }),
      delete: () => ({ where: async () => [] }),
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => callback(tx) }
    const before = await getGoalCreationState(db as never, 'u', '2026-08')
    const token = createGoalCreationPreviewToken(before!, '2026-08', draft)
    const result = await confirmGoalCreationInRepository(db as never, { userId: 'u', currentMonth: '2026-08', draft, previewToken: token })
    expect(result).toEqual({ goalId: 'new-goal' })
    expect(profileLocked).toBe(true)
    expect(inserted.some((write) => (write as { table: unknown }).table === financialGoals)).toBe(true)
    expect(inserted.some((write) => (write as { table: unknown }).table === allocationPlanEntries)).toBe(true)
    expect(queries.financialProfiles.findFirst).toHaveBeenCalledTimes(2)
    expect(queries.allocationPlanSnapshots.findMany).toHaveBeenCalledTimes(2)
    expect(buildGoalCreationProposal({ draft, state: before!, currentMonth: '2026-08' }).allocation.effectiveMonth).toBe('2026-08-01')
  })

  it('rejects stale state before any write and returns a refreshed proposal', async () => {
    let inTransaction = false
    let profileLocked = false
    let transactionReloadedState = false
    let writes = 0
    const goals = [{ id: 'g', userId: 'u', name: 'Old goal', type: 'purchase', targetAmount: '500.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', desiredDate: '2027-01-01', completedAt: null, emergencyFundMonths: null, createdAt: new Date('2026-01-01T00:00:00Z') }]
    const snapshots = [{ id: 's', userId: 'u', effectiveMonth: '2026-08-01' }]
    const allocations = [{ id: 'a', snapshotId: 's', goalId: 'g', percentage: '100.00' }]
    const queries = stateQueries({
      financialGoals: { findMany: vi.fn().mockImplementation(async () => { if (inTransaction && profileLocked) transactionReloadedState = true; return goals }) },
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue(snapshots) },
      allocationPlanEntries: { findMany: vi.fn().mockResolvedValue(allocations) },
    })
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({ for: async () => { profileLocked = true; return [{ userId: 'u', plannedMonthlyContribution: '100.00' }] }, limit: async () => [] }) }) }),
      insert: () => { writes++; throw new Error('unexpected write') }, update: () => { writes++; throw new Error('unexpected write') }, delete: () => { writes++; throw new Error('unexpected write') },
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => { inTransaction = true; return callback(tx) } }
    const original = await getGoalCreationState(db as never, 'u', '2026-08')
    const previewToken = createGoalCreationPreviewToken(original!, '2026-08', draft)
    goals[0].name = 'Changed goal after preview'
    const refreshedState = await getGoalCreationState(db as never, 'u', '2026-08')
    const expectedRefreshedToken = createGoalCreationPreviewToken(refreshedState!, '2026-08', draft)
    const error = await confirmGoalCreationInRepository(db as never, { userId: 'u', currentMonth: '2026-08', draft, previewToken }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(StaleGoalCreationPreviewError)
    expect(error).toMatchObject({ refreshedPreview: { previewToken: expectedRefreshedToken } })
    expect(error).toHaveProperty('refreshedPreview.proposal.normalizedGoal.name', 'Auto')
    expect(profileLocked).toBe(true)
    expect(transactionReloadedState).toBe(true)
    expect(writes).toBe(0)
  })

  it('rolls back earlier writes when allocation persistence fails', async () => {
    const queries = stateQueries()
    const writes: unknown[] = []
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({ for: async () => [{ userId: 'u', plannedMonthlyContribution: '100.00' }], limit: async () => [] }) }) }),
      insert: (table: unknown) => ({ values: (values: unknown) => {
        if (table === allocationPlanEntries) throw new Error('allocation insert failed')
        writes.push({ table, values })
        return { returning: async () => [{ id: 'new-goal' }] }
      } }),
      update: () => ({ set: () => ({ where: async () => [] }) }),
      delete: () => ({ where: async () => [] }),
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => {
      const before = writes.length
      try { return await callback(tx) } catch (error) { writes.splice(before); throw error }
    } }
    const state = await getGoalCreationState(db as never, 'u', '2026-08')
    const token = createGoalCreationPreviewToken(state!, '2026-08', draft)
    await expect(confirmGoalCreationInRepository(db as never, { userId: 'u', currentMonth: '2026-08', draft, previewToken: token })).rejects.toThrow('allocation insert failed')
    expect(writes).toEqual([])
  })

  it('locks and reloads owned active state, then stale source changes return a refreshed proposal with zero writes', async () => {
    let inTransaction = false
    let locked = false
    let transactionReloaded = false
    const goal = { id: 'g', userId: 'u', name: 'Goal', type: 'purchase', targetAmount: '500.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active', createdAt: new Date('2026-01-01T00:00:00Z') }
    const paused = { ...goal, id: 'paused', name: 'Paused', status: 'paused' }
    const snapshots = [{ id: 'current', userId: 'u', effectiveMonth: '2026-08-01' }]
    const allocations = [
      { id: 'active-allocation', snapshotId: 'current', goalId: 'g', percentage: '100.00' },
      { id: 'paused-allocation', snapshotId: 'current', goalId: 'paused', percentage: '0.00' },
    ]
    const queries = stateQueries({
      financialGoals: { findMany: vi.fn().mockImplementation(async () => {
        if (inTransaction && locked) transactionReloaded = true
        return [goal, paused]
      }) },
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue(snapshots) },
      allocationPlanEntries: { findMany: vi.fn().mockResolvedValue(allocations) },
    })
    const writes: unknown[] = []
    const tx = {
      query: queries,
      select: () => ({ from: () => ({ where: () => ({
        for: async () => { locked = true; return [{ userId: 'u', plannedMonthlyContribution: '100.00' }] },
        limit: async () => [{ id: 'current' }],
      }) }) }),
      update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { writes.push({ table, values }) } }) }),
      delete: (table: unknown) => ({ where: async () => { writes.push({ table }) } }),
      insert: (table: unknown) => ({ values: async (values: unknown) => { writes.push({ table, values }) } }),
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => {
      inTransaction = true
      return callback(tx)
    } }
    const draft = allocationChangeDraftSchema.parse({ dedicationPercentage: 80, allocations: [{ goalId: 'g', percentage: '100.00' }] })
    const before = await getGoalCreationState(db as never, 'u', '2026-08')
    const token = createAllocationChangePreviewToken(before!, '2026-08', draft)
    goal.name = 'Changed after preview'

    const error = await confirmAllocationChangeInRepository(db as never, {
      userId: 'u', currentMonth: '2026-08', draft, previewToken: token,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(StaleAllocationChangePreviewError)
    expect((error as StaleAllocationChangePreviewError).refreshedPreview.previewToken).not.toBe(token)
    expect((error as StaleAllocationChangePreviewError).refreshedPreview.proposal.proposedSource.goals.map(({ id }) => id)).toEqual(['g'])
    expect(locked).toBe(true)
    expect(transactionReloaded).toBe(true)
    expect(writes).toEqual([])
  })

  it('atomically replaces only the current active allocation plan without touching positions or history', async () => {
    const goals = ['g1', 'g2', 'paused'].map((id) => ({
      id, userId: 'u', name: id, type: 'purchase', targetAmount: '500.00', currency: 'ARS', priority: 'medium', strategy: 'save',
      status: id === 'paused' ? 'paused' : 'active', createdAt: new Date('2026-01-01T00:00:00Z'),
    }))
    const snapshots = [
      { id: 'current', userId: 'u', effectiveMonth: '2026-08-01' },
      { id: 'pending', userId: 'u', effectiveMonth: '2026-09-01' },
    ]
    const allocations = [
      { id: 'a1', snapshotId: 'current', goalId: 'g1', percentage: '60.00' },
      { id: 'a2', snapshotId: 'current', goalId: 'g2', percentage: '40.00' },
      { id: 'ap', snapshotId: 'current', goalId: 'paused', percentage: '0.00' },
      { id: 'a3', snapshotId: 'pending', goalId: 'g1', percentage: '0.00' },
      { id: 'a4', snapshotId: 'pending', goalId: 'g2', percentage: '100.00' },
    ]
    const queries = stateQueries({
      financialGoals: { findMany: vi.fn().mockResolvedValue(goals) },
      allocationPlanSnapshots: { findMany: vi.fn().mockResolvedValue(snapshots) },
      allocationPlanEntries: { findMany: vi.fn().mockResolvedValue(allocations) },
    })
    const writes: Array<{ table: unknown; operation: string; data?: any }> = []
    let transactionCount = 0
    const tx = {
      query: queries,
      select: () => {
        let table: unknown
        return { from: (selected: unknown) => { table = selected; return { where: () => ({
          for: async () => [{ userId: 'u', plannedMonthlyContribution: '100.00' }],
          limit: async () => table === allocationPlanSnapshots ? [{ id: 'current' }] : [],
        }) } } }
      },
      update: (table: unknown) => ({ set: (data: any) => ({ where: async () => { writes.push({ table, operation: 'update', data }) } }) }),
      delete: (table: unknown) => ({ where: async () => { writes.push({ table, operation: 'delete' }) } }),
      insert: (table: unknown) => ({ values: async (data: any) => { writes.push({ table, operation: 'insert', data }) } }),
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => {
      transactionCount += 1
      return callback(tx)
    } }
    const state = await getGoalCreationState(db as never, 'u', '2026-08')
    const draft = allocationChangeDraftSchema.parse({ dedicationPercentage: 70, allocations: [
      { goalId: 'g1', percentage: '25.00' }, { goalId: 'g2', percentage: '75.00' },
    ] })
    const previewToken = createAllocationChangePreviewToken(state!, '2026-08', draft)

    await confirmAllocationChangeInRepository(db as never, { userId: 'u', currentMonth: '2026-08', draft, previewToken })

    expect(transactionCount).toBe(1)
    expect(writes.find(({ table, operation }) => table === financialProfiles && operation === 'update')?.data).toMatchObject({ goalDedicationPercentage: '70.00' })
    expect(writes.find(({ table, operation }) => table === allocationPlanSnapshots && operation === 'update')?.data).toHaveProperty('plannedMonthlyContribution')
    const inserted = writes.find(({ table, operation }) => table === allocationPlanEntries && operation === 'insert')?.data
    expect(inserted.map(({ goalId, percentage }: any) => ({ goalId, percentage }))).toEqual([
      { goalId: 'g1', percentage: '25.00' }, { goalId: 'g2', percentage: '75.00' },
    ])
    expect(writes.every(({ table }) => [financialProfiles, allocationPlanSnapshots, allocationPlanEntries].includes(table as never))).toBe(true)
  })
})

describe('goal lifecycle repository', () => {
  const goalRow = (id: string, status: string) => ({
    id, userId: 'u', name: id, type: 'purchase', targetAmount: '500.00', currency: 'ARS',
    priority: 'medium', strategy: 'save', status, createdAt: new Date('2026-01-01T00:00:00Z'),
  })

  function lifecycleDb(goals = [goalRow('active', 'active'), goalRow('paused', 'paused'), goalRow('done', 'completed')], failEntries = false) {
    const queries = stateQueries({ financialGoals: { findMany: vi.fn().mockImplementation(async () => goals) } })
    const writes: Array<{ table: unknown; operation: string; data?: any }> = []
    let locked = false
    let txReadsAfterLock = false
    queries.financialGoals.findMany.mockImplementation(async () => {
      if (locked) txReadsAfterLock = true
      return goals
    })
    const tx = {
      query: queries,
      select: (selection: unknown) => {
        let table: unknown
        const builder = {
          from: (source: unknown) => { table = source; return builder },
          where: () => builder,
          for: async () => { locked = true; return [{ userId: 'u', plannedMonthlyContribution: '100.00' }] },
          limit: async () => table === allocationPlanSnapshots ? [] : [],
        }
        return builder
      },
      update: (table: unknown) => ({ set: (data: any) => ({ where: async () => { writes.push({ table, operation: 'update', data }) } }) }),
      delete: (table: unknown) => ({ where: async () => { writes.push({ table, operation: 'delete' }) } }),
      insert: (table: unknown) => ({ values: (data: any) => {
        if (table === allocationPlanEntries && failEntries) throw new Error('allocation insert failed')
        writes.push({ table, operation: 'insert', data })
        return table === allocationPlanSnapshots ? { returning: async () => [{ id: 'new-snapshot' }] } : Promise.resolve(undefined)
      } }),
    }
    const db = { query: queries, transaction: async (callback: (executor: typeof tx) => unknown) => {
      const before = writes.slice()
      try { return await callback(tx) } catch (error) { writes.splice(0, writes.length, ...before); throw error }
    } }
    return {
      queries,
      writes,
      get locked() { return locked },
      get txReadsAfterLock() { return txReadsAfterLock },
      db,
    }
  }

  it('loads all owned statuses and binds tokens to lifecycle, goal, draft, and month', async () => {
    const { db } = lifecycleDb()
    const state = await getGoalLifecycleState(db as never, 'u', '2026-08')
    expect(state?.source.goals.map(({ status }) => status)).toEqual(['active', 'paused', 'completed'])
    const draft = { allocations: [{ goalId: 'active', percentage: '100.00' }] }
    const token = createGoalLifecyclePreviewToken('pause', 'active', state!, '2026-08', draft)
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(createGoalLifecyclePreviewToken('resume', 'active', state!, '2026-08', draft)).not.toBe(token)
    expect(createGoalLifecyclePreviewToken('pause', 'paused', state!, '2026-08', draft)).not.toBe(token)
    expect(createGoalLifecyclePreviewToken('pause', 'active', state!, '2026-09', draft)).not.toBe(token)
    expect(createGoalLifecyclePreviewToken('pause', 'active', state!, '2026-08', { allocations: [] })).not.toBe(token)
  })

  it('reloads real source rows after profile lock and returns stale refreshed proposal without writes', async () => {
    const goals = [goalRow('active', 'active'), goalRow('paused', 'paused'), goalRow('done', 'completed')]
    const fixture = lifecycleDb(goals)
    const { db, writes } = fixture
    const state = await getGoalLifecycleState(db as never, 'u', '2026-08')
    const draft = { allocations: [{ goalId: 'active', percentage: '100.00' }] }
    const token = createGoalLifecyclePreviewToken('pause', 'active', state!, '2026-08', draft)
    goals[0].name = 'changed in loaded DB row'
    const error = await confirmGoalLifecycleInRepository(db as never, {
      userId: 'u', goalId: 'active', lifecycle: 'pause', currentMonth: '2026-08', draft, previewToken: token,
    }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(StaleGoalLifecyclePreviewError)
    expect((error as StaleGoalLifecyclePreviewError).refreshedPreview.proposal.proposedSource.goals[0]?.name).toBe('changed in loaded DB row')
    expect((error as StaleGoalLifecyclePreviewError).refreshedPreview.previewToken).not.toBe(token)
    expect(fixture.locked).toBe(true)
    expect(fixture.txReadsAfterLock).toBe(true)
    expect(writes).toEqual([])
  })

  it('keeps original action-status validation when the loaded status changes after preview', async () => {
    const goals = [goalRow('active', 'active'), goalRow('other', 'active')]
    const fixture = lifecycleDb(goals)
    const state = await getGoalLifecycleState(fixture.db as never, 'u', '2026-08')
    const draft = { allocations: [{ goalId: 'other', percentage: '100.00' }] }
    const token = createGoalLifecyclePreviewToken('pause', 'active', state!, '2026-08', draft)
    goals[0].status = 'paused'
    await expect(confirmGoalLifecycleInRepository(fixture.db as never, {
      userId: 'u', goalId: 'active', lifecycle: 'pause', currentMonth: '2026-08', draft, previewToken: token,
    })).rejects.toThrow('Only active goals can be paused.')
    expect(fixture.writes).toEqual([])
  })

  it('pauses the last active goal with an empty persisted allocation and preserves positions/history', async () => {
    const { db, writes } = lifecycleDb([goalRow('only', 'active')])
    const state = await getGoalLifecycleState(db as never, 'u', '2026-08')
    const proposal = buildGoalLifecycleProposal({ lifecycle: 'pause', goalId: 'only', state: state!, currentMonth: '2026-08' })
    const token = createGoalLifecyclePreviewToken('pause', 'only', state!, '2026-08')
    await confirmGoalLifecycleInRepository(db as never, {
      userId: 'u', goalId: 'only', lifecycle: 'pause', currentMonth: '2026-08', previewToken: token,
    })
    expect(proposal.pauseMonthlyCommitment).toBe(true)
    expect(proposal.persistedAllocation.entries).toEqual([])
    expect(writes.find(({ table }) => table === financialGoals)?.data).toEqual({ status: 'paused' })
    expect(writes.find(({ table }) => table === financialProfiles)?.data).toEqual({ plannedMonthlyContribution: null })
    expect(writes.filter(({ table, operation }) => table === allocationPlanEntries && operation === 'insert')).toEqual([])
  })

  it('rolls back lifecycle status and plan writes when allocation persistence fails', async () => {
    const fixture = lifecycleDb([goalRow('active', 'active'), goalRow('other', 'active')], true)
    const state = await getGoalLifecycleState(fixture.db as never, 'u', '2026-08')
    const draft = { allocations: [{ goalId: 'other', percentage: '100.00' }] }
    const token = createGoalLifecyclePreviewToken('pause', 'active', state!, '2026-08', draft)
    await expect(confirmGoalLifecycleInRepository(fixture.db as never, {
      userId: 'u', goalId: 'active', lifecycle: 'pause', currentMonth: '2026-08', draft, previewToken: token,
    })).rejects.toThrow('allocation insert failed')
    expect(fixture.writes).toEqual([])
  })

  it('validates owned target status and never accepts foreign allocation ids', async () => {
    const fixture = lifecycleDb([goalRow('active', 'active'), goalRow('other', 'active'), goalRow('paused', 'paused'), goalRow('done', 'completed')])
    const state = await getGoalLifecycleState(fixture.db as never, 'u', '2026-08')
    expect(() => buildGoalLifecycleProposal({ lifecycle: 'pause', goalId: 'paused', state: state!, currentMonth: '2026-08' }))
      .toThrow('Only active goals can be paused.')
    expect(() => buildGoalLifecycleProposal({ lifecycle: 'resume', goalId: 'done', state: state!, currentMonth: '2026-08' }))
      .toThrow('Only paused goals can be resumed.')
    expect(() => buildGoalLifecycleProposal({ lifecycle: 'pause', goalId: 'not-owned', state: state!, currentMonth: '2026-08' }))
      .toThrow('Goal not found.')
    expect(() => buildGoalLifecycleProposal({
      lifecycle: 'pause', goalId: 'active', state: state!, currentMonth: '2026-08',
      draft: { allocations: [{ goalId: 'foreign', percentage: '100.00' }] },
    })).toThrow('Allocation draft must contain exactly the active goals')
  })

  it('resumes the sole paused goal at 100% without allocating to completed goals', async () => {
    const fixture = lifecycleDb([goalRow('paused', 'paused'), goalRow('done', 'completed')])
    const state = await getGoalLifecycleState(fixture.db as never, 'u', '2026-08')
    const token = createGoalLifecyclePreviewToken('resume', 'paused', state!, '2026-08')
    await confirmGoalLifecycleInRepository(fixture.db as never, {
      userId: 'u', goalId: 'paused', lifecycle: 'resume', currentMonth: '2026-08', previewToken: token,
    })
    expect(fixture.writes.find(({ table }) => table === financialGoals)?.data).toEqual({ status: 'active' })
    const planInsert = fixture.writes.find(({ table, operation }) => table === allocationPlanEntries && operation === 'insert')
    expect(planInsert?.data).toEqual([{ snapshotId: 'new-snapshot', goalId: 'paused', percentage: '100.00' }])
  })
})
