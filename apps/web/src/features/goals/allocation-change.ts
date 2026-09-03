import {
  type CurrencyCode,
  type Money,
} from '../../lib/money'
import { PLANNING_ARS_PER_USD } from '../financial/financial'
import {
  type GoalProjection,
  type GoalsFinancialSummary,
  type GoalsWorkspace,
  type GoalsWorkspaceSource,
  buildGoalsWorkspace,
  buildCurrentGoalsPlanWorkspace,
} from './goals'
import {
  type GoalCreationAllocation,
} from './goal-creation'
import {
  addGoalAllocationAmounts,
  buildGoalAllocationEntries,
  calculatePercentageSum,
  overlayGoalAllocationPercentages,
} from './goal-proposal-allocation'
import { buildGoalProposalSource } from './goal-proposal-source'
import { findGoalInWorkspace, getAllocatedMonthlyAmounts } from './goal-proposal-workspace'
import {
  serializeAllocationEntries,
  serializeGoalFinancialSources,
  serializeGoalProfile,
  serializeGoalSourceCollections,
} from './goal-proposal-serialization'
import type { GoalCreationAllocationEntry } from './goal-proposal-allocation'
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
    projection: GoalProjection
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

type AllocationGoal = GoalsWorkspaceSource['goals'][number]

function findCurrentAllocationSnapshot(
  snapshots: GoalsWorkspaceSource['snapshots'],
  currentMonth: string,
): GoalsWorkspaceSource['snapshots'][number] | undefined {
  return snapshots
    .filter((snapshot) => snapshot.effectiveMonth.slice(0, 7) <= currentMonth.slice(0, 7))
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))[0]
}

function selectAllocationChangeBaseline(input: {
  state: AllocationChangeState
  currentMonth: string
}): {
  pendingSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  sourceAllocs: GoalsWorkspaceSource['allocations']
  effectiveMonth: string
} {
  const { state, currentMonth } = input
  const pendingSnapshot = state.pendingSnapshots[0]
  const selectedSnapshot = pendingSnapshot ?? findCurrentAllocationSnapshot(state.source.snapshots, currentMonth)
  const sourceAllocs = selectedSnapshot
    ? (pendingSnapshot ? state.pendingAllocations : state.source.allocations).filter(
        (allocation) => allocation.snapshotId === selectedSnapshot.id,
      )
    : []
  return {
    pendingSnapshot,
    selectedSnapshot,
    sourceAllocs,
    effectiveMonth: `${currentMonth.slice(0, 7)}-01`,
  }
}

function buildAllocationChangeEntries(
  sourceAllocs: GoalsWorkspaceSource['allocations'],
  activeGoals: AllocationGoal[],
): GoalCreationAllocationEntry[] {
  if (sourceAllocs.length === 0) {
    return activeGoals.map((goal) => ({
      goalId: goal.id,
      goalName: goal.name,
      percentage: '0.00',
      pending: false,
    }))
  }
  return buildGoalAllocationEntries({ sourceAllocs, activeGoals })
}

function applyAllocationChangeDraft(
  entries: GoalCreationAllocationEntry[],
  draft: AllocationChangeDraft | undefined,
): GoalCreationAllocationEntry[] {
  return overlayGoalAllocationPercentages(entries, draft?.allocations, true)
}

function addAllocationChangeAmounts(input: {
  entries: GoalCreationAllocationEntry[]
  monthlyContribution: Money
  activeGoals: AllocationGoal[]
}): GoalCreationAllocationEntry[] {
  return addGoalAllocationAmounts({
    entries: input.entries,
    monthlyContribution: input.monthlyContribution,
    currencies: new Map(input.activeGoals.map((goal) => [goal.id, goal.currency])),
  })
}

function buildAllocationChangeProposedSource(input: {
  state: AllocationChangeState
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  effectiveMonth: string
  entries: GoalCreationAllocationEntry[]
  dedicationPercentage: number
}): GoalsWorkspaceSource {
  const targetMonth = input.effectiveMonth.slice(0, 7)
  const currentSnapshot = input.state.source.snapshots.find(
    (snapshot) => snapshot.effectiveMonth.slice(0, 7) === targetMonth,
  )
  const snapshotId = currentSnapshot?.id ?? `snap-allocation-${targetMonth}`
  return buildGoalProposalSource({
    source: input.state.source,
    snapshotId,
    effectiveMonth: input.effectiveMonth,
    entries: input.entries,
    goals: input.state.source.goals,
    investmentPositions: input.state.source.investmentPositions,
    profile: input.state.source.profile
      ? {
          ...input.state.source.profile,
          goalDedicationPercentage: String(input.dedicationPercentage),
        }
      : null,
  })
}

