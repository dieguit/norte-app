import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  createMoney,
} from '../../lib/money'
import { PLANNING_ARS_PER_USD } from '../financial/financial'
import {
  type GoalProjection,
  type GoalStatus,
  type GoalsWorkspaceSource,
  buildGoalsWorkspace,
  buildCurrentGoalsPlanWorkspace,
} from './goals'
import {
  type GoalCreationAllocation,
  type GoalCreationAllocationEntry,
  type GoalCreationImpact,
  calculatePercentageSum,
  rebalanceAllocationEntries,
  recalculateAllocationAmounts,
} from './goal-creation'
import type { GoalLifecycle } from './goal-lifecycle.schema'

export interface GoalLifecycleState {
  source: GoalsWorkspaceSource
  pendingSnapshots: GoalsWorkspaceSource['snapshots']
  pendingAllocations: GoalsWorkspaceSource['allocations']
}

export interface GoalLifecycleContext {
  goalId: string
  lifecycle: GoalLifecycle
  goalName: string
  currentMonth: string
  plannedMonthlyContribution?: Money
  activeGoals: Array<{
    id: string
    name: string
    currency: CurrencyCode
  }>
  currentAllocation?: {
    effectiveMonth: string
    entries: Array<{
      goalId: string
      percentage: string
    }>
  }
  pendingAllocation?: {
    effectiveMonth: string
    entries: Array<{
      goalId: string
      percentage: string
    }>
  }
}

export interface GoalLifecycleProposal {
  lifecycle: GoalLifecycle
  goalId: string
  nextStatus: GoalStatus
  transition: {
    goalId: string
    status: GoalStatus
  }
  pauseMonthlyCommitment: boolean
  allocation: GoalCreationAllocation
  persistedAllocation: {
    effectiveMonth: string
    entries: Array<{
      goalId: string
      percentage: string
    }>
  }
  impacts: GoalCreationImpact[]
  proposedSource: GoalsWorkspaceSource
}

export interface GoalLifecyclePreviewResult {
  proposal: GoalLifecycleProposal
  previewToken: string
}

export interface BuildGoalLifecycleProposalInput {
  lifecycle: GoalLifecycle
  goalId: string
  state: GoalLifecycleState
  currentMonth: string
  draft?: {
    allocations?: Array<{
      goalId: string
      percentage: string
    }>
  }
}

