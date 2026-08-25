import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
} from '../../lib/money'
import { PLANNING_ARS_PER_USD } from '../financial/financial'
import {
  type GoalProjection,
  type GoalsFinancialSummary,
  type GoalsWorkspaceSource,
  buildGoalsWorkspace,
} from './goals'
import {
  type GoalCreationAllocation,
  type GoalCreationAllocationEntry,
  calculatePercentageSum,
  recalculateAllocationAmounts,
} from './goal-creation'
import type { AllocationChangeDraft } from './allocation-change.schema'

export interface AllocationChangeState {
  source: GoalsWorkspaceSource
  pendingSnapshots: GoalsWorkspaceSource['snapshots']
  pendingAllocations: GoalsWorkspaceSource['allocations']
}

export interface AllocationChangeContext {
  currentMonth: string
  financialSummary: GoalsFinancialSummary
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

export interface AllocationChangeProposal {
  dedicationPercentage: number
  allocation: GoalCreationAllocation
  impacts: Array<{
    goalId: string
    goalName: string
    before: { status: 'existing'; projection: GoalProjection; allocatedMonthlyAmounts: Money[] }
    after: GoalProjection
  }>
  proposedSource: GoalsWorkspaceSource
}

export interface AllocationChangePreviewResult {
  proposal: AllocationChangeProposal
  previewToken: string
}

export interface BuildAllocationChangeProposalInput {
  draft?: AllocationChangeDraft
  state: AllocationChangeState
  currentMonth: string
}

export function buildAllocationChangeProposal(
  input: BuildAllocationChangeProposalInput,
): AllocationChangeProposal {
  const { draft, state, currentMonth } = input

  const effectiveMonth = `${currentMonth.slice(0, 7)}-01`
  const activeGoals = (state.source.goals ?? []).filter((g) => g.status === 'active')

  const selectedSnapshot = (state.source.snapshots ?? [])
    .filter((snapshot) => snapshot.effectiveMonth.slice(0, 7) <= currentMonth.slice(0, 7))
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))[0]

  const sourceAllocs = selectedSnapshot
    ? (state.source.allocations ?? []).filter(
        (a) => a.snapshotId === selectedSnapshot.id,
      )
    : []

  let entries: GoalCreationAllocationEntry[] = []

  if (sourceAllocs.length > 0) {
    const activeAllocGoalIds = new Set(
      sourceAllocs.map((a) => a.goalId).filter((id) => activeGoals.some((g) => g.id === id)),
    )

    for (const a of sourceAllocs) {
      const existingGoal = activeGoals.find((g) => g.id === a.goalId)
      if (existingGoal) {
        entries.push({
          goalId: a.goalId,
          goalName: existingGoal.name,
          percentage: new BigNumber(a.percentage).toFixed(2),
          pending: false,
        })
      }
    }

    for (const g of activeGoals) {
      if (!activeAllocGoalIds.has(g.id)) {
        entries.push({
          goalId: g.id,
          goalName: g.name,
          percentage: '0.00',
          pending: false,
        })
      }
    }
  } else {
    entries = activeGoals.map((g) => ({
      goalId: g.id,
      goalName: g.name,
      percentage: '0.00',
      pending: false,
    }))
  }

  if (draft !== undefined) {
    const activeGoalIds = new Set(activeGoals.map((g) => g.id))
    const submittedIds = new Set(draft.allocations.map((e) => e.goalId))
    const isExactMatch =
      submittedIds.size === activeGoalIds.size &&
      draft.allocations.length === activeGoals.length &&
      [...activeGoalIds].every((id) => submittedIds.has(id))

    if (!isExactMatch) {
      throw new Error('Allocation draft must contain exactly the active goals')
    }

    entries = entries.map((entry) => {
      const subEntry = draft.allocations.find((e) => e.goalId === entry.goalId)
      if (subEntry) {
        const parsedPct = new BigNumber((subEntry.percentage || '0').replace(',', '.'))
        return {
          ...entry,
          percentage: parsedPct.toFixed(2),
        }
      }
      return entry
    })
  }

  const totalBn = calculatePercentageSum(entries)
  if (!totalBn.isEqualTo(100)) {
    throw new Error(`Allocation percentages must sum to 100%, got ${totalBn.toFixed(2)}%`)
  }

  const dedicationPercentage =
    draft !== undefined
      ? draft.dedicationPercentage
      : Number(state.source.profile?.goalDedicationPercentage ?? 90)

  const proposedProfile = state.source.profile
    ? {
        ...state.source.profile,
        goalDedicationPercentage: String(dedicationPercentage),
      }
    : null

  const proposedSnapshots = [...(state.source.snapshots ?? [])]
  const proposedAllocations = [...(state.source.allocations ?? [])]

  const snapshotId = selectedSnapshot?.id ?? `snap-allocation-${currentMonth.slice(0, 7)}`

  const newSnapshot = {
    id: snapshotId,
    userId: state.source.profile?.userId,
    effectiveMonth,
  }

  const existingSnapIndex = proposedSnapshots.findIndex(
    (s) => s.effectiveMonth.slice(0, 7) === currentMonth.slice(0, 7),
  )
  if (existingSnapIndex >= 0) {
    proposedSnapshots[existingSnapIndex] = newSnapshot
  } else {
    proposedSnapshots.push(newSnapshot)
  }

  const filteredAllocations = proposedAllocations.filter((a) => a.snapshotId !== snapshotId)
  const newAllocRows = entries.map((entry) => ({
    id: `alloc-${snapshotId}-${entry.goalId}`,
    snapshotId,
    goalId: entry.goalId,
    percentage: entry.percentage,
  }))

  proposedAllocations.length = 0
  proposedAllocations.push(...filteredAllocations, ...newAllocRows)

  const proposedSource: GoalsWorkspaceSource = {
    profile: proposedProfile,
    goals: state.source.goals ?? [],
    savingsPositions: state.source.savingsPositions,
    investmentPositions: state.source.investmentPositions,
    snapshots: proposedSnapshots,
    allocations: proposedAllocations,
    incomes: state.source.incomes,
    expenses: state.source.expenses,
    contributions: state.source.contributions,
    savingContributions: state.source.savingContributions,
  }

  const beforeWorkspace = buildGoalsWorkspace(state.source, currentMonth)
  const afterWorkspace = buildGoalsWorkspace(proposedSource, currentMonth)

  const monthlyContribution = afterWorkspace.financialSummary.contribution

  const entriesCurrencyMap = new Map<string, CurrencyCode>()
  for (const g of activeGoals) {
    entriesCurrencyMap.set(g.id, g.currency)
  }

  if (monthlyContribution) {
    const amountsMap = recalculateAllocationAmounts({
      monthlyContribution,
      entries: entries.map((e) => ({
        goalId: e.goalId,
        percentage: e.percentage,
        currency: entriesCurrencyMap.get(e.goalId) ?? 'ARS',
      })),
    })

    entries = entries.map((entry) => {
      const amounts = amountsMap.get(entry.goalId)
      return {
        ...entry,
        allocatedBaseAmount: amounts?.allocatedBaseAmount,
        allocatedDestinationAmount: amounts?.allocatedDestinationAmount,
      }
    })
  }

  const allocation: GoalCreationAllocation = {
    monthlyContribution,
    effectiveMonth,
    entries,
    totalPercentage: totalBn.toFixed(2),
  }

  const beforeGoals = beforeWorkspace.groups.flatMap((g) => g.goals)
  const afterGoals = afterWorkspace.groups.flatMap((g) => g.goals)

  const impacts: AllocationChangeProposal['impacts'] = []

  for (const goal of state.source.goals ?? []) {
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
      (f) => f.effectiveMonth.slice(0, 7) === currentMonth.slice(0, 7),
    ) ?? beforeGoal?.funding?.[0]

    if (beforeFundingRow?.allocatedDestinationAmount) {
      beforeAllocatedAmounts.push(beforeFundingRow.allocatedDestinationAmount)
    }

    const afterEntry = allocation.entries.find((e) => e.goalId === goal.id)
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
    dedicationPercentage,
    allocation,
    impacts,
    proposedSource,
  }
}

