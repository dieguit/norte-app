import '@tanstack/react-start/server-only'
import { createMoney } from '../../lib/money'
import { requireFinancialUser } from '../financial/auth.server'
import { buildGoalsWorkspace, type GoalsAppState } from './goals'
import {
  confirmAllocationChangeInRepository,
  confirmGoalCreationInRepository,
  createAllocationChangePreviewToken,
  createGoalCreationPreviewToken,
  getAllocationChangeState,
  getGoalCreationState,
  getGoalsWorkspaceRows,
  mapRowsToGoalsWorkspaceSource,
  StaleAllocationChangePreviewError,
  StaleGoalCreationPreviewError,
} from './goals.repository.server'
import {
  buildGoalCreationProposal,
  type GoalCreationContext,
  type GoalCreationPreviewResult,
  type GoalCreationState,
} from './goal-creation'
import {
  parseGoalCreationSubmission,
  type ConfirmGoalCreationInput,
  type GoalCreationDraft,
} from './goal-creation.schema'
import {
  buildAllocationChangeProposal,
  type AllocationChangeContext,
  type AllocationChangePreviewResult,
  type AllocationChangeState,
} from './allocation-change'
import type {
  AllocationChangeDraft,
  ConfirmAllocationChangeInput,
} from './allocation-change.schema'

export type { GoalsAppState, GoalCreationContextState, AllocationChangeContextState }

type GoalCreationContextState =
  | { profile: 'missing' }
  | { profile: 'present'; context: GoalCreationContext }

type AllocationChangeContextState =
  | { profile: 'missing' }
  | { profile: 'present'; context: AllocationChangeContext }

export function mapGoalCreationContext(
  state: GoalCreationState,
  currentMonth: string,
): GoalCreationContext {
  const profile = state.source.profile
  const plannedMonthlyContribution =
    profile?.plannedMonthlyContribution !== null && profile?.plannedMonthlyContribution !== undefined
      ? createMoney(profile.plannedMonthlyContribution, profile.baseCurrency ?? 'ARS')
      : undefined

  const winningSnapshot = state.source.snapshots?.[0]
  let currentAllocation: GoalCreationContext['currentAllocation'] = undefined

  if (winningSnapshot) {
    const entries = (state.source.allocations ?? [])
      .filter((a) => a.snapshotId === winningSnapshot.id)
      .map((a) => ({
        goalId: a.goalId,
        percentage: a.percentage,
      }))
    currentAllocation = {
      effectiveMonth: winningSnapshot.effectiveMonth,
      entries,
    }
  }

  return {
    currentMonth,
    expensesKnowledge: profile?.expensesKnowledge === 'known' ? 'known' : 'unknown',
    hasEmergencyFund: state.source.goals.some((goal) => goal.type === 'emergency_fund'),
    plannedMonthlyContribution,
    currentAllocation,
  }
}

export async function getGoalsWorkspaceServer(): Promise<GoalsAppState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const rows = await getGoalsWorkspaceRows(userId, currentMonth)

  if (!rows) {
    return { profile: 'missing' }
  }

  const source = mapRowsToGoalsWorkspaceSource(rows)
  const workspace = buildGoalsWorkspace(source, currentMonth)

  return {
    profile: 'present',
    workspace,
  }
}

export async function getGoalCreationContextServer(): Promise<GoalCreationContextState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalCreationState(userId, currentMonth)
  if (!state) {
    return { profile: 'missing' }
  }
  return {
    profile: 'present',
    context: mapGoalCreationContext(state, currentMonth),
  }
}

export async function previewGoalCreationServer({
  data,
}: {
  data: GoalCreationDraft
}): Promise<GoalCreationPreviewResult> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalCreationState(userId, currentMonth)
  if (!state) {
    throw new Error('Completá tu perfil financiero antes de crear un objetivo.')
  }
  const draft = parseGoalCreationSubmission(data, currentMonth)
  const proposal = buildGoalCreationProposal({ draft, state, currentMonth })
  return {
    proposal,
    previewToken: createGoalCreationPreviewToken(state, currentMonth, draft),
  }
}

