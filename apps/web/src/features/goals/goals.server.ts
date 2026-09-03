import '@tanstack/react-start/server-only'
import BigNumber from 'bignumber.js'
import { createMoney } from '../../lib/money'
import { requireFinancialUser } from '../financial/auth.server'
import {
  buildGoalsWorkspace,
  buildCurrentGoalsPlanWorkspace,
  type GoalStatus,
  type GoalsAppState,
} from './goals'
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
  confirmGoalCompletionInRepository,
  createGoalCompletionPreviewToken,
  getGoalCompletionState,
  GoalCompletionStateInvalidError,
  StaleGoalCompletionPreviewError,
} from './goal-completion.repository.server'
import {
  buildGoalCompletionContext,
  buildGoalCompletionProposal,
  type GoalCompletionContext,
  type GoalCompletionDraft,
  type GoalCompletionPreviewResult,
} from './goal-completion'
import {
  buildGoalCreationProposal,
  type GoalCreationContext,
  type GoalCreationPreviewResult,
  type GoalCreationState,
  type GoalEditContext,
  selectGoalPlanSnapshot,
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
  selectGoalLifecycleAllocation,
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
import type {
  ConfirmGoalCompletionInput,
  GoalCompletionPreviewInput,
  GoalCompletionRequestInput,
} from './goal-completion.schema'

export type {
  GoalsAppState,
  GoalCreationContextState,
  GoalEditContextState,
  AllocationChangeContextState,
  GoalLifecycleContextState,
  GoalCompletionContextState,
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

type GoalCompletionContextState =
  | { profile: 'missing' }
  | { profile: 'present'; context: GoalCompletionContext }

function buildGoalEditAllocations(
  activeGoals: GoalCreationState['source']['goals'],
  sourceAllocs: GoalCreationState['source']['allocations'],
): Array<{ goalId: string; percentage: string }> {
  if (sourceAllocs.length === 0) {
    return activeGoals.map((goal) => ({
      goalId: goal.id,
      percentage: activeGoals.length === 1 ? '100.00' : '0.00',
    }))
  }

  const activeGoalIds = new Set(activeGoals.map((goal) => goal.id))
  const selected = sourceAllocs
    .filter((allocation) => activeGoalIds.has(allocation.goalId))
    .map((allocation) => ({
      goalId: allocation.goalId,
      percentage: new BigNumber(allocation.percentage).toFixed(2),
    }))
  const selectedGoalIds = new Set(selected.map((entry) => entry.goalId))

  return [
    ...selected,
    ...activeGoals
      .filter((goal) => !selectedGoalIds.has(goal.id))
      .map((goal) => ({ goalId: goal.id, percentage: '0.00' })),
  ]
}

function getPlannedMonthlyContribution(
  profile: GoalCreationState['source']['profile'],
) {
  return profile?.plannedMonthlyContribution == null
    ? undefined
    : createMoney(profile.plannedMonthlyContribution, profile.baseCurrency ?? 'ARS')
}

function hasEmergencyFund(goals: GoalCreationState['source']['goals']): boolean {
  return goals.some((goal) => goal.type === 'emergency_fund')
}

function getExpensesKnowledge(profile: GoalCreationState['source']['profile']): 'known' | 'unknown' {
  return profile?.expensesKnowledge === 'known' ? 'known' : 'unknown'
}

function firstSnapshot<T>(snapshots: T[] | undefined): T | undefined {
  return snapshots?.[0]
}

function mapSnapshotAllocation(
  snapshot: { effectiveMonth: string; id: string } | undefined,
  allocations: ReadonlyArray<{ snapshotId: string; goalId: string; percentage: string }>,
) {
  if (!snapshot) return undefined
  return {
    effectiveMonth: snapshot.effectiveMonth,
    entries: allocations
      .filter((allocation) => allocation.snapshotId === snapshot.id)
      .map(({ goalId, percentage }) => ({ goalId, percentage })),
  }
}

function mapActiveGoalProjections(
  state: AllocationChangeState,
  workspace: ReturnType<typeof buildCurrentGoalsPlanWorkspace>,
) {
  const workspaceGoals = workspace.groups.flatMap((group) => group.goals)
  return state.source.goals
    .filter((goal) => goal.status === 'active')
    .map((goal) => ({
      id: goal.id,
      name: goal.name,
      currency: goal.currency,
      projection:
        workspaceGoals.find((workspaceGoal) => workspaceGoal.id === goal.id)?.projection ??
        ({ status: 'target_unavailable' } as const),
    }))
}

function getLifecycleTarget(
  state: GoalLifecycleState,
  goalId: string,
  lifecycle: GoalLifecycle,
) {
  const goal = state.source.goals.find((candidate) => candidate.id === goalId)
  if (!goal) throw new Error('Goal not found.')
  assertLifecycleTargetStatus(goal.status, lifecycle)
  return goal
}

function assertLifecycleTargetStatus(
  status: GoalStatus,
  lifecycle: GoalLifecycle,
): void {
  const expectedStatus = lifecycle === 'pause' ? 'active' : 'paused'
  if (status !== expectedStatus) {
    throw new Error(lifecycle === 'pause'
      ? 'Only active goals can be paused.'
      : 'Only paused goals can be resumed.')
  }
}

function getGoalDraftMonth(value: string | null | undefined): string {
  return value?.slice(0, 7) ?? ''
}

function getGoalInvestmentValue(
  investment: GoalCreationState['source']['investmentPositions'][number] | undefined,
  field: 'annualReturnRate' | 'availability' | 'availableFrom',
) {
  if (!investment) return undefined
  return investment[field]
}

function assertGoalEditFields(
  draft: GoalCreationDraft,
  goal: GoalCreationState['source']['goals'][number],
): void {
  if (draft.type !== goal.type || draft.currency !== goal.currency || draft.strategy !== goal.strategy) {
    throw new Error('Cannot modify immutable goal fields (type, currency, strategy).')
  }
}

function getGoalForEditContext(
  state: GoalCreationState,
  goalId: string,
) {
  const goal = state.source.goals.find(
    (candidate) => candidate.id === goalId &&
      (candidate.status === 'active' || candidate.status === 'paused'),
  )
  if (goal) return goal
  if (state.source.goals.some((candidate) => candidate.id === goalId && candidate.status === 'completed')) {
    throw new Error('Cannot edit a completed goal.')
  }
  throw new Error('Goal not found or is not active or paused.')
}

function buildGoalEditDraft(
  goal: GoalCreationState['source']['goals'][number],
  investment: GoalCreationState['source']['investmentPositions'][number] | undefined,
  allocations: Array<{ goalId: string; percentage: string }>,
): GoalCreationDraft {
  return {
    type: goal.type as GoalCreationDraft['type'],
    name: goal.name,
    targetAmount: goal.targetAmount || '',
    currency: goal.currency,
    desiredMonth: getGoalDraftMonth(goal.desiredDate),
    priority: goal.priority,
    strategy: goal.strategy,
    annualReturnRate: getGoalInvestmentValue(investment, 'annualReturnRate') || '8',
    availability: (getGoalInvestmentValue(investment, 'availability') || 'available_now') as GoalCreationDraft['availability'],
    availableFromMonth: getGoalDraftMonth(getGoalInvestmentValue(investment, 'availableFrom')),
    allocations,
  }
}

export function mapGoalCreationContext(
  state: GoalCreationState,
  currentMonth: string,
): GoalCreationContext {
  const profile = state.source.profile
  const plannedMonthlyContribution = getPlannedMonthlyContribution(profile)
  const winningSnapshot = firstSnapshot(state.source.snapshots)

  return {
    currentMonth,
    expensesKnowledge: getExpensesKnowledge(profile),
    hasEmergencyFund: hasEmergencyFund(state.source.goals),
    plannedMonthlyContribution,
    currentAllocation: mapSnapshotAllocation(winningSnapshot, state.source.allocations ?? []),
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
  const goal = getGoalForEditContext(state, goalId)
  const activeGoals = state.source.goals.filter((g) => g.status === 'active')
  const { allocations: sourceAllocs } = selectGoalPlanSnapshot(
    state.source,
    state.pendingSnapshots,
    state.pendingAllocations,
    currentMonth,
  )
  const selectedAllocationEntries = buildGoalEditAllocations(activeGoals, sourceAllocs)

  const investment = state.source.investmentPositions?.find((p) => p.goalId === goalId)

  return {
    goalId,
    status: goal.status,
    draft: buildGoalEditDraft(goal, investment, selectedAllocationEntries),
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
  const selectedGoal = getGoalForEditContext(state, data.goalId)
  const draft = parseGoalCreationSubmission(data.draft, currentMonth)
  assertGoalEditFields(draft, selectedGoal)

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
  const plannedMonthlyContribution = getPlannedMonthlyContribution(profile)
  const workspace = buildCurrentGoalsPlanWorkspace(state, currentMonth)
  const financialSummary = workspace.financialSummary
  const activeGoals = mapActiveGoalProjections(state, workspace)
  const winningSnapshot = firstSnapshot(state.source.snapshots)
  const pendingSnapshot = firstSnapshot(state.pendingSnapshots)

  return {
    currentMonth,
    financialSummary,
    plannedMonthlyContribution,
    activeGoals,
    currentAllocation: mapSnapshotAllocation(winningSnapshot, state.source.allocations ?? []),
    pendingAllocation: mapSnapshotAllocation(pendingSnapshot, state.pendingAllocations ?? []),
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
  const goal = getLifecycleTarget(state, goalId, lifecycle)
  const profile = state.source.profile
  const plannedMonthlyContribution = getPlannedMonthlyContribution(profile)
  const activeGoals = (state.source.goals ?? [])
    .filter((g) => g.status === 'active')
    .map((g) => ({
      id: g.id,
      name: g.name,
      currency: g.currency,
    }))

  const currentAllocation = selectGoalLifecycleAllocation(
    state.source.snapshots,
    state.source.allocations,
    currentMonth,
    'current',
  )
  const pendingAllocation = selectGoalLifecycleAllocation(
    state.pendingSnapshots,
    state.pendingAllocations,
    currentMonth,
    'pending',
  )

  return {
    goalId,
    lifecycle,
    goalName: goal.name,
    goalCurrency: goal.currency,
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

export async function getGoalCompletionContextServer({
  data,
}: {
  data: GoalCompletionRequestInput
}): Promise<GoalCompletionContextState> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalCompletionState(userId, currentMonth, data.goalId)
  if (!state) {
    return { profile: 'missing' }
  }
  return {
    profile: 'present',
    context: buildGoalCompletionContext(state, currentMonth, data.goalId),
  }
}

export async function previewGoalCompletionServer({
  data,
}: {
  data: GoalCompletionPreviewInput
}): Promise<GoalCompletionPreviewResult> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const state = await getGoalCompletionState(userId, currentMonth, data.goalId)
  if (!state) {
    throw new Error('Completá tu perfil financiero antes de completar un objetivo.')
  }

  const draft: GoalCompletionDraft = data
  const proposal = buildGoalCompletionProposal({ state, currentMonth, draft })
  return {
    proposal,
    previewToken: createGoalCompletionPreviewToken(state, currentMonth, draft),
  }
}

export async function confirmGoalCompletionServer({
  data,
}: {
  data: ConfirmGoalCompletionInput
}): Promise<
  | { status: 'completed'; completedAt: string }
  | { status: 'stale'; preview: GoalCompletionPreviewResult }
  | { status: 'invalid'; message: string }
> {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { previewToken, ...draft } = data

  try {
    const result = await confirmGoalCompletionInRepository({
      userId,
      currentMonth,
      draft,
      previewToken,
    })
    return { status: 'completed', completedAt: result.completedAt }
  } catch (error) {
    if (error instanceof StaleGoalCompletionPreviewError) {
      return { status: 'stale', preview: error.refreshedPreview }
    }
    if (error instanceof GoalCompletionStateInvalidError) {
      return { status: 'invalid', message: error.message }
    }
    throw error
  }
}
