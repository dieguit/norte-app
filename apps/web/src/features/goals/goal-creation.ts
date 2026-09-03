import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  createMoney,
  isPositiveMoney,
  parseMoneyInput,
} from '../../lib/money'
import {
  PLANNING_ARS_PER_USD,
  deriveEmergencyFundTarget,
} from '../financial/financial'
import { getExpenseTotalArs } from '../financial/expenses'
import {
  type GoalPriority,
  type GoalProjection,
  type GoalStatus,
  type GoalStrategy,
  type GoalsWorkspace,
  type GoalsWorkspaceSource,
  type InvestmentAvailability,
  buildGoalsWorkspace,
  buildCurrentGoalsPlanWorkspace,
} from './goals'
import type { GoalCreationDraft } from './goal-creation.schema'
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
  serializeGoalProfile,
  serializeGoalSourceCollections,
} from './goal-proposal-serialization'
import type { GoalCreationAllocationEntry } from './goal-proposal-allocation'

export type { GoalCreationAllocationEntry } from './goal-proposal-allocation'
export { calculatePercentageSum, recalculateAllocationAmounts } from './goal-proposal-allocation'

export const PENDING_GOAL_ID = 'pending-goal'

export interface GoalCreationContext {
  currentMonth: string
  expensesKnowledge: 'known' | 'unknown'
  hasEmergencyFund: boolean
  plannedMonthlyContribution?: Money
  currentAllocation?: {
    effectiveMonth: string
    entries: Array<{
      goalId: string
      percentage: string
    }>
  }
}

export interface GoalEditContext {
  goalId: string
  status?: GoalStatus
  draft: GoalCreationDraft
  context: GoalCreationContext
}

export interface GoalCreationState {
  source: GoalsWorkspaceSource
  pendingSnapshots: GoalsWorkspaceSource['snapshots']
  pendingAllocations: GoalsWorkspaceSource['allocations']
}

export interface GoalCreationAllocation {
  monthlyContribution?: Money
  effectiveMonth: string
  entries: GoalCreationAllocationEntry[]
  totalPercentage: string
}

export type GoalCreationBefore =
  | { status: 'not_created' }
  | { status: 'existing'; projection: GoalProjection; allocatedMonthlyAmounts: Money[] }

export interface GoalCreationImpact {
  goalId: string
  goalName: string
  before: GoalCreationBefore
  after: GoalProjection
}

export interface GoalCreationProposal {
  normalizedGoal: {
    name: string
    type: 'emergency_fund' | 'purchase' | 'retirement' | 'other'
    targetAmount?: Money
    currency: CurrencyCode
    priority: GoalPriority
    strategy: GoalStrategy
    desiredDate?: string
    emergencyFundMonths?: number
  }
  investment?: {
    annualReturnRate: string
    availability: InvestmentAvailability
    availableFrom?: string
  }
  allocation: GoalCreationAllocation
  impacts: GoalCreationImpact[]
  proposedSource: GoalsWorkspaceSource
}

export interface GoalCreationPreviewResult {
  proposal: GoalCreationProposal
  previewToken: string
}

