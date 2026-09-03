import BigNumber from 'bignumber.js'
import { type Money, createMoney } from '../../lib/money'
import { PLANNING_ARS_PER_USD } from '../financial/financial'
import { isPlainDecimalMoneyString } from './goal-completion.schema'
import {
  buildGoalsWorkspace,
  type GoalsWorkspaceSource,
} from './goals'
import {
  buildGoalLifecycleProposal,
  selectGoalLifecycleAllocation,
  type GoalLifecycleContext,
  type GoalLifecycleProposal,
  type GoalLifecycleState,
} from './goal-lifecycle'
import { findGoalInWorkspace } from './goal-proposal-workspace'
import type {
  GoalCreationAllocation,
  GoalCreationImpact,
} from './goal-creation'
import {
  serializeGoalFinancialSources,
  serializeGoalCoreCollections,
  serializeGoalPlanCollections,
  serializeGoalProfile,
  serializeGoalRecord,
} from './goal-proposal-serialization'

export interface GoalCompletionSavingsPlace {
  id: string
  name: string
  balance: Money
}

export interface GoalCompletionState extends GoalLifecycleState {
  savingsPlaces: GoalCompletionSavingsPlace[]
}

export interface GoalCompletionContext {
  goalId: string
  goalName: string
  targetAmount: Money
  savingsValue: Money
  currentMonth: string
  plannedMonthlyContribution?: Money
  savingsPlaces: GoalCompletionSavingsPlace[]
  activeGoals: GoalLifecycleContext['activeGoals']
  currentAllocation?: GoalLifecycleContext['currentAllocation']
  pendingAllocation?: GoalLifecycleContext['pendingAllocation']
}

export interface GoalCompletionDraft {
  goalId: string
  withdrawals: Array<{ placeId: string; amount: string }>
  allocations: Array<{ goalId: string; percentage: string }>
}

export interface GoalCompletionProposal {
  goalId: string
  goalName: string
  targetAmount: Money
  withdrawals: Array<{
    placeId: string
    placeName: string
    amount: Money
  }>
  allocation: GoalCreationAllocation
  persistedAllocation: GoalLifecycleProposal['persistedAllocation']
  pauseMonthlyCommitment: boolean
  impacts: GoalCreationImpact[]
  proposedSource: GoalsWorkspaceSource
}

export interface GoalCompletionPreviewResult {
  proposal: GoalCompletionProposal
  previewToken: string
}

function isEligibleCompletionGoal(
  goal: ReturnType<typeof findGoalInWorkspace>,
): goal is NonNullable<ReturnType<typeof findGoalInWorkspace>> & { targetAmount: Money } {
  if (!goal) return false
  if (!goal.completionEligible) return false
  return goal.targetAmount != null
}

function getCompletionGoal(
  state: GoalCompletionState,
  currentMonth: string,
  goalId: string,
): NonNullable<ReturnType<typeof findGoalInWorkspace>> & { targetAmount: Money } {
  const workspace = buildGoalsWorkspace(state.source, currentMonth)
  const goal = findGoalInWorkspace(workspace, goalId)
  if (!isEligibleCompletionGoal(goal)) {
    throw new Error('El objetivo no está listo para completarse.')
  }
  return goal
}

function getProfileBaseCurrency(
  profile: NonNullable<GoalCompletionState['source']['profile']>,
): GoalCompletionSavingsPlace['balance']['currency'] {
  return profile.baseCurrency ?? 'ARS'
}

function getPlannedMonthlyContribution(state: GoalCompletionState): Money | undefined {
  const profile = state.source.profile
  if (!profile) return undefined
  const plannedMonthlyContribution = profile.plannedMonthlyContribution
  if (plannedMonthlyContribution === null) return undefined
  if (plannedMonthlyContribution === undefined) return undefined
  return createMoney(plannedMonthlyContribution, getProfileBaseCurrency(profile))
}

function isPositiveMatchingPlace(
  place: GoalCompletionSavingsPlace,
  targetAmount: Money,
): boolean {
  if (place.balance.currency !== targetAmount.currency) return false
  return new BigNumber(place.balance.amount).isGreaterThan(0)
}

function getCompletionSavingsPlaces(
  places: GoalCompletionSavingsPlace[],
  targetAmount: Money,
): GoalCompletionSavingsPlace[] {
  return places.filter((place) => isPositiveMatchingPlace(place, targetAmount))
}

function getActiveGoals(state: GoalCompletionState): GoalLifecycleContext['activeGoals'] {
  return state.source.goals
    .filter((goal) => goal.status === 'active')
    .map(({ id, name, currency }) => ({ id, name, currency }))
}

