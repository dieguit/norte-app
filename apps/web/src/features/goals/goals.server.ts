import '@tanstack/react-start/server-only'
import { requireFinancialUser } from '../financial/auth.server'
import {
  AllocationChangeConfirmationSchema,
  AllocationChangeContextStateSchema,
  AllocationChangePreviewSchema,
  GoalCompletionConfirmationSchema,
  GoalCompletionContextStateSchema,
  GoalCompletionPreviewSchema,
  GoalCreationContextStateSchema,
  GoalCreationPreviewSchema,
  GoalCreationConfirmationSchema,
  GoalEditConfirmationSchema,
  GoalLifecycleConfirmationSchema,
  GoalLifecyclePreviewSchema,
  GoalPlanContextStateSchema,
  GoalsWorkspaceSchema,
  type AllocationChangeContextState,
  type GoalCompletionContextState,
  type GoalCreationContextState,
  type GoalLifecycleContext,
  type GoalsWorkspace as GoalsAppState,
} from '@repo/shared-types'
import { callFinancialApi, throwFinancialApiError } from '../financial/financial.server'
import type { GoalCompletionPreviewResult } from './goal-completion'
import type {
  GoalCreationPreviewResult,
  GoalEditContext,
} from './goal-creation'
import type {
  ConfirmGoalCreationInput,
  ConfirmGoalEditInput,
  GoalCreationDraft,
  GoalEditRequestInput,
  PreviewGoalEditInput,
} from './goal-creation.schema'
import type { AllocationChangePreviewResult } from './allocation-change'
import type {
  AllocationChangeDraft,
  ConfirmAllocationChangeInput,
} from './allocation-change.schema'
import type { GoalLifecyclePreviewResult } from './goal-lifecycle'
import type {
  ConfirmGoalLifecycleInput,
  GoalLifecyclePreviewInput,
  GoalLifecycleRequestInput,
} from './goal-lifecycle.schema'
import type {
  ConfirmGoalCompletionInput,
  GoalCompletionPreviewInput,
  GoalCompletionRequestInput,
} from './goal-completion.schema'

export type {
  GoalCreationContextState,
  GoalEditContextState,
  AllocationChangeContextState,
  GoalLifecycleContextState,
  GoalCompletionContextState,
  GoalsAppState,
}

type GoalEditContextState =
  | { profile: 'missing' }
  | ({ profile: 'present' } & GoalEditContext)

type GoalLifecycleContextState =
  | { profile: 'missing' }
  | ({ profile: 'present' } & GoalLifecycleContext)

export async function getGoalsWorkspaceServer(): Promise<GoalsAppState> {
  const response = await callFinancialApi('/goals')
  if (!response.ok) throw new Error('No se pudieron cargar los objetivos.')
  return GoalsWorkspaceSchema.parse(await response.json()) as GoalsAppState
}

export async function getGoalCreationContextServer(): Promise<GoalCreationContextState> {
  const response = await callFinancialApi('/goals/plan')
  if (!response.ok) throw new Error('No se pudo cargar el contexto para crear un objetivo.')
  const plan = GoalPlanContextStateSchema.parse(await response.json())
  return GoalCreationContextStateSchema.parse(plan.profile === 'missing' ? plan : { profile: 'present', context: plan.context })
}

export async function previewGoalCreationServer({
  data,
}: {
  data: GoalCreationDraft
}): Promise<GoalCreationPreviewResult> {
  const response = await callFinancialApi('/goals/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo generar la vista previa del objetivo.')
  return GoalCreationPreviewSchema.parse(await response.json()) as GoalCreationPreviewResult
}

export async function confirmGoalCreationServer({
  data,
}: {
  data: ConfirmGoalCreationInput
}): Promise<{ status: 'created'; goalId: string } | { status: 'stale'; preview: GoalCreationPreviewResult }> {
  const response = await callFinancialApi('/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo crear el objetivo.')
  return GoalCreationConfirmationSchema.parse(await response.json()) as
    | { status: 'created'; goalId: string }
    | { status: 'stale'; preview: GoalCreationPreviewResult }
}

export async function getGoalEditContextServer({
  data,
}: {
  data: GoalEditRequestInput
}): Promise<GoalEditContextState> {
  const response = await callFinancialApi(`/goals/plan?goalId=${encodeURIComponent(data.goalId)}`)
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo cargar el objetivo para editarlo.')
  const plan = GoalPlanContextStateSchema.parse(await response.json())
  if (plan.profile === 'missing') return { profile: 'missing' }
  if (!plan.editContext) throw new Error('No se pudo cargar el objetivo para editarlo.')
  return { profile: 'present', ...plan.editContext, context: plan.context }
}

export async function previewGoalEditServer({
  data,
}: {
  data: PreviewGoalEditInput
}): Promise<GoalCreationPreviewResult> {
  const response = await callFinancialApi(`/goals/${encodeURIComponent(data.goalId)}/preview`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data.draft),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo generar la vista previa del objetivo.')
  return GoalCreationPreviewSchema.parse(await response.json()) as GoalCreationPreviewResult
}

