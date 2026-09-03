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
  type GoalWorkspaceItem,
  type GoalsWorkspace,
  type GoalsWorkspaceSource,
  buildGoalsWorkspace,
  buildCurrentGoalsPlanWorkspace,
} from './goals'
import {
  type GoalCreationAllocation,
  type GoalCreationImpact,
  getNextCalendarMonthStr,
  rebalanceAllocationEntries,
  selectGoalPlanSnapshot,
} from './goal-creation'
import {
  addGoalAllocationAmounts,
  buildGoalAllocationEntries,
  calculatePercentageSum,
} from './goal-proposal-allocation'
import { buildGoalProposalSource } from './goal-proposal-source'
import { findGoalInWorkspace, getAllocatedMonthlyAmounts } from './goal-proposal-workspace'
import {
  serializeGoalFinancialSources,
  serializeGoalProfile,
  serializeGoalSourceCollections,
  serializeAllocationEntries,
} from './goal-proposal-serialization'
import type { GoalCreationAllocationEntry } from './goal-proposal-allocation'
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
  goalCurrency: CurrencyCode
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

export function selectGoalLifecycleAllocation(
  snapshots: GoalsWorkspaceSource['snapshots'],
  allocations: GoalsWorkspaceSource['allocations'],
  currentMonth: string,
  kind: 'current' | 'pending',
): GoalLifecycleContext['currentAllocation'] {
  const currentMonthKey = currentMonth.slice(0, 7)
  const snapshot = snapshots
    .filter((candidate) =>
      kind === 'current'
        ? candidate.effectiveMonth.slice(0, 7) <= currentMonthKey
        : candidate.effectiveMonth.slice(0, 7) > currentMonthKey,
    )
    .sort((a, b) =>
      kind === 'current'
        ? b.effectiveMonth.localeCompare(a.effectiveMonth)
        : a.effectiveMonth.localeCompare(b.effectiveMonth),
    )[0]

  if (!snapshot) return undefined

  return {
    effectiveMonth: snapshot.effectiveMonth,
    entries: allocations
      .filter((allocation) => allocation.snapshotId === snapshot.id)
      .map(({ goalId, percentage }) => ({ goalId, percentage })),
  }
}

type LifecycleGoal = GoalsWorkspaceSource['goals'][number]
type LifecycleAllocationDraft = NonNullable<
  NonNullable<BuildGoalLifecycleProposalInput['draft']>['allocations']
>

function validateLifecycleTarget(
  lifecycle: GoalLifecycle,
  goalId: string,
  goals: LifecycleGoal[],
): LifecycleGoal {
  const targetGoal = goals.find((goal) => goal.id === goalId)
  if (!targetGoal) throw new Error('Goal not found.')
  if (lifecycle === 'pause' && targetGoal.status !== 'active') {
    throw new Error('Only active goals can be paused.')
  }
  if (lifecycle === 'resume' && targetGoal.status !== 'paused') {
    throw new Error('Only paused goals can be resumed.')
  }
  return targetGoal
}

function buildLifecycleAllocationEntries(
  sourceAllocs: GoalsWorkspaceSource['allocations'],
  activeGoals: LifecycleGoal[],
): GoalCreationAllocationEntry[] {
  return buildGoalAllocationEntries({ sourceAllocs, activeGoals })
}

function buildLifecycleBaseEntries(
  sourceAllocs: GoalsWorkspaceSource['allocations'],
  activeGoals: LifecycleGoal[],
): GoalCreationAllocationEntry[] {
  if (sourceAllocs.length > 0) return buildLifecycleAllocationEntries(sourceAllocs, activeGoals)
  return activeGoals.map((goal) => ({
    goalId: goal.id,
    goalName: goal.name,
    percentage: activeGoals.length === 1 ? '100.00' : '0.00',
    pending: false,
  }))
}

function hasExactLifecycleDraft(
  draftEntries: LifecycleAllocationDraft,
  goals: LifecycleGoal[],
): boolean {
  const expectedIds = new Set(goals.map((goal) => goal.id))
  const submittedIds = new Set(draftEntries.map((entry) => entry.goalId))
  return (
    submittedIds.size === expectedIds.size &&
    draftEntries.length === goals.length &&
    [...expectedIds].every((id) => submittedIds.has(id))
  )
}