export function buildGoalCompletionContext(
  state: GoalCompletionState,
  currentMonth: string,
  goalId: string,
): GoalCompletionContext {
  const goal = getCompletionGoal(state, currentMonth, goalId)

  return {
    goalId,
    goalName: goal.name,
    targetAmount: goal.targetAmount,
    savingsValue: goal.savingsValue,
    currentMonth,
    plannedMonthlyContribution: getPlannedMonthlyContribution(state),
    savingsPlaces: getCompletionSavingsPlaces(state.savingsPlaces, goal.targetAmount),
    activeGoals: getActiveGoals(state),
    currentAllocation: selectGoalLifecycleAllocation(
      state.source.snapshots,
      state.source.allocations,
      currentMonth,
      'current',
    ),
    pendingAllocation: selectGoalLifecycleAllocation(
      state.pendingSnapshots,
      state.pendingAllocations,
      currentMonth,
      'pending',
    ),
  }
}

type ValidatedGoalCompletionWithdrawal = { placeId: string; amount: Money }

function assertUniqueWithdrawalPlace(seenPlaceIds: Set<string>, placeId: string): void {
  if (seenPlaceIds.has(placeId)) {
    throw new Error('Cada lugar de ahorro puede aparecer una sola vez.')
  }
  seenPlaceIds.add(placeId)
}

function getWithdrawalPlace(
  places: GoalCompletionSavingsPlace[],
  placeId: string,
  targetAmount: Money,
): GoalCompletionSavingsPlace {
  const place = places.find((candidate) => candidate.id === placeId)
  if (!place) throw new Error('Lugar de ahorro no encontrado.')
  if (place.balance.currency !== targetAmount.currency) {
    throw new Error('La moneda del lugar no coincide con la del objetivo.')
  }
  return place
}

function isInvalidWithdrawalAmount(amount: BigNumber): boolean {
  const decimals = amount.decimalPlaces()
  return [
    !amount.isFinite(),
    amount.isNaN(),
    amount.isLessThanOrEqualTo(0),
    decimals === null,
    decimals !== null && decimals > 2,
  ].some(Boolean)
}

function parseWithdrawalAmount(value: string): BigNumber {
  const invalidMessage = 'Ingresá un monto mayor a cero, con hasta dos decimales.'
  if (!isPlainDecimalMoneyString(value)) throw new Error(invalidMessage)
  let amount: BigNumber
  try {
    amount = new BigNumber(value.replace(',', '.'))
  } catch {
    throw new Error(invalidMessage)
  }
  if (isInvalidWithdrawalAmount(amount)) throw new Error(invalidMessage)
  return amount
}

function assertWithdrawalWithinBalance(
  amount: BigNumber,
  place: GoalCompletionSavingsPlace,
): void {
  if (amount.isGreaterThan(place.balance.amount)) {
    throw new Error(`El monto supera el saldo disponible en ${place.name}.`)
  }
}

export function validateGoalCompletionWithdrawals(input: {
  targetAmount: Money
  places: GoalCompletionSavingsPlace[]
  withdrawals: Array<{ placeId: string; amount: string }>
}): ValidatedGoalCompletionWithdrawal[] {
  const seenPlaceIds = new Set<string>()
  let total = new BigNumber(0)
  const validated: ValidatedGoalCompletionWithdrawal[] = []

  for (const withdrawal of input.withdrawals) {
    assertUniqueWithdrawalPlace(seenPlaceIds, withdrawal.placeId)
    const place = getWithdrawalPlace(input.places, withdrawal.placeId, input.targetAmount)
    const amount = parseWithdrawalAmount(withdrawal.amount)
    assertWithdrawalWithinBalance(amount, place)

    total = total.plus(amount)
    validated.push({ placeId: place.id, amount: createMoney(amount, input.targetAmount.currency) })
  }

  if (!total.isEqualTo(input.targetAmount.amount)) {
    throw new Error('Los montos deben sumar exactamente el objetivo.')
  }

  return validated
}

export function buildGoalCompletionProposal(input: {
  state: GoalCompletionState
  currentMonth: string
  draft: GoalCompletionDraft
}): GoalCompletionProposal {
  const { state, currentMonth, draft } = input
  const goal = getCompletionGoal(state, currentMonth, draft.goalId)

  const validated = validateGoalCompletionWithdrawals({
    targetAmount: goal.targetAmount,
    places: state.savingsPlaces,
    withdrawals: draft.withdrawals,
  })
  const removal = buildGoalLifecycleProposal({
    lifecycle: 'pause',
    goalId: draft.goalId,
    state,
    currentMonth,
    draft: { allocations: draft.allocations },
  })

  return {
    goalId: goal.id,
    goalName: goal.name,
    targetAmount: goal.targetAmount,
    withdrawals: buildCompletionWithdrawals(validated, state.savingsPlaces),
    allocation: removal.allocation,
    persistedAllocation: removal.persistedAllocation,
    pauseMonthlyCommitment: removal.pauseMonthlyCommitment,
    impacts: removal.impacts.filter((impact) => impact.goalId !== goal.id),
    proposedSource: buildCompletedGoalSource(removal.proposedSource, state, goal.id),
  }
}