function buildAllocationChangeImpacts(input: {
  activeGoals: AllocationGoal[]
  beforeWorkspace: GoalsWorkspace
  afterWorkspace: GoalsWorkspace
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
}): AllocationChangeProposal['impacts'] {
  const { activeGoals, beforeWorkspace, afterWorkspace, selectedSnapshot } = input
  return activeGoals.map((goal) => {
    const beforeGoal = findGoalInWorkspace(beforeWorkspace, goal.id)
    const afterGoal = findGoalInWorkspace(afterWorkspace, goal.id)
    return {
      goalId: goal.id,
      goalName: goal.name,
      before: {
        status: 'existing',
        projection: beforeGoal?.projection ?? { status: 'target_unavailable' },
        allocatedMonthlyAmounts: getAllocatedMonthlyAmounts(beforeGoal, selectedSnapshot),
      },
      after: afterGoal?.projection ?? { status: 'target_unavailable' },
    }
  })
}

export function buildAllocationChangeProposal(
  input: BuildAllocationChangeProposalInput,
): AllocationChangeProposal {
  const { draft, state, currentMonth } = input

  const activeGoals = state.source.goals.filter((goal) => goal.status === 'active')
  const baseline = selectAllocationChangeBaseline({ state, currentMonth })
  const entries = applyAllocationChangeDraft(
    buildAllocationChangeEntries(baseline.sourceAllocs, activeGoals),
    draft,
  )
  const totalBn = calculatePercentageSum(entries)
  if (!totalBn.isEqualTo(100)) {
    throw new Error(`Allocation percentages must sum to 100%, got ${totalBn.toFixed(2)}%`)
  }

  const dedicationPercentage =
    draft !== undefined
      ? draft.dedicationPercentage
      : Number(state.source.profile?.goalDedicationPercentage ?? 90)
  const proposedSource = buildAllocationChangeProposedSource({
    state,
    selectedSnapshot: baseline.selectedSnapshot,
    effectiveMonth: baseline.effectiveMonth,
    entries,
    dedicationPercentage,
  })

  const beforeWorkspace = buildCurrentGoalsPlanWorkspace(state, currentMonth)
  const afterWorkspace = buildGoalsWorkspace(proposedSource, currentMonth)

  const monthlyContribution = afterWorkspace.financialSummary.contribution
  const entriesWithAmounts = addAllocationChangeAmounts({ entries, monthlyContribution, activeGoals })

  const allocation: GoalCreationAllocation = {
    monthlyContribution,
    effectiveMonth: baseline.effectiveMonth,
    entries: entriesWithAmounts,
    totalPercentage: totalBn.toFixed(2),
  }
  const impacts = buildAllocationChangeImpacts({
    activeGoals,
    beforeWorkspace,
    afterWorkspace,
    selectedSnapshot: baseline.selectedSnapshot,
  })

  return {
    dedicationPercentage,
    allocation,
    impacts,
    proposedSource,
  }
}

function normalizeAllocationChangeState(
  stateOrSource: AllocationChangeState | GoalsWorkspaceSource,
): AllocationChangeState {
  if ('source' in stateOrSource && stateOrSource.source) return stateOrSource as AllocationChangeState
  return {
    source: stateOrSource as GoalsWorkspaceSource,
    pendingSnapshots: [],
    pendingAllocations: [],
  }
}

export function serializeAllocationChangeState(
  stateOrSource: AllocationChangeState | GoalsWorkspaceSource,
  currentMonth: string,
  draft?: AllocationChangeDraft,
): string {
  const state = normalizeAllocationChangeState(stateOrSource)
  return JSON.stringify({
    currentMonth,
    planningArsPerUsd: PLANNING_ARS_PER_USD,
    profile: serializeGoalProfile(state.source.profile, true),
    ...serializeGoalFinancialSources(state.source),
    ...serializeGoalSourceCollections(
      state.source,
      state.pendingSnapshots,
      state.pendingAllocations,
    ),
    draft: draft
      ? { dedicationPercentage: draft.dedicationPercentage, allocations: serializeAllocationEntries(draft.allocations ?? []) }
      : null,
  })
}
