import '@tanstack/react-start/server-only'
import BigNumber from 'bignumber.js'
import { createMoney } from '../../lib/money'
import { getNextCalendarMonth } from '../financial/financial'
import { requireFinancialUser } from '../financial/auth.server'
import { buildGoalsWorkspace, type GoalsAppState } from './goals'
import {
  confirmAllocationChangeInRepository,
  confirmGoalCreationInRepository,
  confirmGoalEditInRepository,
  confirmGoalLifecycleInRepository,
  createAllocationChangePreviewToken,
  createGoalCreationPreviewToken,
  createGoalEditPreviewToken,
  createGoalLifecyclePreviewToken,
  getAllocationChangeState,
  getGoalCreationState,
  getGoalEditState,
  getGoalLifecycleState,
  getGoalsWorkspaceRows,
  mapRowsToGoalsWorkspaceSource,
  StaleAllocationChangePreviewError,
  StaleGoalCreationPreviewError,
  StaleGoalEditPreviewError,
  StaleGoalLifecyclePreviewError,
} from './goals.repository.server'
import {
  buildGoalCreationProposal,
  type GoalCreationContext,
  type GoalCreationPreviewResult,
  type GoalCreationState,
  type GoalEditContext,
} from './goal-creation'
import {
  parseGoalCreationSubmission,
  type ConfirmGoalCreationInput,
  type ConfirmGoalEditInput,
  type GoalCreationDraft,
  type GoalEditRequestInput,
  type PreviewGoalEditInput,
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
import {
  buildGoalLifecycleProposal,
  type GoalLifecycleContext,
  type GoalLifecyclePreviewResult,
  type GoalLifecycleState,
} from './goal-lifecycle'
import type {
  ConfirmGoalLifecycleInput,
  GoalLifecycle,
  GoalLifecyclePreviewInput,
  GoalLifecycleRequestInput,
} from './goal-lifecycle.schema'

export type {
  GoalsAppState,
  GoalCreationContextState,
  GoalEditContextState,
  AllocationChangeContextState,
  GoalLifecycleContextState,
}

type GoalCreationContextState =
  | { profile: 'missing' }
  | { profile: 'present'; context: GoalCreationContext }

type GoalEditContextState =
  | { profile: 'missing' }
  | ({ profile: 'present' } & GoalEditContext)

type AllocationChangeContextState =
  | { profile: 'missing' }
  | { profile: 'present'; context: AllocationChangeContext }

type GoalLifecycleContextState =
  | { profile: 'missing' }
  | ({ profile: 'present' } & GoalLifecycleContext)

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

export function mapGoalEditContext(
  state: GoalCreationState,
  currentMonth: string,
  goalId: string,
): GoalEditContext {
  const goal = state.source.goals.find(
    (g) => g.id === goalId && (g.status === 'active' || g.status === 'paused'),
  )
  if (!goal) {
    const anyGoal = state.source.goals.find((g) => g.id === goalId)
    if (anyGoal?.status === 'completed') {
      throw new Error('Cannot edit a completed goal.')
    }
    throw new Error('Goal not found or is not active or paused.')
  }
  const activeGoals = state.source.goals.filter((g) => g.status === 'active')
  const nextMonthStr = `${getNextCalendarMonth(new Date(`${currentMonth.slice(0, 7)}-01T00:00:00Z`))}`

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

  let selectedAllocationEntries: Array<{ goalId: string; percentage: string }> = []

  if (sourceAllocs.length > 0) {
    const activeAllocGoalIds = new Set(
      sourceAllocs.map((a) => a.goalId).filter((id) => activeGoals.some((g) => g.id === id)),
    )

    for (const a of sourceAllocs) {
      if (activeGoals.some((g) => g.id === a.goalId)) {
        selectedAllocationEntries.push({
          goalId: a.goalId,
          percentage: new BigNumber(a.percentage).toFixed(2),
        })
      }
    }

    for (const g of activeGoals) {
      if (!activeAllocGoalIds.has(g.id)) {
        selectedAllocationEntries.push({
          goalId: g.id,
          percentage: '0.00',
        })
      }
    }
  } else if (activeGoals.length > 0) {
    selectedAllocationEntries = activeGoals.map((g) => ({
      goalId: g.id,
      percentage: activeGoals.length === 1 ? '100.00' : '0.00',
    }))
  }

  const investment = state.source.investmentPositions?.find((p) => p.goalId === goalId)

  const draft: GoalCreationDraft = {
    type: goal.type as GoalCreationDraft['type'],
    name: goal.name,
    targetAmount: goal.targetAmount ?? '',
    currency: goal.currency,
    desiredMonth: goal.desiredDate?.slice(0, 7) ?? '',
    priority: goal.priority,
    strategy: goal.strategy,
    annualReturnRate: investment?.annualReturnRate ?? '8',
    availability: investment?.availability ?? 'available_now',
    availableFromMonth: investment?.availableFrom?.slice(0, 7) ?? '',
    allocations: selectedAllocationEntries,
  }

  return {
    goalId,
    status: goal.status,
    draft,
    context: mapGoalCreationContext(state, currentMonth),
  }
}

export async function getGoalEditContextServer({
  data,
}: {
  data: GoalEditRequestInput
}): Promise<GoalEditContextState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalEditState(userId, currentMonth, data.goalId)
  if (!state) {
    return { profile: 'missing' }
  }
  const editContext = mapGoalEditContext(state, currentMonth, data.goalId)
  return {
    profile: 'present',
    ...editContext,
  }
}