function buildPauseDraftEntries(input: {
  targetGoal: LifecycleGoal
  proposedActiveGoals: LifecycleGoal[]
  draftEntries: LifecycleAllocationDraft
}): GoalCreationAllocationEntry[] {
  const { targetGoal, proposedActiveGoals, draftEntries } = input
  const submittedIds = new Set(draftEntries.map((entry) => entry.goalId))
  const targetEntry = draftEntries.find((entry) => entry.goalId === targetGoal.id)
  const includesTargetAtZero = submittedIds.has(targetGoal.id) &&
    new BigNumber((targetEntry?.percentage ?? '0').replace(',', '.')).isZero()
  const effectiveSubmittedIds = new Set(
    draftEntries.map((entry) => entry.goalId).filter((id) => id !== targetGoal.id),
  )
  const remainingIds = new Set(proposedActiveGoals.map((goal) => goal.id))
  const isMatch =
    effectiveSubmittedIds.size === remainingIds.size &&
    [...remainingIds].every((id) => effectiveSubmittedIds.has(id)) &&
    (draftEntries.length === proposedActiveGoals.length ||
      (includesTargetAtZero && draftEntries.length === proposedActiveGoals.length + 1))
  if (!isMatch) throw new Error('Allocation draft must contain exactly the active goals')

  return [
    { goalId: targetGoal.id, goalName: targetGoal.name, percentage: '0.00', pending: false },
    ...proposedActiveGoals.map((goal) => ({
      goalId: goal.id,
      goalName: goal.name,
      percentage: new BigNumber(
        (draftEntries.find((entry) => entry.goalId === goal.id)?.percentage || '0').replace(',', '.'),
      ).toFixed(2),
      pending: false,
    })),
  ]
}

function buildPauseEntries(input: {
  targetGoal: LifecycleGoal
  existingActiveGoals: LifecycleGoal[]
  proposedActiveGoals: LifecycleGoal[]
  sourceAllocs: GoalsWorkspaceSource['allocations']
  draft: BuildGoalLifecycleProposalInput['draft']
  pauseMonthlyCommitment: boolean
}): GoalCreationAllocationEntry[] {
  const {
    targetGoal,
    existingActiveGoals,
    proposedActiveGoals,
    sourceAllocs,
    draft,
    pauseMonthlyCommitment,
  } = input
  if (pauseMonthlyCommitment) {
    return [{ goalId: targetGoal.id, goalName: targetGoal.name, percentage: '0.00', pending: false }]
  }

  const baseEntries = buildLifecycleBaseEntries(sourceAllocs, existingActiveGoals)
  if (draft?.allocations && draft.allocations.length > 0) {
    const entries = buildPauseDraftEntries({ targetGoal, proposedActiveGoals, draftEntries: draft.allocations })
    const activeTotal = calculatePercentageSum(entries.filter((entry) => entry.goalId !== targetGoal.id))
    if (!activeTotal.isEqualTo(100)) {
      throw new Error(`Allocation percentages must sum to 100%, got ${activeTotal.toFixed(2)}%`)
    }
    return entries
  }

  const rebalanced = rebalanceAllocationEntries(baseEntries, targetGoal.id, '0.00')
  const targetEntry = rebalanced.find((entry) => entry.goalId === targetGoal.id) ?? {
    goalId: targetGoal.id,
    goalName: targetGoal.name,
    percentage: '0.00',
    pending: false,
  }
  const otherEntries = rebalanced.filter((entry) => entry.goalId !== targetGoal.id)
  const activeTotal = calculatePercentageSum(otherEntries)
  if (!activeTotal.isEqualTo(100)) {
    throw new Error(`Allocation percentages must sum to 100%, got ${activeTotal.toFixed(2)}%`)
  }
  return [targetEntry, ...otherEntries]
}