function buildCompletionWithdrawals(
  withdrawals: ValidatedGoalCompletionWithdrawal[],
  places: GoalCompletionSavingsPlace[],
): GoalCompletionProposal['withdrawals'] {
  return withdrawals.map(({ placeId, amount }) => ({
    placeId,
    placeName: places.find((place) => place.id === placeId)!.name,
    amount,
  }))
}

function buildCompletedGoalSource(
  proposedSource: GoalsWorkspaceSource,
  state: GoalCompletionState,
  goalId: string,
): GoalsWorkspaceSource {
  return {
    ...proposedSource,
    incomes: state.source.incomes,
    expenses: state.source.expenses,
    contributions: state.source.contributions,
    savingContributions: state.source.savingContributions,
    completionWithdrawals: state.source.completionWithdrawals,
    goals: proposedSource.goals.map((goal) =>
      goal.id === goalId ? { ...goal, status: 'completed' as const } : goal,
    ),
  }
}

function canonicalAmount(value: string): string {
  try {
    return new BigNumber(value.replace(',', '.')).toFixed(2)
  } catch {
    return value
  }
}

function getDraftTarget(
  workspace: ReturnType<typeof buildGoalsWorkspace>,
  draft: GoalCompletionDraft | undefined,
): ReturnType<typeof findGoalInWorkspace> {
  if (!draft) return undefined
  return findGoalInWorkspace(workspace, draft.goalId)
}

function getDraftSourceGoal(
  state: GoalCompletionState,
  draft: GoalCompletionDraft | undefined,
): GoalsWorkspaceSource['goals'][number] | undefined {
  if (!draft) return undefined
  return state.source.goals.find((goal) => goal.id === draft.goalId)
}

function getDraftGoalId(draft: GoalCompletionDraft | undefined): string | null {
  if (!draft) return null
  return draft.goalId
}

function serializeCompletionSavingsPlaces(places: GoalCompletionSavingsPlace[]) {
  return [...places]
    .map((place) => ({
      id: place.id,
      name: place.name,
      balance: { amount: place.balance.amount, currency: place.balance.currency },
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function serializeCompletionWithdrawals(
  withdrawals: GoalsWorkspaceSource['completionWithdrawals'],
) {
  return (withdrawals ?? [])
    .map((withdrawal) => ({
      id: withdrawal.id,
      goalId: withdrawal.goalId,
      placeId: withdrawal.placeId,
      placeName: withdrawal.placeName,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      createdAt: withdrawal.createdAt,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function serializeCompletionDraft(draft: GoalCompletionDraft | undefined) {
  if (!draft) return null
  return {
    goalId: draft.goalId,
    withdrawals: draft.withdrawals
      .map((withdrawal) => ({
        placeId: withdrawal.placeId,
        amount: canonicalAmount(withdrawal.amount),
      }))
      .sort((a, b) => a.placeId.localeCompare(b.placeId)),
    allocations: draft.allocations
      .map((allocation) => ({
        goalId: allocation.goalId,
        percentage: canonicalAmount(allocation.percentage),
      }))
      .sort((a, b) => a.goalId.localeCompare(b.goalId)),
  }
}

export function serializeGoalCompletionState(
  state: GoalCompletionState,
  currentMonth: string,
  draft?: GoalCompletionDraft,
): string {
  const workspace = buildGoalsWorkspace(state.source, currentMonth)
  const target = getDraftTarget(workspace, draft)
  const sourceGoal = getDraftSourceGoal(state, draft)
  const normalized = {
    currentMonth,
    planningArsPerUsd: PLANNING_ARS_PER_USD,
    goalId: getDraftGoalId(draft),
    targetAmount: target?.targetAmount ?? null,
    goal: sourceGoal ? serializeGoalRecord(sourceGoal) : null,
    profile: serializeGoalProfile(state.source.profile, true),
    ...serializeGoalFinancialSources(state.source),
    savingsPlaces: serializeCompletionSavingsPlaces(state.savingsPlaces),
    ...serializeGoalCoreCollections(state.source),
    completionWithdrawals: serializeCompletionWithdrawals(state.source.completionWithdrawals),
    ...serializeGoalPlanCollections(state.source, state.pendingSnapshots, state.pendingAllocations),
    draft: serializeCompletionDraft(draft),
  }

  return JSON.stringify(normalized)
}