function getNextCalendarMonthStr(currentMonth: string): string {
  const [year, month] = currentMonth.slice(0, 7).split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) + 1
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`
}

export function buildGoalLifecycleProposal(
  input: BuildGoalLifecycleProposalInput,
): GoalLifecycleProposal {
  const { lifecycle, goalId, state, currentMonth, draft } = input

  const allGoals = state.source.goals ?? []
  const targetGoal = allGoals.find((g) => g.id === goalId)

  if (!targetGoal) {
    throw new Error('Goal not found.')
  }

  if (lifecycle === 'pause' && targetGoal.status !== 'active') {
    throw new Error('Only active goals can be paused.')
  }

  if (lifecycle === 'resume' && targetGoal.status !== 'paused') {
    throw new Error('Only paused goals can be resumed.')
  }

  const nextStatus: GoalStatus = lifecycle === 'pause' ? 'paused' : 'active'
  const nextMonthStr = getNextCalendarMonthStr(currentMonth)
  const nextMonthEffective = `${nextMonthStr}-01`

  const existingActiveGoals = allGoals.filter((g) => g.status === 'active')
  const proposedActiveGoals =
    lifecycle === 'pause'
      ? existingActiveGoals.filter((g) => g.id !== goalId)
      : [targetGoal, ...existingActiveGoals]

  const pauseMonthlyCommitment = lifecycle === 'pause' && proposedActiveGoals.length === 0

  // 1. Snapshot selection (prefer pending next snapshot, then source next snapshot, then latest current/past snapshot)
  const pendingNextSnapshot = state.pendingSnapshots?.find(
    (s) => s.effectiveMonth.slice(0, 7) === nextMonthStr,
  )
  const sourceNextSnapshot = state.source.snapshots?.find(
    (s) => s.effectiveMonth.slice(0, 7) === nextMonthStr,
  )
  const currentSnapshot = state.source.snapshots
    ?.filter((s) => s.effectiveMonth.slice(0, 7) <= currentMonth.slice(0, 7))
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))[0]

  const selectedSnapshot = pendingNextSnapshot ?? sourceNextSnapshot ?? currentSnapshot

  const sourceAllocs = selectedSnapshot
    ? (pendingNextSnapshot ? state.pendingAllocations : state.source.allocations)?.filter(
        (a) => a.snapshotId === selectedSnapshot.id,
      ) ?? []
    : []

  // 2. Build entries
  let displayEntries: GoalCreationAllocationEntry[] = []

  if (lifecycle === 'pause') {
    if (pauseMonthlyCommitment) {
      displayEntries = [
        {
          goalId: targetGoal.id,
          goalName: targetGoal.name,
          percentage: '0.00',
          pending: false,
        },
      ]
    } else {
      // Build initial entries for existing active goals
      let baseEntries: GoalCreationAllocationEntry[] = []
      if (sourceAllocs.length > 0) {
        const activeAllocGoalIds = new Set(
          sourceAllocs.map((a) => a.goalId).filter((id) => existingActiveGoals.some((g) => g.id === id)),
        )

        for (const a of sourceAllocs) {
          const existingGoal = existingActiveGoals.find((g) => g.id === a.goalId)
          if (existingGoal) {
            baseEntries.push({
              goalId: a.goalId,
              goalName: existingGoal.name,
              percentage: new BigNumber(a.percentage).toFixed(2),
              pending: false,
            })
          }
        }

        for (const g of existingActiveGoals) {
          if (!activeAllocGoalIds.has(g.id)) {
            baseEntries.push({
              goalId: g.id,
              goalName: g.name,
              percentage: '0.00',
              pending: false,
            })
          }
        }
      } else {
        baseEntries = existingActiveGoals.map((g) => ({
          goalId: g.id,
          goalName: g.name,
          percentage: '0.00',
          pending: false,
        }))
      }

      if (draft !== undefined && draft.allocations !== undefined && draft.allocations.length > 0) {
        const remainingGoalIds = new Set(proposedActiveGoals.map((g) => g.id))
        const submittedIds = new Set(draft.allocations.map((e) => e.goalId))

        const includesTargetAtZero =
          submittedIds.has(targetGoal.id) &&
          draft.allocations.find((e) => e.goalId === targetGoal.id)?.percentage === '0.00'

        const effectiveSubmittedIds = new Set(
          draft.allocations.map((e) => e.goalId).filter((id) => id !== targetGoal.id),
        )

        const isMatch =
          effectiveSubmittedIds.size === remainingGoalIds.size &&
          [...remainingGoalIds].every((id) => effectiveSubmittedIds.has(id)) &&
          (draft.allocations.length === proposedActiveGoals.length ||
            (includesTargetAtZero && draft.allocations.length === proposedActiveGoals.length + 1))

        if (!isMatch) {
          throw new Error('Allocation draft must contain exactly the active goals')
        }

        const remainingEntries: GoalCreationAllocationEntry[] = proposedActiveGoals.map((g) => {
          const subEntry = draft.allocations!.find((e) => e.goalId === g.id)
          const parsedPct = new BigNumber((subEntry?.percentage || '0').replace(',', '.'))
          return {
            goalId: g.id,
            goalName: g.name,
            percentage: parsedPct.toFixed(2),
            pending: false,
          }
        })

        displayEntries = [
          {
            goalId: targetGoal.id,
            goalName: targetGoal.name,
            percentage: '0.00',
            pending: false,
          },
          ...remainingEntries,
        ]
      } else {
        const rebalanced = rebalanceAllocationEntries(baseEntries, targetGoal.id, '0.00')
        const targetEntry = rebalanced.find((e) => e.goalId === targetGoal.id) ?? {
          goalId: targetGoal.id,
          goalName: targetGoal.name,
          percentage: '0.00',
          pending: false,
        }
        const otherEntries = rebalanced.filter((e) => e.goalId !== targetGoal.id)
        displayEntries = [targetEntry, ...otherEntries]
      }

      const activeSum = calculatePercentageSum(displayEntries.filter((e) => e.goalId !== targetGoal.id))
      if (!activeSum.isEqualTo(100)) {
        throw new Error(`Allocation percentages must sum to 100%, got ${activeSum.toFixed(2)}%`)
      }
    }
  } else {
    // Resume lifecycle
    let baseRemainingEntries: GoalCreationAllocationEntry[] = []
    if (sourceAllocs.length > 0) {
      const activeAllocGoalIds = new Set(
        sourceAllocs.map((a) => a.goalId).filter((id) => existingActiveGoals.some((g) => g.id === id)),
      )

      for (const a of sourceAllocs) {
        const existingGoal = existingActiveGoals.find((g) => g.id === a.goalId)
        if (existingGoal) {
          baseRemainingEntries.push({
            goalId: a.goalId,
            goalName: existingGoal.name,
            percentage: new BigNumber(a.percentage).toFixed(2),
            pending: false,
          })
        }
      }

      for (const g of existingActiveGoals) {
        if (!activeAllocGoalIds.has(g.id)) {
          baseRemainingEntries.push({
            goalId: g.id,
            goalName: g.name,
            percentage: '0.00',
            pending: false,
          })
        }
      }
    } else {
      baseRemainingEntries = existingActiveGoals.map((g) => ({
        goalId: g.id,
        goalName: g.name,
        percentage: existingActiveGoals.length === 1 ? '100.00' : '0.00',
        pending: false,
      }))
    }

    if (draft !== undefined && draft.allocations !== undefined) {
      const proposedIds = new Set(proposedActiveGoals.map((g) => g.id))
      const submittedIds = new Set(draft.allocations.map((e) => e.goalId))
      const isExactMatch =
        submittedIds.size === proposedIds.size &&
        draft.allocations.length === proposedActiveGoals.length &&
        [...proposedIds].every((id) => submittedIds.has(id))

      if (!isExactMatch) {
        throw new Error('Allocation draft must contain exactly the active goals')
      }

      displayEntries = [
        targetGoal,
        ...existingActiveGoals,
      ].map((g) => {
        const subEntry = draft.allocations!.find((e) => e.goalId === g.id)
        const parsedPct = new BigNumber((subEntry?.percentage || '0').replace(',', '.'))
        return {
          goalId: g.id,
          goalName: g.name,
          percentage: parsedPct.toFixed(2),
          pending: false,
        }
      })
    } else {
      const defaultTargetPct = existingActiveGoals.length === 0 ? '100.00' : '0.00'
      displayEntries = [
        {
          goalId: targetGoal.id,
          goalName: targetGoal.name,
          percentage: defaultTargetPct,
          pending: false,
        },
        ...baseRemainingEntries,
      ]
    }

    const totalBn = calculatePercentageSum(displayEntries)
    if (!totalBn.isEqualTo(100)) {
      throw new Error(`Allocation percentages must sum to 100%, got ${totalBn.toFixed(2)}%`)
    }
  }

  // 3. Persisted allocations
  const persistedEntries =
    lifecycle === 'pause'
      ? displayEntries
          .filter((e) => e.goalId !== targetGoal.id)
          .map((e) => ({ goalId: e.goalId, percentage: e.percentage }))
      : displayEntries.map((e) => ({ goalId: e.goalId, percentage: e.percentage }))

  const persistedAllocation = {
    effectiveMonth: nextMonthEffective,
    entries: persistedEntries,
  }

  // 4. Monthly contribution & amount calculations
  let monthlyContribution: Money | undefined
  if (
    !pauseMonthlyCommitment &&
    state.source.profile?.plannedMonthlyContribution !== null &&
    state.source.profile?.plannedMonthlyContribution !== undefined
  ) {
    const baseCurr = state.source.profile.baseCurrency ?? 'ARS'
    monthlyContribution = createMoney(state.source.profile.plannedMonthlyContribution, baseCurr)
  }

  const entriesCurrencyMap = new Map<string, CurrencyCode>()
  for (const g of allGoals) {
    entriesCurrencyMap.set(g.id, g.currency)
  }

  if (monthlyContribution) {
    const amountsMap = recalculateAllocationAmounts({
      monthlyContribution,
      entries: displayEntries.map((e) => ({
        goalId: e.goalId,
        percentage: e.percentage,
        currency: entriesCurrencyMap.get(e.goalId) ?? 'ARS',
      })),
    })

    displayEntries = displayEntries.map((entry) => {
      const amounts = amountsMap.get(entry.goalId)
      return {
        ...entry,
        allocatedBaseAmount: amounts?.allocatedBaseAmount,
        allocatedDestinationAmount: amounts?.allocatedDestinationAmount,
      }
    })
  }

  const totalPercentage = pauseMonthlyCommitment
    ? '0.00'
    : calculatePercentageSum(
        lifecycle === 'pause'
          ? displayEntries.filter((e) => e.goalId !== targetGoal.id)
          : displayEntries,
      ).toFixed(2)

  const allocation: GoalCreationAllocation = {
    monthlyContribution,
    effectiveMonth: nextMonthEffective,
    entries: displayEntries,
    totalPercentage,
  }

  // 5. Workspaces: Before & After
  const beforeWorkspace = buildCurrentGoalsPlanWorkspace(state, currentMonth)

  // Build proposed source
  const proposedSnapshots = [...(state.source.snapshots ?? [])]
  const proposedAllocations = [...(state.source.allocations ?? [])]

  const snapshotId = pendingNextSnapshot?.id ?? `snap-allocation-${nextMonthStr}`

  const newSnapshot = {
    id: snapshotId,
    userId: state.source.profile?.userId,
    effectiveMonth: nextMonthEffective,
  }

  const existingSnapIndex = proposedSnapshots.findIndex(
    (s) => s.effectiveMonth === nextMonthEffective,
  )
  if (existingSnapIndex >= 0) {
    proposedSnapshots[existingSnapIndex] = newSnapshot
  } else {
    proposedSnapshots.push(newSnapshot)
  }

  const filteredAllocations = proposedAllocations.filter((a) => a.snapshotId !== snapshotId)
  const newAllocRows = persistedEntries.map((entry) => ({
    id: `alloc-${snapshotId}-${entry.goalId}`,
    snapshotId,
    goalId: entry.goalId,
    percentage: entry.percentage,
  }))

  proposedAllocations.length = 0
  proposedAllocations.push(...filteredAllocations, ...newAllocRows)

  const proposedProfile = state.source.profile
    ? {
        ...state.source.profile,
        plannedMonthlyContribution: pauseMonthlyCommitment
          ? null
          : state.source.profile.plannedMonthlyContribution,
      }
    : null

  const proposedGoals = allGoals.map((g) => (g.id === goalId ? { ...g, status: nextStatus } : g))

  const proposedSource: GoalsWorkspaceSource = {
    profile: proposedProfile,
    goals: proposedGoals,
    savingsPositions: state.source.savingsPositions,
    investmentPositions: state.source.investmentPositions,
    snapshots: proposedSnapshots,
    allocations: proposedAllocations,
  }

  const afterWorkspace = buildGoalsWorkspace(proposedSource, currentMonth)

  // 6. Impacts calculation (Transitioning goal must be first in impacts)
  const beforeGoals = beforeWorkspace.groups.flatMap((g) => g.goals)
  const afterGoals = afterWorkspace.groups.flatMap((g) => g.goals)

  const impacts: GoalCreationImpact[] = []

  const targetBeforeGoal = beforeGoals.find((g) => g.id === targetGoal.id)
  const targetAfterGoal = afterGoals.find((g) => g.id === targetGoal.id)

  const targetBeforeAllocatedAmounts: Money[] = []
  const targetBeforeFundingRow = targetBeforeGoal?.funding?.find(
    (f) => f.effectiveMonth === selectedSnapshot?.effectiveMonth,
  ) ?? targetBeforeGoal?.funding?.[0]

  if (targetBeforeFundingRow?.allocatedDestinationAmount) {
    targetBeforeAllocatedAmounts.push(targetBeforeFundingRow.allocatedDestinationAmount)
  }

  impacts.push({
    goalId: targetGoal.id,
    goalName: targetGoal.name,
    before: {
      status: 'existing',
      projection: targetBeforeGoal?.projection ?? { status: 'target_unavailable' },
      allocatedMonthlyAmounts: targetBeforeAllocatedAmounts,
    },
    after: targetAfterGoal?.projection ?? { status: 'target_unavailable' },
  })

  for (const goal of allGoals) {
    if (goal.id === targetGoal.id) continue

    const beforeGoal = beforeGoals.find((g) => g.id === goal.id)
    const afterGoal = afterGoals.find((g) => g.id === goal.id)

    const beforeProjection: GoalProjection = beforeGoal?.projection ?? {
      status: 'target_unavailable',
    }
    const afterProjection: GoalProjection = afterGoal?.projection ?? {
      status: 'target_unavailable',
    }

    const beforeAllocatedAmounts: Money[] = []
    let amountsChanged = false

    const beforeFundingRow = beforeGoal?.funding?.find(
      (f) => f.effectiveMonth === selectedSnapshot?.effectiveMonth,
    ) ?? beforeGoal?.funding?.[0]

    if (beforeFundingRow?.allocatedDestinationAmount) {
      beforeAllocatedAmounts.push(beforeFundingRow.allocatedDestinationAmount)
    }

    const afterEntry = displayEntries.find((e) => e.goalId === goal.id)
    const afterDestAmount = afterEntry?.allocatedDestinationAmount

    if (
      beforeFundingRow?.allocatedDestinationAmount?.amount !== afterDestAmount?.amount ||
      beforeFundingRow?.allocatedDestinationAmount?.currency !== afterDestAmount?.currency
    ) {
      amountsChanged = true
    }

    const projectionChanged =
      JSON.stringify(beforeProjection) !== JSON.stringify(afterProjection)

    if (projectionChanged || amountsChanged) {
      impacts.push({
        goalId: goal.id,
        goalName: goal.name,
        before: {
          status: 'existing',
          projection: beforeProjection,
          allocatedMonthlyAmounts: beforeAllocatedAmounts,
        },
        after: afterProjection,
      })
    }
  }

  return {
    lifecycle,
    goalId,
    nextStatus,
    transition: {
      goalId,
      status: nextStatus,
    },
    pauseMonthlyCommitment,
    allocation,
    persistedAllocation,
    impacts,
    proposedSource,
  }
}

export function serializeGoalLifecycleState(
  lifecycle: GoalLifecycle,
  goalId: string,
  stateOrSource: GoalLifecycleState | GoalsWorkspaceSource,
  currentMonth: string,
  draft?: {
    allocations?: Array<{
      goalId: string
      percentage: string
    }>
  },
): string {
  const state: GoalLifecycleState =
    'source' in stateOrSource && stateOrSource.source
      ? (stateOrSource as GoalLifecycleState)
      : {
          source: stateOrSource as GoalsWorkspaceSource,
          pendingSnapshots: [],
          pendingAllocations: [],
        }

  const { source, pendingSnapshots, pendingAllocations } = state

  const normalized = {
    lifecycle,
    goalId,
    currentMonth,
    planningArsPerUsd: PLANNING_ARS_PER_USD,
    profile: source.profile
      ? {
          userId: source.profile.userId,
          baseCurrency: source.profile.baseCurrency,
          expensesKnowledge: source.profile.expensesKnowledge,
          plannedMonthlyContribution: source.profile.plannedMonthlyContribution ?? null,
          onboardingCompleted: source.profile.onboardingCompleted,
        }
      : null,
    goals: (source.goals ?? [])
      .map((g) => ({
        id: g.id,
        userId: g.userId ?? null,
        name: g.name,
        type: g.type,
        targetAmount: g.targetAmount ?? null,
        currency: g.currency,
        priority: g.priority,
        strategy: g.strategy,
        status: g.status,
        desiredDate: g.desiredDate ?? null,
        completedAt: g.completedAt ?? null,
        emergencyFundMonths: g.emergencyFundMonths ?? null,
        createdAt: g.createdAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    savingsPositions: (source.savingsPositions ?? [])
      .map((s) => ({
        id: s.id,
        goalId: s.goalId,
        amount: s.amount,
        currency: s.currency,
        location: s.location ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    investmentPositions: (source.investmentPositions ?? [])
      .map((i) => ({
        id: i.id,
        goalId: i.goalId,
        currentValue: i.currentValue,
        currency: i.currency,
        annualReturnRate: i.annualReturnRate ?? null,
        availability: i.availability ?? null,
        availableFrom: i.availableFrom ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    snapshots: (source.snapshots ?? [])
      .map((s) => ({
        id: s.id,
        userId: s.userId ?? null,
        effectiveMonth: s.effectiveMonth,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    allocations: (source.allocations ?? [])
      .map((a) => ({
        id: a.id,
        snapshotId: a.snapshotId,
        goalId: a.goalId,
        percentage: a.percentage,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pendingSnapshots: (pendingSnapshots ?? [])
      .map((s) => ({
        id: s.id,
        userId: s.userId ?? null,
        effectiveMonth: s.effectiveMonth,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pendingAllocations: (pendingAllocations ?? [])
      .map((a) => ({
        id: a.id,
        snapshotId: a.snapshotId,
        goalId: a.goalId,
        percentage: a.percentage,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    draft: draft
      ? {
          allocations: (draft.allocations ?? [])
            .map((e) => ({
              goalId: e.goalId,
              percentage: new BigNumber((e.percentage || '0').replace(',', '.')).toFixed(2),
            }))
            .sort((a, b) => a.goalId.localeCompare(b.goalId)),
        }
      : null,
  }

  return JSON.stringify(normalized)
}