function buildResumeEntries(input: {
  targetGoal: LifecycleGoal
  existingActiveGoals: LifecycleGoal[]
  proposedActiveGoals: LifecycleGoal[]
  sourceAllocs: GoalsWorkspaceSource['allocations']
  draft: BuildGoalLifecycleProposalInput['draft']
}): GoalCreationAllocationEntry[] {
  const { targetGoal, existingActiveGoals, proposedActiveGoals, sourceAllocs, draft } = input
  const baseEntries = buildLifecycleBaseEntries(sourceAllocs, existingActiveGoals)
  if (draft?.allocations) {
    if (!hasExactLifecycleDraft(draft.allocations, proposedActiveGoals)) {
      throw new Error('Allocation draft must contain exactly the active goals')
    }
    const entries = [targetGoal, ...existingActiveGoals].map((goal) => ({
      goalId: goal.id,
      goalName: goal.name,
      percentage: new BigNumber(
        (draft.allocations!.find((entry) => entry.goalId === goal.id)?.percentage || '0').replace(',', '.'),
      ).toFixed(2),
      pending: false,
    }))
    const total = calculatePercentageSum(entries)
    if (!total.isEqualTo(100)) {
      throw new Error(`Allocation percentages must sum to 100%, got ${total.toFixed(2)}%`)
    }
    return entries
  }

  const entries = [
    {
      goalId: targetGoal.id,
      goalName: targetGoal.name,
      percentage: existingActiveGoals.length === 0 ? '100.00' : '0.00',
      pending: false,
    },
    ...baseEntries,
  ]
  const total = calculatePercentageSum(entries)
  if (!total.isEqualTo(100)) {
    throw new Error(`Allocation percentages must sum to 100%, got ${total.toFixed(2)}%`)
  }
  return entries
}

function getLifecycleMonthlyContribution(
  state: GoalLifecycleState,
  pauseMonthlyCommitment: boolean,
): Money | undefined {
  const contribution = state.source.profile?.plannedMonthlyContribution
  if (pauseMonthlyCommitment || contribution === null || contribution === undefined) return undefined
  return createMoney(contribution, state.source.profile?.baseCurrency ?? 'ARS')
}

function addLifecycleAllocationAmounts(input: {
  entries: GoalCreationAllocationEntry[]
  monthlyContribution: Money | undefined
  allGoals: LifecycleGoal[]
}): GoalCreationAllocationEntry[] {
  return addGoalAllocationAmounts({
    entries: input.entries,
    monthlyContribution: input.monthlyContribution,
    currencies: new Map(input.allGoals.map((goal) => [goal.id, goal.currency])),
  })
}

function buildLifecycleProposedSource(input: {
  state: GoalLifecycleState
  goalId: string
  allGoals: LifecycleGoal[]
  nextMonthStr: string
  nextMonthEffective: string
  persistedEntries: Array<{ goalId: string; percentage: string }>
  pauseMonthlyCommitment: boolean
  nextStatus: GoalStatus
}): GoalsWorkspaceSource {
  const snapshotId = input.state.pendingSnapshots.find(
    (snapshot) => snapshot.effectiveMonth === input.nextMonthEffective,
  )?.id ?? `snap-allocation-${input.nextMonthStr}`
  return buildGoalProposalSource({
    source: input.state.source,
    pendingSnapshot: input.state.pendingSnapshots.find(
      (snapshot) => snapshot.effectiveMonth === input.nextMonthEffective,
    ),
    snapshotId,
    effectiveMonth: input.nextMonthEffective,
    entries: input.persistedEntries,
    goals: input.allGoals.map((goal) =>
      goal.id === input.goalId ? { ...goal, status: input.nextStatus } : goal,
    ),
    investmentPositions: input.state.source.investmentPositions,
    profile: input.state.source.profile
      ? {
          ...input.state.source.profile,
          plannedMonthlyContribution: input.pauseMonthlyCommitment
            ? null
            : input.state.source.profile.plannedMonthlyContribution,
        }
      : null,
  })
}

function getLifecycleProjection(goal: GoalWorkspaceItem | undefined): GoalProjection {
  return goal?.projection ?? { status: 'target_unavailable' }
}

function getLifecycleEntryAmount(
  entries: GoalCreationAllocationEntry[],
  goalId: string,
): Money | undefined {
  return entries.find((entry) => entry.goalId === goalId)?.allocatedDestinationAmount
}

function lifecycleAmountsChanged(before: Money | undefined, after: Money | undefined): boolean {
  return before?.amount !== after?.amount || before?.currency !== after?.currency
}

