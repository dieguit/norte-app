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
import type {
  GoalCreationAllocation,
  GoalCreationImpact,
} from './goal-creation'

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

export function buildGoalCompletionContext(
  state: GoalCompletionState,
  currentMonth: string,
  goalId: string,
): GoalCompletionContext {
  const workspace = buildGoalsWorkspace(state.source, currentMonth)
  const goal = workspace.groups.flatMap((group) => group.goals).find((candidate) => candidate.id === goalId)
  if (!goal || !goal.completionEligible || !goal.targetAmount) {
    throw new Error('El objetivo no está listo para completarse.')
  }

  const plannedMonthlyContribution =
    state.source.profile?.plannedMonthlyContribution !== null &&
    state.source.profile?.plannedMonthlyContribution !== undefined
      ? createMoney(
          state.source.profile.plannedMonthlyContribution,
          state.source.profile.baseCurrency ?? 'ARS',
        )
      : undefined

  return {
    goalId,
    goalName: goal.name,
    targetAmount: goal.targetAmount,
    savingsValue: goal.savingsValue,
    currentMonth,
    plannedMonthlyContribution,
    savingsPlaces: state.savingsPlaces.filter(
      (place) =>
        place.balance.currency === goal.targetAmount!.currency &&
        new BigNumber(place.balance.amount).isGreaterThan(0),
    ),
    activeGoals: state.source.goals
      .filter((candidate) => candidate.status === 'active')
      .map(({ id, name, currency }) => ({ id, name, currency })),
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

export function validateGoalCompletionWithdrawals(input: {
  targetAmount: Money
  places: GoalCompletionSavingsPlace[]
  withdrawals: Array<{ placeId: string; amount: string }>
}): Array<{ placeId: string; amount: Money }> {
  const seenPlaceIds = new Set<string>()
  let total = new BigNumber(0)
  const validated: Array<{ placeId: string; amount: Money }> = []

  for (const withdrawal of input.withdrawals) {
    if (seenPlaceIds.has(withdrawal.placeId)) {
      throw new Error('Cada lugar de ahorro puede aparecer una sola vez.')
    }
    seenPlaceIds.add(withdrawal.placeId)

    const place = input.places.find((candidate) => candidate.id === withdrawal.placeId)
    if (!place) throw new Error('Lugar de ahorro no encontrado.')
    if (place.balance.currency !== input.targetAmount.currency) {
      throw new Error('La moneda del lugar no coincide con la del objetivo.')
    }

    if (!isPlainDecimalMoneyString(withdrawal.amount)) {
      throw new Error('Ingresá un monto mayor a cero, con hasta dos decimales.')
    }

    let amount: BigNumber
    try {
      amount = new BigNumber(withdrawal.amount.replace(',', '.'))
    } catch {
      throw new Error('Ingresá un monto mayor a cero, con hasta dos decimales.')
    }
    const decimals = amount.decimalPlaces()
    if (!amount.isFinite() || amount.isNaN() || amount.isLessThanOrEqualTo(0) || decimals === null || decimals > 2) {
      throw new Error('Ingresá un monto mayor a cero, con hasta dos decimales.')
    }
    if (amount.isGreaterThan(place.balance.amount)) {
      throw new Error(`El monto supera el saldo disponible en ${place.name}.`)
    }

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
  const workspace = buildGoalsWorkspace(state.source, currentMonth)
  const goal = workspace.groups.flatMap((group) => group.goals).find((candidate) => candidate.id === draft.goalId)
  if (!goal || !goal.completionEligible || !goal.targetAmount) {
    throw new Error('El objetivo no está listo para completarse.')
  }

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
    withdrawals: validated.map(({ placeId, amount }) => ({
      placeId,
      placeName: state.savingsPlaces.find((place) => place.id === placeId)!.name,
      amount,
    })),
    allocation: removal.allocation,
    persistedAllocation: removal.persistedAllocation,
    pauseMonthlyCommitment: removal.pauseMonthlyCommitment,
    impacts: removal.impacts,
    proposedSource: {
      ...removal.proposedSource,
      incomes: state.source.incomes,
      expenses: state.source.expenses,
      contributions: state.source.contributions,
      savingContributions: state.source.savingContributions,
      completionWithdrawals: state.source.completionWithdrawals,
      goals: removal.proposedSource.goals.map((candidate) =>
        candidate.id === goal.id ? { ...candidate, status: 'completed' as const } : candidate,
      ),
    },
  }
}

function canonicalAmount(value: string): string {
  try {
    return new BigNumber(value.replace(',', '.')).toFixed(2)
  } catch {
    return value
  }
}

function mapGoal(goal: GoalsWorkspaceSource['goals'][number]) {
  return {
    id: goal.id,
    userId: goal.userId ?? null,
    name: goal.name,
    type: goal.type,
    targetAmount: goal.targetAmount ?? null,
    currency: goal.currency,
    priority: goal.priority,
    strategy: goal.strategy,
    status: goal.status,
    desiredDate: goal.desiredDate ?? null,
    completedAt: goal.completedAt ?? null,
    emergencyFundMonths: goal.emergencyFundMonths ?? null,
    createdAt: goal.createdAt,
  }
}

export function serializeGoalCompletionState(
  state: GoalCompletionState,
  currentMonth: string,
  draft?: GoalCompletionDraft,
): string {
  const workspace = buildGoalsWorkspace(state.source, currentMonth)
  const target = draft
    ? workspace.groups.flatMap((group) => group.goals).find((goal) => goal.id === draft.goalId)
    : undefined
  const normalized = {
    currentMonth,
    planningArsPerUsd: PLANNING_ARS_PER_USD,
    goalId: draft?.goalId ?? null,
    targetAmount: target?.targetAmount ?? null,
    goal: state.source.goals.find((goal) => goal.id === draft?.goalId)
      ? mapGoal(state.source.goals.find((goal) => goal.id === draft?.goalId)!)
      : null,
    profile: state.source.profile
      ? {
          userId: state.source.profile.userId,
          baseCurrency: state.source.profile.baseCurrency,
          expensesKnowledge: state.source.profile.expensesKnowledge,
          plannedMonthlyContribution: state.source.profile.plannedMonthlyContribution ?? null,
          goalDedicationPercentage: state.source.profile.goalDedicationPercentage ?? null,
          onboardingCompleted: state.source.profile.onboardingCompleted,
        }
      : null,
    incomes: (state.source.incomes ?? [])
      .map((income) => ({
        id: income.id,
        sourceKind: income.sourceKind,
        sourceId: income.sourceId ?? null,
        sourceName: income.sourceName ?? null,
        concept: income.concept ?? null,
        amount: income.amount,
        currency: income.currency,
        recurring: income.recurring,
        effectiveMonth: income.effectiveMonth,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    expenses: (state.source.expenses ?? [])
      .map((expense) => ({
        id: expense.id,
        sourceKind: expense.sourceKind,
        sourceId: expense.sourceId ?? null,
        sourceName: expense.sourceName ?? null,
        concept: expense.concept ?? null,
        amount: expense.amount,
        currency: expense.currency,
        recurring: expense.recurring,
        effectiveMonth: expense.effectiveMonth,
        endMonth: expense.endMonth ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    savingsPlaces: [...state.savingsPlaces]
      .map((place) => ({
        id: place.id,
        name: place.name,
        balance: { amount: place.balance.amount, currency: place.balance.currency },
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    goals: state.source.goals.map(mapGoal).sort((a, b) => a.id.localeCompare(b.id)),
    savingsPositions: (state.source.savingsPositions ?? [])
      .map((position) => ({
        id: position.id,
        goalId: position.goalId,
        amount: position.amount,
        currency: position.currency,
        location: position.location ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    investmentPositions: (state.source.investmentPositions ?? [])
      .map((position) => ({
        id: position.id,
        goalId: position.goalId,
        currentValue: position.currentValue,
        currency: position.currency,
        annualReturnRate: position.annualReturnRate ?? null,
        availability: position.availability ?? null,
        availableFrom: position.availableFrom ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    completionWithdrawals: (state.source.completionWithdrawals ?? [])
      .map((withdrawal) => ({
        id: withdrawal.id,
        goalId: withdrawal.goalId,
        placeId: withdrawal.placeId,
        placeName: withdrawal.placeName,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        createdAt: withdrawal.createdAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    snapshots: (state.source.snapshots ?? [])
      .map((snapshot) => ({
        id: snapshot.id,
        userId: snapshot.userId ?? null,
        effectiveMonth: snapshot.effectiveMonth,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    allocations: (state.source.allocations ?? [])
      .map((allocation) => ({
        id: allocation.id,
        snapshotId: allocation.snapshotId,
        goalId: allocation.goalId,
        percentage: allocation.percentage,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pendingSnapshots: (state.pendingSnapshots ?? [])
      .map((snapshot) => ({
        id: snapshot.id,
        userId: snapshot.userId ?? null,
        effectiveMonth: snapshot.effectiveMonth,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pendingAllocations: (state.pendingAllocations ?? [])
      .map((allocation) => ({
        id: allocation.id,
        snapshotId: allocation.snapshotId,
        goalId: allocation.goalId,
        percentage: allocation.percentage,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    draft: draft
      ? {
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
      : null,
  }

  return JSON.stringify(normalized)
}