export function serializeAllocationChangeState(
  stateOrSource: AllocationChangeState | GoalsWorkspaceSource,
  currentMonth: string,
  draft?: AllocationChangeDraft,
): string {
  const state: AllocationChangeState =
    'source' in stateOrSource && stateOrSource.source
      ? (stateOrSource as AllocationChangeState)
      : {
          source: stateOrSource as GoalsWorkspaceSource,
          pendingSnapshots: [],
          pendingAllocations: [],
        }

  const { source, pendingSnapshots, pendingAllocations } = state

  const normalized = {
    currentMonth,
    planningArsPerUsd: PLANNING_ARS_PER_USD,
    profile: source.profile
      ? {
          userId: source.profile.userId,
          baseCurrency: source.profile.baseCurrency,
          approximateMonthlyIncome: source.profile.approximateMonthlyIncome,
          approximateMonthlyExpenses: source.profile.approximateMonthlyExpenses ?? null,
          expensesKnowledge: source.profile.expensesKnowledge,
          plannedMonthlyContribution: source.profile.plannedMonthlyContribution ?? null,
          goalDedicationPercentage: source.profile.goalDedicationPercentage ?? null,
          onboardingCompleted: source.profile.onboardingCompleted,
        }
      : null,
    incomes: (source.incomes ?? [])
      .map((i) => ({
        id: i.id,
        sourceKind: i.sourceKind,
        sourceId: i.sourceId ?? null,
        sourceName: i.sourceName ?? null,
        amount: i.amount,
        currency: i.currency,
        recurring: i.recurring,
        effectiveMonth: i.effectiveMonth,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    expenses: (source.expenses ?? [])
      .map((e) => ({
        id: e.id,
        sourceKind: e.sourceKind,
        sourceId: e.sourceId ?? null,
        sourceName: e.sourceName ?? null,
        amount: e.amount,
        currency: e.currency,
        recurring: e.recurring,
        effectiveMonth: e.effectiveMonth,
        endMonth: e.endMonth ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
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
          dedicationPercentage: draft.dedicationPercentage,
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