export async function confirmGoalEditServer({
  data,
}: {
  data: ConfirmGoalEditInput
}): Promise<{ status: 'updated' } | { status: 'stale'; preview: GoalCreationPreviewResult }> {
  const response = await callFinancialApi(`/goals/${encodeURIComponent(data.goalId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft: data.draft, previewToken: data.previewToken }),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo actualizar el objetivo.')
  return GoalEditConfirmationSchema.parse(await response.json()) as { status: 'updated' } | { status: 'stale'; preview: GoalCreationPreviewResult }
}

export async function getAllocationChangeContextServer(): Promise<AllocationChangeContextState> {
  await requireFinancialUser()
  const response = await callFinancialApi('/goals/plan')
  if (!response.ok) throw new Error('No se pudo cargar el contexto para cambiar la planificación.')
  const plan = GoalPlanContextStateSchema.parse(await response.json())
  if (plan.profile === 'missing') return AllocationChangeContextStateSchema.parse(plan) as AllocationChangeContextState
  return AllocationChangeContextStateSchema.parse({ profile: 'present', context: plan.allocationContext }) as AllocationChangeContextState
}

export async function previewAllocationChangeServer({
  data,
}: {
  data: AllocationChangeDraft
}): Promise<AllocationChangePreviewResult> {
  await requireFinancialUser()
  const response = await callFinancialApi('/goals/allocation/preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo generar la vista previa de planificación.')
  return AllocationChangePreviewSchema.parse(await response.json()) as AllocationChangePreviewResult
}

export async function confirmAllocationChangeServer({
  data,
}: {
  data: ConfirmAllocationChangeInput
}): Promise<{ status: 'updated' } | { status: 'stale'; preview: AllocationChangePreviewResult }> {
  await requireFinancialUser()
  const response = await callFinancialApi('/goals/allocation', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo actualizar la planificación.')
  return AllocationChangeConfirmationSchema.parse(await response.json()) as { status: 'updated' } | { status: 'stale'; preview: AllocationChangePreviewResult }
}

export async function getGoalLifecycleContextServer({
  data,
}: {
  data: GoalLifecycleRequestInput
}): Promise<GoalLifecycleContextState> {
  await requireFinancialUser()
  const response = await callFinancialApi(`/goals/plan?goalId=${encodeURIComponent(data.goalId)}&action=${data.lifecycle}`)
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo cargar el objetivo para pausarlo o reanudarlo.')
  const plan = GoalPlanContextStateSchema.parse(await response.json())
  if (plan.profile === 'missing') return { profile: 'missing' }
  if (!plan.lifecycleContext) throw new Error('No se pudo cargar el objetivo para pausarlo o reanudarlo.')
  return { profile: 'present', ...plan.lifecycleContext } as GoalLifecycleContextState
}

export async function previewGoalLifecycleServer({
  data,
}: {
  data: GoalLifecyclePreviewInput
}): Promise<GoalLifecyclePreviewResult> {
  await requireFinancialUser()
  const response = await callFinancialApi(`/goals/${encodeURIComponent(data.goalId)}/lifecycle/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lifecycle: data.lifecycle, allocations: data.allocations }),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo generar la vista previa del objetivo.')
  return GoalLifecyclePreviewSchema.parse(await response.json()) as GoalLifecyclePreviewResult
}

export async function confirmGoalLifecycleServer({
  data,
}: {
  data: ConfirmGoalLifecycleInput
}): Promise<{ status: 'updated' } | { status: 'stale'; preview: GoalLifecyclePreviewResult }> {
  await requireFinancialUser()
  const response = await callFinancialApi(`/goals/${encodeURIComponent(data.goalId)}/lifecycle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lifecycle: data.lifecycle, allocations: data.allocations, previewToken: data.previewToken }),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo actualizar el objetivo.')
  return GoalLifecycleConfirmationSchema.parse(await response.json()) as { status: 'updated' } | { status: 'stale'; preview: GoalLifecyclePreviewResult }
}

export async function getGoalCompletionContextServer({
  data,
}: {
  data: GoalCompletionRequestInput
}): Promise<GoalCompletionContextState> {
  await requireFinancialUser()
  const response = await callFinancialApi(`/goals/${encodeURIComponent(data.goalId)}/completion`)
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo cargar el objetivo para completarlo.')
  return GoalCompletionContextStateSchema.parse(await response.json()) as GoalCompletionContextState
}

export async function previewGoalCompletionServer({
  data,
}: {
  data: GoalCompletionPreviewInput
}): Promise<GoalCompletionPreviewResult> {
  await requireFinancialUser()
  const response = await callFinancialApi(`/goals/${encodeURIComponent(data.goalId)}/completion/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ withdrawals: data.withdrawals, allocations: data.allocations }),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo generar la vista previa del objetivo.')
  return GoalCompletionPreviewSchema.parse(await response.json()) as GoalCompletionPreviewResult
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
  await requireFinancialUser()
  const response = await callFinancialApi(`/goals/${encodeURIComponent(data.goalId)}/completion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ withdrawals: data.withdrawals, allocations: data.allocations, previewToken: data.previewToken }),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo completar el objetivo.')
  return GoalCompletionConfirmationSchema.parse(await response.json()) as
    | { status: 'completed'; completedAt: string }
    | { status: 'stale'; preview: GoalCompletionPreviewResult }
    | { status: 'invalid'; message: string }
}