export function getNextCalendarMonthStr(currentMonth: string): string {
  const [year, month] = currentMonth.slice(0, 7).split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) + 1
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`
}

export function selectGoalPlanSnapshot(
  source: Pick<GoalsWorkspaceSource, 'snapshots' | 'allocations'>,
  pendingSnapshots: GoalsWorkspaceSource['snapshots'] | undefined,
  pendingAllocations: GoalsWorkspaceSource['allocations'] | undefined,
  currentMonth: string,
): {
  snapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  allocations: GoalsWorkspaceSource['allocations']
  pendingSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
} {
  const nextMonthStr = getNextCalendarMonthStr(currentMonth)
  const pendingNextSnapshot = pendingSnapshots?.find(
    (snapshot) => snapshot.effectiveMonth.slice(0, 7) === nextMonthStr,
  )
  const sourceNextSnapshot = source.snapshots.find(
    (snapshot) => snapshot.effectiveMonth.slice(0, 7) === nextMonthStr,
  )
  const currentSnapshot = source.snapshots
    .filter((snapshot) => snapshot.effectiveMonth.slice(0, 7) <= currentMonth.slice(0, 7))
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))[0]
  const snapshot = pendingNextSnapshot ?? sourceNextSnapshot ?? currentSnapshot
  const allocations = snapshot
    ? (pendingNextSnapshot ? (pendingAllocations ?? []) : source.allocations).filter(
        (allocation) => allocation.snapshotId === snapshot.id,
      )
    : []

  return { snapshot, allocations, pendingSnapshot: pendingNextSnapshot }
}

export function allocationEntriesMatch(
  draftEntries: ReadonlyArray<{ goalId: string; percentage: string }>,
  proposalEntries: ReadonlyArray<{ goalId: string; percentage: string }>,
): boolean {
  if (draftEntries.length !== proposalEntries.length) return false
  const draftIds = new Set(draftEntries.map((entry) => entry.goalId))
  const proposalIds = new Set(proposalEntries.map((entry) => entry.goalId))
  if (draftIds.size !== draftEntries.length || proposalIds.size !== proposalEntries.length) return false
  if (![...draftIds].every((goalId) => proposalIds.has(goalId))) return false

  return draftEntries.every((draftEntry) => {
    const proposalEntry = proposalEntries.find((entry) => entry.goalId === draftEntry.goalId)
    if (!proposalEntry) return false

    try {
      const draftPercentage = new BigNumber(
        (draftEntry.percentage || '0').trim().replace(',', '.'),
      )
      const proposalPercentage = new BigNumber(
        (proposalEntry.percentage || '0').trim().replace(',', '.'),
      )
      if (
        !draftPercentage.isFinite() ||
        draftPercentage.isNaN() ||
        !proposalPercentage.isFinite() ||
        proposalPercentage.isNaN()
      ) {
        return false
      }
      return draftPercentage.toFixed(2) === proposalPercentage.toFixed(2)
    } catch {
      return false
    }
  })
}

function parseRebalancePercentage(nextPercentage: string): BigNumber | null {
  const normalizedInput = (nextPercentage ?? '').trim().replace(',', '.')
  if (normalizedInput === '') return null
  try {
    const percentage = new BigNumber(normalizedInput)
    return percentage.isFinite() && !percentage.isNaN() && percentage.isGreaterThanOrEqualTo(0) &&
      percentage.isLessThanOrEqualTo(100)
      ? percentage
      : null
  } catch {
    return null
  }
}

function rebalanceOtherEntries<T extends { goalId: string; percentage: string }>(
  others: T[],
  remaining: BigNumber,
): Map<string, string> {
  const arithmeticEntries = [...others].sort((a, b) => a.goalId.localeCompare(b.goalId))
  const percentageOf = (entry: { percentage: string }) => {
    try {
      const bn = new BigNumber((entry.percentage || '0').replace(',', '.'))
      return bn.isFinite() && !bn.isNaN() && bn.isGreaterThanOrEqualTo(0) ? bn : new BigNumber(0)
    } catch {
      return new BigNumber(0)
    }
  }
  const previousTotal = arithmeticEntries.reduce((sum, e) => sum.plus(percentageOf(e)), new BigNumber(0))
  const shares = previousTotal.isZero()
    ? arithmeticEntries.map(() => new BigNumber(1).dividedBy(arithmeticEntries.length))
    : arithmeticEntries.map((entry) => percentageOf(entry).dividedBy(previousTotal))

  const allocatedOthersMap = new Map<string, string>()
  let accumulatedBn = new BigNumber(0)

  for (let i = 0; i < arithmeticEntries.length; i++) {
    const other = arithmeticEntries[i]
    if (i === arithmeticEntries.length - 1) {
      const lastAmountBn = remaining.minus(accumulatedBn)
      allocatedOthersMap.set(other.goalId, lastAmountBn.toFixed(2))
    } else {
      const amountBn = remaining.times(shares[i])
      const roundedStr = amountBn.toFixed(2)
      accumulatedBn = accumulatedBn.plus(new BigNumber(roundedStr))
      allocatedOthersMap.set(other.goalId, roundedStr)
    }
  }
  return allocatedOthersMap
}

export function rebalanceAllocationEntries<T extends { goalId: string; percentage: string }>(
  entries: T[],
  selectedGoalId: string,
  nextPercentage: string,
): T[] {
  const selected = parseRebalancePercentage(nextPercentage)
  if (selected === null) {
    return entries.map((entry) =>
      entry.goalId === selectedGoalId ? { ...entry, percentage: nextPercentage } : entry,
    )
  }
  const others = entries.filter((entry) => entry.goalId !== selectedGoalId)
  if (others.length === 0) {
    return entries.map((entry) =>
      entry.goalId === selectedGoalId ? { ...entry, percentage: '100.00' } : entry,
    )
  }
  const allocatedOthersMap = rebalanceOtherEntries(others, new BigNumber(100).minus(selected))

  return entries.map((entry) => {
    if (entry.goalId === selectedGoalId) {
      return { ...entry, percentage: selected.toFixed(2) }
    }
    return { ...entry, percentage: allocatedOthersMap.get(entry.goalId)! }
  })
}

type GoalCreationInput = {
  draft: GoalCreationDraft
  state: GoalCreationState
  currentMonth: string
  subjectGoalId?: string
}

type GoalCreationSubject = {
  isEditing: boolean
  subjectGoalId: string
  subjectGoal: GoalsWorkspaceSource['goals'][number] | undefined
}

function resolveGoalCreationSubject(input: GoalCreationInput): GoalCreationSubject {
  const isEditing = input.subjectGoalId !== undefined
  const subjectGoalId = input.subjectGoalId ?? PENDING_GOAL_ID
  const subjectGoal = isEditing
    ? input.state.source.goals.find(
        (goal) => goal.id === subjectGoalId && (goal.status === 'active' || goal.status === 'paused'),
      )
    : undefined

  if (isEditing && !subjectGoal) {
    throw new Error('Goal not found or is not active.')
  }

  return { isEditing, subjectGoalId, subjectGoal }
}

function normalizeDesiredDate(desiredMonth: string | undefined): string | undefined {
  return desiredMonth && desiredMonth.trim() !== ''
    ? `${desiredMonth.slice(0, 7)}-01`
    : undefined
}

function deriveCreationEmergencyFundTarget(
  state: GoalCreationState,
  currentMonth: string,
): Money | undefined {
  const profile = state.source.profile
  const expenses = state.source.expenses
  if (profile?.expensesKnowledge !== 'known' || !expenses) return undefined

  const expensesTotal = getExpenseTotalArs(
    expenses.map((row) => ({
      amount: createMoney(row.amount, row.currency),
      recurring: row.recurring,
      effectiveMonth: row.effectiveMonth,
      endMonth: row.endMonth,
    })),
    currentMonth,
  )
  return isPositiveMoney(expensesTotal)
    ? deriveEmergencyFundTarget(expensesTotal, 3)
    : undefined
}

function normalizeCreationInvestment(
  draft: GoalCreationDraft,
): GoalCreationProposal['investment'] {
  if (draft.strategy !== 'invest') return undefined
  return {
    annualReturnRate: (draft.annualReturnRate || '8.0').replace(',', '.'),
    availability: draft.availability,
    availableFrom:
      draft.availability === 'available_from' && draft.availableFromMonth
        ? `${draft.availableFromMonth.slice(0, 7)}-01`
        : undefined,
  }
}

function normalizeGoalCreationDetails(input: Pick<GoalCreationInput, 'draft' | 'state' | 'currentMonth'>): Pick<
  GoalCreationProposal,
  'normalizedGoal' | 'investment'
> {
  const { draft, state, currentMonth } = input
  const normalizedGoal: GoalCreationProposal['normalizedGoal'] = {
    name: draft.name.trim(),
    type: draft.type,
    targetAmount:
      draft.type === 'emergency_fund'
        ? deriveCreationEmergencyFundTarget(state, currentMonth)
        : draft.targetAmount
          ? parseMoneyInput(draft.targetAmount, draft.currency) ?? undefined
          : undefined,
    currency: draft.currency,
    priority: draft.priority,
    strategy: draft.strategy,
    desiredDate: normalizeDesiredDate(draft.desiredMonth),
    emergencyFundMonths: draft.type === 'emergency_fund' ? 3 : undefined,
  }

  return { normalizedGoal, investment: normalizeCreationInvestment(draft) }
}

function buildUpdatedGoal(input: {
  state: GoalCreationState
  normalizedGoal: GoalCreationProposal['normalizedGoal']
  subjectGoal: GoalsWorkspaceSource['goals'][number]
}): GoalsWorkspaceSource['goals'][number] {
  const { state, normalizedGoal, subjectGoal } = input
  return {
    id: subjectGoal.id,
    userId: subjectGoal.userId ?? state.source.profile?.userId,
    name: normalizedGoal.name,
    type: normalizedGoal.type,
    targetAmount: normalizedGoal.targetAmount?.amount ?? null,
    currency: normalizedGoal.currency,
    priority: normalizedGoal.priority,
    strategy: normalizedGoal.strategy,
    status: subjectGoal.status,
    desiredDate: normalizedGoal.desiredDate ?? null,
    completedAt: subjectGoal.completedAt ?? null,
    emergencyFundMonths: normalizedGoal.emergencyFundMonths ?? null,
    createdAt: subjectGoal.createdAt,
  }
}

function buildPendingGoal(
  state: GoalCreationState,
  currentMonth: string,
  normalizedGoal: GoalCreationProposal['normalizedGoal'],
): GoalsWorkspaceSource['goals'][number] {
  return {
    id: PENDING_GOAL_ID,
    userId: state.source.profile?.userId,
    name: normalizedGoal.name,
    type: normalizedGoal.type,
    targetAmount: normalizedGoal.targetAmount?.amount ?? null,
    currency: normalizedGoal.currency,
    priority: normalizedGoal.priority,
    strategy: normalizedGoal.strategy,
    status: 'active',
    desiredDate: normalizedGoal.desiredDate ?? null,
    emergencyFundMonths: normalizedGoal.emergencyFundMonths ?? null,
    createdAt: `${currentMonth}-01T00:00:00.000Z`,
  }
}

function buildProposedGoal(input: {
  state: GoalCreationState
  currentMonth: string
  normalizedGoal: GoalCreationProposal['normalizedGoal']
  subject: GoalCreationSubject
}): GoalsWorkspaceSource['goals'] {
  const { state, currentMonth, normalizedGoal, subject } = input
  if (subject.isEditing && subject.subjectGoal) {
    const updatedGoal = buildUpdatedGoal({ state, normalizedGoal, subjectGoal: subject.subjectGoal })
    return state.source.goals.map((goal) =>
      goal.id === subject.subjectGoalId ? updatedGoal : goal,
    )
  }
  return [...state.source.goals, buildPendingGoal(state, currentMonth, normalizedGoal)]
}

function buildInvestmentPosition(input: {
  id: string
  goalId: string
  currency: CurrencyCode
  investment: GoalCreationProposal['investment']
  existingPosition?: GoalsWorkspaceSource['investmentPositions'][number]
}): GoalsWorkspaceSource['investmentPositions'][number] {
  const { id, goalId, currency, investment, existingPosition } = input
  return {
    id,
    goalId,
    currentValue: existingPosition?.currentValue ?? '0.00',
    currency,
    annualReturnRate: investment?.annualReturnRate ?? null,
    availability: investment?.availability ?? null,
    availableFrom: investment?.availableFrom ?? null,
  }
}

function buildProposedInvestmentPositions(input: {
  state: GoalCreationState
  normalizedGoal: GoalCreationProposal['normalizedGoal']
  investment: GoalCreationProposal['investment']
  subject: GoalCreationSubject
}): GoalsWorkspaceSource['investmentPositions'] {
  const { state, normalizedGoal, investment, subject } = input
  const positions = state.source.investmentPositions

  if (subject.isEditing) {
    const otherPositions = positions.filter((position) => position.goalId !== subject.subjectGoalId)
    const existingPosition = positions.find((position) => position.goalId === subject.subjectGoalId)
    return normalizedGoal.strategy === 'invest'
      ? [
          ...otherPositions,
          buildInvestmentPosition({
            id: existingPosition?.id ?? `pos-${subject.subjectGoalId}`,
            goalId: subject.subjectGoalId,
            currency: normalizedGoal.currency,
            investment,
            existingPosition,
          }),
        ]
      : otherPositions
  }

  return normalizedGoal.strategy === 'invest'
    ? [
        ...positions,
        buildInvestmentPosition({
          id: `pos-${PENDING_GOAL_ID}`,
          goalId: PENDING_GOAL_ID,
          currency: normalizedGoal.currency,
          investment,
        }),
      ]
    : positions
}

function buildExistingAllocationEntries(input: {
  sourceAllocs: GoalsWorkspaceSource['allocations']
  activeGoals: GoalsWorkspaceSource['goals']
  renamedGoalId?: string
  renamedGoalName?: string
}): GoalCreationAllocationEntry[] {
  return buildGoalAllocationEntries(input)
}

function buildEmptyCreationEntries(
  activeGoals: GoalsWorkspaceSource['goals'],
  subject: GoalCreationSubject,
  goalName: string,
): GoalCreationAllocationEntry[] {
  const entries = activeGoals.map((goal) => ({
    goalId: goal.id,
    goalName: subject.isEditing && goal.id === subject.subjectGoalId ? goalName : goal.name,
    percentage: subject.isEditing && activeGoals.length === 1 ? '100.00' : '0.00',
    pending: false,
  }))

  if (!subject.isEditing) {
    return [
      ...entries,
      { goalId: PENDING_GOAL_ID, goalName, percentage: '100.00', pending: true },
    ]
  }

  if (entries.length > 0 && calculatePercentageSum(entries).isZero()) {
    const subjectIndex = entries.findIndex((entry) => entry.goalId === subject.subjectGoalId)
    entries[subjectIndex >= 0 ? subjectIndex : 0].percentage = '100.00'
  }
  return entries
}

function buildGoalCreationEntries(input: {
  sourceAllocs: GoalsWorkspaceSource['allocations']
  activeGoals: GoalsWorkspaceSource['goals']
  subject: GoalCreationSubject
  goalName: string
}): GoalCreationAllocationEntry[] {
  const { sourceAllocs, activeGoals, subject, goalName } = input
  if (sourceAllocs.length === 0) return buildEmptyCreationEntries(activeGoals, subject, goalName)

  const existingEntries = buildExistingAllocationEntries({
    sourceAllocs,
    activeGoals,
    renamedGoalId: subject.isEditing ? subject.subjectGoalId : undefined,
    renamedGoalName: subject.isEditing ? goalName : undefined,
  })
  if (subject.isEditing) return existingEntries

  return [
    ...existingEntries,
    { goalId: PENDING_GOAL_ID, goalName, percentage: '0.00', pending: true },
  ]
}

function overlayGoalCreationAllocations(
  entries: GoalCreationAllocationEntry[],
  draft: GoalCreationDraft,
  isEditing: boolean,
): GoalCreationAllocationEntry[] {
  return overlayGoalAllocationPercentages(entries, draft.allocations, isEditing)
}

function validateAllocationTotal(entries: GoalCreationAllocationEntry[], allowEmpty: boolean): BigNumber {
  const total = calculatePercentageSum(entries)
  if ((!allowEmpty || entries.length > 0) && !total.isEqualTo(100)) {
    throw new Error(`Allocation percentages must sum to 100%, got ${total.toFixed(2)}%`)
  }
  return total
}

function getPlannedMonthlyContribution(state: GoalCreationState): Money | undefined {
  const contribution = state.source.profile?.plannedMonthlyContribution
  if (contribution === null || contribution === undefined) return undefined
  return createMoney(contribution, state.source.profile?.baseCurrency ?? 'ARS')
}

function addGoalCreationAllocationAmounts(input: {
  entries: GoalCreationAllocationEntry[]
  monthlyContribution: Money | undefined
  activeGoals: GoalsWorkspaceSource['goals']
  normalizedGoal: GoalCreationProposal['normalizedGoal']
  subject: GoalCreationSubject
}): GoalCreationAllocationEntry[] {
  const currencies = new Map(
    input.activeGoals.map((goal) => [
      goal.id,
      input.subject.isEditing && goal.id === input.subject.subjectGoalId
        ? input.normalizedGoal.currency
        : goal.currency,
    ]),
  )
  if (!input.subject.isEditing) currencies.set(PENDING_GOAL_ID, input.normalizedGoal.currency)
  return addGoalAllocationAmounts({
    entries: input.entries,
    monthlyContribution: input.monthlyContribution,
    currencies,
  })
}

function buildGoalCreationProposedSource(input: {
  state: GoalCreationState
  entries: GoalCreationAllocationEntry[]
  proposedGoals: GoalsWorkspaceSource['goals']
  proposedInvestmentPositions: GoalsWorkspaceSource['investmentPositions']
  nextMonthStr: string
  nextMonthEffective: string
}): GoalsWorkspaceSource {
  const pendingSnapshot = input.state.pendingSnapshots.find(
    (snapshot) => snapshot.effectiveMonth === input.nextMonthEffective,
  )
  return buildGoalProposalSource({
    source: input.state.source,
    pendingSnapshot,
    snapshotId: pendingSnapshot?.id ?? `snap-allocation-${input.nextMonthStr}`,
    effectiveMonth: input.nextMonthEffective,
    entries: input.entries,
    goals: input.proposedGoals,
    investmentPositions: input.proposedInvestmentPositions,
    profile: input.state.source.profile,
  })
}

function buildGoalCreationImpact(input: {
  goal: GoalsWorkspaceSource['goals'][number]
  beforeWorkspace: GoalsWorkspace
  afterWorkspace: GoalsWorkspace
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  isSubject: boolean
  subjectName: string
}): GoalCreationImpact {
  const { goal, beforeWorkspace, afterWorkspace, selectedSnapshot, isSubject, subjectName } = input
  const beforeGoal = findGoalInWorkspace(beforeWorkspace, goal.id)
  const afterGoal = findGoalInWorkspace(afterWorkspace, goal.id)
  return {
    goalId: goal.id,
    goalName: isSubject ? subjectName : goal.name,
    before: {
      status: 'existing',
      projection: beforeGoal?.projection ?? { status: 'target_unavailable' },
      allocatedMonthlyAmounts: getAllocatedMonthlyAmounts(beforeGoal, selectedSnapshot),
    },
    after: afterGoal?.projection ?? { status: 'target_unavailable' },
  }
}

function buildGoalCreationImpacts(input: {
  state: GoalCreationState
  beforeWorkspace: GoalsWorkspace
  afterWorkspace: GoalsWorkspace
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  subject: GoalCreationSubject
  goalName: string
}): GoalCreationImpact[] {
  const { state, beforeWorkspace, afterWorkspace, selectedSnapshot, subject, goalName } = input
  const impacts: GoalCreationImpact[] = []
  const afterGoals = afterWorkspace.groups.flatMap((group) => group.goals)
  if (!subject.isEditing) {
    impacts.push({
      goalId: PENDING_GOAL_ID,
      goalName,
      before: { status: 'not_created' },
      after: afterGoals.find((goal) => goal.id === PENDING_GOAL_ID)?.projection ?? {
        status: 'target_unavailable',
      },
    })
  }

  for (const goal of state.source.goals) {
    if (goal.status !== 'active' && goal.id !== subject.subjectGoalId) continue
    impacts.push(
      buildGoalCreationImpact({
        goal,
        beforeWorkspace,
        afterWorkspace,
        selectedSnapshot,
        isSubject: subject.isEditing && goal.id === subject.subjectGoalId,
        subjectName: goalName,
      }),
    )
  }
  return impacts
}

function buildGoalCreationAllocation(input: {
  draft: GoalCreationDraft
  state: GoalCreationState
  currentMonth: string
  subject: GoalCreationSubject
  normalizedGoal: GoalCreationProposal['normalizedGoal']
}): {
  allocation: GoalCreationAllocation
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  nextMonthStr: string
  nextMonthEffective: string
} {
  const { draft, state, currentMonth, subject, normalizedGoal } = input
  const nextMonthStr = getNextCalendarMonthStr(currentMonth)
  const nextMonthEffective = `${nextMonthStr}-01`
  const activeExistingGoals = state.source.goals.filter((goal) => goal.status === 'active')
  const { snapshot: selectedSnapshot, allocations: sourceAllocs } = selectGoalPlanSnapshot(
    state.source,
    state.pendingSnapshots,
    state.pendingAllocations,
    currentMonth,
  )

  let entries = buildGoalCreationEntries({
    sourceAllocs,
    activeGoals: activeExistingGoals,
    subject,
    goalName: normalizedGoal.name,
  })
  entries = overlayGoalCreationAllocations(entries, draft, subject.isEditing)
  const totalBn = validateAllocationTotal(entries, true)

  const monthlyContribution = getPlannedMonthlyContribution(state)
  entries = addGoalCreationAllocationAmounts({
    entries,
    monthlyContribution,
    activeGoals: activeExistingGoals,
    normalizedGoal,
    subject,
  })

  const allocation: GoalCreationAllocation = {
    monthlyContribution,
    effectiveMonth: nextMonthEffective,
    entries,
    totalPercentage: totalBn.toFixed(2),
  }
  return { allocation, selectedSnapshot, nextMonthStr, nextMonthEffective }
}

function buildGoalCreationWorkspaces(input: {
  state: GoalCreationState
  currentMonth: string
  entries: GoalCreationAllocationEntry[]
  proposedGoals: GoalsWorkspaceSource['goals']
  proposedInvestmentPositions: GoalsWorkspaceSource['investmentPositions']
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined
  subject: GoalCreationSubject
  goalName: string
  nextMonthStr: string
  nextMonthEffective: string
}): { proposedSource: GoalsWorkspaceSource; impacts: GoalCreationImpact[] } {
  const beforeWorkspace = buildCurrentGoalsPlanWorkspace(input.state, input.currentMonth)
  const proposedSource = buildGoalCreationProposedSource(input)
  const afterWorkspace = buildGoalsWorkspace(proposedSource, input.currentMonth)
  const impacts = buildGoalCreationImpacts({
    state: input.state,
    beforeWorkspace,
    afterWorkspace,
    selectedSnapshot: input.selectedSnapshot,
    subject: input.subject,
    goalName: input.goalName,
  })
  return { proposedSource, impacts }
}

export function buildGoalCreationProposal(input: GoalCreationInput): GoalCreationProposal {
  const subject = resolveGoalCreationSubject(input)
  const { normalizedGoal, investment } = normalizeGoalCreationDetails(input)
  const proposedGoals = buildProposedGoal({
    state: input.state,
    currentMonth: input.currentMonth,
    normalizedGoal,
    subject,
  })
  const proposedInvestmentPositions = buildProposedInvestmentPositions({
    state: input.state,
    normalizedGoal,
    investment,
    subject,
  })
  const plan = buildGoalCreationAllocation({ ...input, subject, normalizedGoal })
  const { proposedSource, impacts } = buildGoalCreationWorkspaces({
    state: input.state,
    currentMonth: input.currentMonth,
    entries: plan.allocation.entries,
    proposedGoals,
    proposedInvestmentPositions,
    selectedSnapshot: plan.selectedSnapshot,
    subject,
    goalName: normalizedGoal.name,
    nextMonthStr: plan.nextMonthStr,
    nextMonthEffective: plan.nextMonthEffective,
  })
  return {
    normalizedGoal,
    investment,
    allocation: plan.allocation,
    impacts,
    proposedSource,
  }
}

export function serializeGoalCreationState(
  stateOrSource: GoalCreationState | GoalsWorkspaceSource,
  currentMonth: string,
  draft?: GoalCreationDraft,
): string {
  return serializeGoalState(stateOrSource, currentMonth, draft)
}

function serializeGoalState(
  stateOrSource: GoalCreationState | GoalsWorkspaceSource,
  currentMonth: string,
  draft: GoalCreationDraft | undefined,
  goalId?: string,
): string {
  const state: GoalCreationState =
    'source' in stateOrSource && stateOrSource.source
      ? (stateOrSource as GoalCreationState)
      : {
          source: stateOrSource as GoalsWorkspaceSource,
          pendingSnapshots: [],
          pendingAllocations: [],
        }

  const { source, pendingSnapshots, pendingAllocations } = state

  const normalized = {
    ...(goalId ? { goalId } : {}),
    currentMonth,
    planningArsPerUsd: PLANNING_ARS_PER_USD,
    profile: serializeGoalProfile(source.profile, true),
    ...serializeGoalSourceCollections(source, pendingSnapshots, pendingAllocations),
    draft: draft
      ? {
          type: draft.type,
          name: draft.name.trim(),
          targetAmount: draft.targetAmount,
          currency: draft.currency,
          desiredMonth: draft.desiredMonth ?? null,
          priority: draft.priority,
          strategy: draft.strategy,
          annualReturnRate: draft.annualReturnRate,
          availability: draft.availability,
          availableFromMonth: draft.availableFromMonth ?? null,
            allocations: serializeAllocationEntries(draft.allocations ?? []),
        }
      : null,
  }

  return JSON.stringify(normalized)
}

export function serializeGoalEditState(
  stateOrSource: GoalCreationState | GoalsWorkspaceSource,
  currentMonth: string,
  goalId: string,
  draft?: GoalCreationDraft,
): string {
  return serializeGoalState(stateOrSource, currentMonth, draft, goalId)
}