function buildLifecycleTargetImpact(input: {
  targetGoal: LifecycleGoal
  beforeWorkspace: GoalsWorkspace
  afterWorkspace: GoalsWorkspace
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
}): GoalCreationImpact {
  const { targetGoal, beforeWorkspace, afterWorkspace, selectedSnapshot } = input
  const beforeGoal = findGoalInWorkspace(beforeWorkspace, targetGoal.id)
  const afterGoal = findGoalInWorkspace(afterWorkspace, targetGoal.id)
  return {
    goalId: targetGoal.id,
    goalName: targetGoal.name,
    before: {
      status: 'existing',
      projection: beforeGoal?.projection ?? { status: 'target_unavailable' },
      allocatedMonthlyAmounts: getAllocatedMonthlyAmounts(beforeGoal, selectedSnapshot),
    },
    after: afterGoal?.projection ?? { status: 'target_unavailable' },
  }
}

function buildLifecycleOtherImpact(input: {
  goal: LifecycleGoal
  beforeWorkspace: GoalsWorkspace
  afterWorkspace: GoalsWorkspace
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  displayEntries: GoalCreationAllocationEntry[]
}): GoalCreationImpact | undefined {
  const { goal, beforeWorkspace, afterWorkspace, selectedSnapshot, displayEntries } = input
  const beforeGoal = findGoalInWorkspace(beforeWorkspace, goal.id)
  const afterGoal = findGoalInWorkspace(afterWorkspace, goal.id)
  const beforeProjection = getLifecycleProjection(beforeGoal)
  const afterProjection = getLifecycleProjection(afterGoal)
  const beforeAmounts = getAllocatedMonthlyAmounts(beforeGoal, selectedSnapshot)
  const beforeAmount = beforeAmounts[0]
  const afterAmount = getLifecycleEntryAmount(displayEntries, goal.id)
  const amountsChanged = lifecycleAmountsChanged(beforeAmount, afterAmount)
  if (!amountsChanged && JSON.stringify(beforeProjection) === JSON.stringify(afterProjection)) {
    return undefined
  }
  return {
    goalId: goal.id,
    goalName: goal.name,
    before: {
      status: 'existing',
      projection: beforeProjection,
      allocatedMonthlyAmounts: beforeAmounts,
    },
    after: afterProjection,
  }
}

function buildLifecycleImpacts(input: {
  allGoals: LifecycleGoal[]
  targetGoal: LifecycleGoal
  beforeWorkspace: GoalsWorkspace
  afterWorkspace: GoalsWorkspace
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  displayEntries: GoalCreationAllocationEntry[]
}): GoalCreationImpact[] {
  const { allGoals, targetGoal, beforeWorkspace, afterWorkspace, selectedSnapshot, displayEntries } = input
  const impacts: GoalCreationImpact[] = [
    buildLifecycleTargetImpact({ targetGoal, beforeWorkspace, afterWorkspace, selectedSnapshot }),
  ]
  for (const goal of allGoals) {
    if (goal.id === targetGoal.id) continue
    const impact = buildLifecycleOtherImpact({
      goal,
      beforeWorkspace,
      afterWorkspace,
      selectedSnapshot,
      displayEntries,
    })
    if (impact) impacts.push(impact)
  }
  return impacts
}

function buildLifecycleSetup(input: BuildGoalLifecycleProposalInput) {
  const allGoals = input.state.source.goals
  const targetGoal = validateLifecycleTarget(input.lifecycle, input.goalId, allGoals)
  const nextStatus: GoalStatus = input.lifecycle === 'pause' ? 'paused' : 'active'
  const nextMonthStr = getNextCalendarMonthStr(input.currentMonth)
  const nextMonthEffective = `${nextMonthStr}-01`
  const existingActiveGoals = allGoals.filter((goal) => goal.status === 'active')
  const proposedActiveGoals = input.lifecycle === 'pause'
    ? existingActiveGoals.filter((goal) => goal.id !== input.goalId)
    : [targetGoal, ...existingActiveGoals]
  const pauseMonthlyCommitment = input.lifecycle === 'pause' && proposedActiveGoals.length === 0
  const plan = selectGoalPlanSnapshot(
    input.state.source,
    input.state.pendingSnapshots,
    input.state.pendingAllocations,
    input.currentMonth,
  )
  return {
    ...input,
    allGoals,
    targetGoal,
    nextStatus,
    nextMonthStr,
    nextMonthEffective,
    existingActiveGoals,
    proposedActiveGoals,
    pauseMonthlyCommitment,
    selectedSnapshot: plan.snapshot,
    sourceAllocs: plan.allocations,
  }
}