export async function previewGoalEditServer({
  data,
}: {
  data: PreviewGoalEditInput
}): Promise<GoalCreationPreviewResult> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalEditState(userId, currentMonth, data.goalId)
  if (!state) {
    throw new Error('Completá tu perfil financiero antes de editar un objetivo.')
  }
  const selectedGoal = state.source.goals.find(
    (g) => g.id === data.goalId && (g.status === 'active' || g.status === 'paused'),
  )
  if (!selectedGoal) {
    const anyGoal = state.source.goals.find((g) => g.id === data.goalId)
    if (anyGoal?.status === 'completed') {
      throw new Error('Cannot edit a completed goal.')
    }
    throw new Error('Goal not found or is not active or paused.')
  }
  const draft = parseGoalCreationSubmission(data.draft, currentMonth)
  if (
    draft.type !== selectedGoal.type ||
    draft.currency !== selectedGoal.currency ||
    draft.strategy !== selectedGoal.strategy
  ) {
    throw new Error('Cannot modify immutable goal fields (type, currency, strategy).')
  }

  const proposal = buildGoalCreationProposal({
    draft,
    state,
    currentMonth,
    subjectGoalId: data.goalId,
  })

  return {
    proposal,
    previewToken: createGoalEditPreviewToken(state, currentMonth, data.goalId, draft),
  }
}

export async function confirmGoalEditServer({
  data,
}: {
  data: ConfirmGoalEditInput
}): Promise<{ status: 'updated' } | { status: 'stale'; preview: GoalCreationPreviewResult }> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const draft = parseGoalCreationSubmission(data.draft, currentMonth)

  try {
    await confirmGoalEditInRepository({
      userId,
      goalId: data.goalId,
      currentMonth,
      draft,
      previewToken: data.previewToken,
    })
    return { status: 'updated' as const }
  } catch (error) {
    if (error instanceof StaleGoalEditPreviewError) {
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

export function mapGoalLifecycleContext(
  state: GoalLifecycleState,
  currentMonth: string,
  goalId: string,
  lifecycle: GoalLifecycle,
): GoalLifecycleContext {
  const goal = state.source.goals.find((g) => g.id === goalId)
  if (!goal) {
    throw new Error('Goal not found.')
  }
  if (lifecycle === 'pause' && goal.status !== 'active') {
    throw new Error('Only active goals can be paused.')
  }
  if (lifecycle === 'resume' && goal.status !== 'paused') {
    throw new Error('Only paused goals can be resumed.')
  }

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
  let currentAllocation: GoalLifecycleContext['currentAllocation'] = undefined

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
  let pendingAllocation: GoalLifecycleContext['pendingAllocation'] = undefined

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
    goalId,
    lifecycle,
    goalName: goal.name,
    currentMonth,
    plannedMonthlyContribution,
    activeGoals,
    currentAllocation,
    pendingAllocation,
  }
}

export async function getGoalLifecycleContextServer({
  data,
}: {
  data: GoalLifecycleRequestInput
}): Promise<GoalLifecycleContextState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalLifecycleState(userId, currentMonth)
  if (!state) {
    return { profile: 'missing' }
  }
  const context = mapGoalLifecycleContext(state, currentMonth, data.goalId, data.lifecycle)
  return {
    profile: 'present',
    ...context,
  }
}

export async function previewGoalLifecycleServer({
  data,
}: {
  data: GoalLifecyclePreviewInput
}): Promise<GoalLifecyclePreviewResult> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalLifecycleState(userId, currentMonth)
  if (!state) {
    throw new Error('Completá tu perfil financiero antes de pausar o reanudar un objetivo.')
  }
  const draft = data.allocations !== undefined ? { allocations: data.allocations } : undefined
  const proposal = buildGoalLifecycleProposal({
    lifecycle: data.lifecycle,
    goalId: data.goalId,
    state,
    currentMonth,
    draft,
  })
  return {
    proposal,
    previewToken: createGoalLifecyclePreviewToken(
      data.lifecycle,
      data.goalId,
      state,
      currentMonth,
      draft,
    ),
  }
}

export async function confirmGoalLifecycleServer({
  data,
}: {
  data: ConfirmGoalLifecycleInput
}): Promise<{ status: 'updated' } | { status: 'stale'; preview: GoalLifecyclePreviewResult }> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const draft = data.allocations !== undefined ? { allocations: data.allocations } : undefined
  try {
    await confirmGoalLifecycleInRepository({
      userId,
      goalId: data.goalId,
      lifecycle: data.lifecycle,
      currentMonth,
      draft,
      previewToken: data.previewToken,
    })
    return { status: 'updated' as const }
  } catch (error) {
    if (error instanceof StaleGoalLifecyclePreviewError) {
      return { status: 'stale' as const, preview: error.refreshedPreview }
    }
    throw error
  }
}