export async function confirmGoalCreationServer({
  data,
}: {
  data: ConfirmGoalCreationInput
}): Promise<{ status: 'created'; goalId: string } | { status: 'stale'; preview: GoalCreationPreviewResult }> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const draft = parseGoalCreationSubmission(data.draft, currentMonth)
  try {
    const result = await confirmGoalCreationInRepository({
      userId,
      currentMonth,
      draft,
      previewToken: data.previewToken,
    })
    return { status: 'created' as const, goalId: result.goalId }
  } catch (error) {
    if (error instanceof StaleGoalCreationPreviewError) {
      return { status: 'stale' as const, preview: error.refreshedPreview }
    }
    throw error
  }
}

export function mapAllocationChangeContext(
  state: AllocationChangeState,
  currentMonth: string,
): AllocationChangeContext {
  const profile = state.source.profile
  const plannedMonthlyContribution =
    profile?.plannedMonthlyContribution !== null && profile?.plannedMonthlyContribution !== undefined
      ? createMoney(profile.plannedMonthlyContribution, profile.baseCurrency ?? 'ARS')
      : undefined

  const activeGoals = (state.source.goals ?? [])
    .filter((g) => g.status === 'active')
    .map((g) => ({
      id: g.id,
      name: g.name,
      currency: g.currency,
    }))

  const winningSnapshot = state.source.snapshots?.[0]
  let currentAllocation: AllocationChangeContext['currentAllocation'] = undefined

  if (winningSnapshot) {
    const entries = (state.source.allocations ?? [])
      .filter((a) => a.snapshotId === winningSnapshot.id)
      .map((a) => ({
        goalId: a.goalId,
        percentage: a.percentage,
      }))
    currentAllocation = {
      effectiveMonth: winningSnapshot.effectiveMonth,
      entries,
    }
  }

  const pendingSnapshot = state.pendingSnapshots?.[0]
  let pendingAllocation: AllocationChangeContext['pendingAllocation'] = undefined

  if (pendingSnapshot) {
    const entries = (state.pendingAllocations ?? [])
      .filter((a) => a.snapshotId === pendingSnapshot.id)
      .map((a) => ({
        goalId: a.goalId,
        percentage: a.percentage,
      }))
    pendingAllocation = {
      effectiveMonth: pendingSnapshot.effectiveMonth,
      entries,
    }
  }

  return {
    currentMonth,
    plannedMonthlyContribution,
    activeGoals,
    currentAllocation,
    pendingAllocation,
  }
}

export async function getAllocationChangeContextServer(): Promise<AllocationChangeContextState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getAllocationChangeState(userId, currentMonth)
  if (!state) {
    return { profile: 'missing' }
  }
  return {
    profile: 'present',
    context: mapAllocationChangeContext(state, currentMonth),
  }
}

export async function previewAllocationChangeServer({
  data,
}: {
  data: AllocationChangeDraft
}): Promise<AllocationChangePreviewResult> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getAllocationChangeState(userId, currentMonth)
  if (!state) {
    throw new Error('Completá tu perfil financiero antes de cambiar la planificación.')
  }
  const proposal = buildAllocationChangeProposal({ draft: data, state, currentMonth })
  return {
    proposal,
    previewToken: createAllocationChangePreviewToken(state, currentMonth, data),
  }
}

export async function confirmAllocationChangeServer({
  data,
}: {
  data: ConfirmAllocationChangeInput
}): Promise<{ status: 'updated' } | { status: 'stale'; preview: AllocationChangePreviewResult }> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  try {
    await confirmAllocationChangeInRepository({
      userId,
      currentMonth,
      draft: data.draft,
      previewToken: data.previewToken,
    })
    return { status: 'updated' as const }
  } catch (error) {
    if (error instanceof StaleAllocationChangePreviewError) {
      return { status: 'stale' as const, preview: error.refreshedPreview }
    }
    throw error
  }
}