function buildLifecycleAllocation(input: ReturnType<typeof buildLifecycleSetup>) {
  const displayEntries = input.lifecycle === 'pause'
    ? buildPauseEntries({
        targetGoal: input.targetGoal,
        existingActiveGoals: input.existingActiveGoals,
        proposedActiveGoals: input.proposedActiveGoals,
        sourceAllocs: input.sourceAllocs,
        draft: input.draft,
        pauseMonthlyCommitment: input.pauseMonthlyCommitment,
      })
    : buildResumeEntries({
        targetGoal: input.targetGoal,
        existingActiveGoals: input.existingActiveGoals,
        proposedActiveGoals: input.proposedActiveGoals,
        sourceAllocs: input.sourceAllocs,
        draft: input.draft,
      })
  const persistedEntries = displayEntries
    .filter((entry) => input.lifecycle !== 'pause' || entry.goalId !== input.targetGoal.id)
    .map((entry) => ({ goalId: entry.goalId, percentage: entry.percentage }))
  const monthlyContribution = getLifecycleMonthlyContribution(
    input.state,
    input.pauseMonthlyCommitment,
  )
  const entries = addLifecycleAllocationAmounts({
    entries: displayEntries,
    monthlyContribution,
    allGoals: input.allGoals,
  })
  const totalPercentage = input.pauseMonthlyCommitment
    ? '0.00'
    : calculatePercentageSum(
        input.lifecycle === 'pause'
          ? entries.filter((entry) => entry.goalId !== input.targetGoal.id)
          : entries,
      ).toFixed(2)
  return {
    displayEntries: entries,
    persistedEntries,
    persistedAllocation: { effectiveMonth: input.nextMonthEffective, entries: persistedEntries },
    allocation: {
      monthlyContribution,
      effectiveMonth: input.nextMonthEffective,
      entries,
      totalPercentage,
    } satisfies GoalCreationAllocation,
  }
}

function buildLifecycleWorkspaces(
  input: ReturnType<typeof buildLifecycleSetup>,
  allocation: ReturnType<typeof buildLifecycleAllocation>,
) {
  const beforeWorkspace = buildCurrentGoalsPlanWorkspace(input.state, input.currentMonth)
  const proposedSource = buildLifecycleProposedSource({
    state: input.state,
    goalId: input.goalId,
    allGoals: input.allGoals,
    nextMonthStr: input.nextMonthStr,
    nextMonthEffective: input.nextMonthEffective,
    persistedEntries: allocation.persistedEntries,
    pauseMonthlyCommitment: input.pauseMonthlyCommitment,
    nextStatus: input.nextStatus,
  })
  const afterWorkspace = buildGoalsWorkspace(proposedSource, input.currentMonth)
  const impacts = buildLifecycleImpacts({
    allGoals: input.allGoals,
    targetGoal: input.targetGoal,
    beforeWorkspace,
    afterWorkspace,
    selectedSnapshot: input.selectedSnapshot,
    displayEntries: allocation.displayEntries,
  })
  return { proposedSource, impacts }
}

export function buildGoalLifecycleProposal(
  input: BuildGoalLifecycleProposalInput,
): GoalLifecycleProposal {
  const setup = buildLifecycleSetup(input)
  const allocation = buildLifecycleAllocation(setup)
  const workspaces = buildLifecycleWorkspaces(setup, allocation)
  return {
    lifecycle: input.lifecycle,
    goalId: input.goalId,
    nextStatus: setup.nextStatus,
    transition: {
      goalId: input.goalId,
      status: setup.nextStatus,
    },
    pauseMonthlyCommitment: setup.pauseMonthlyCommitment,
    allocation: allocation.allocation,
    persistedAllocation: allocation.persistedAllocation,
    impacts: workspaces.impacts,
    proposedSource: workspaces.proposedSource,
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
    profile: serializeGoalProfile(source.profile, true),
    ...serializeGoalFinancialSources(source),
    ...serializeGoalSourceCollections(source, pendingSnapshots, pendingAllocations),
    draft: draft
      ? {
           allocations: serializeAllocationEntries(draft.allocations ?? []),
        }
      : null,
  }

  return JSON.stringify(normalized)
}
