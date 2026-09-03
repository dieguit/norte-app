import { useEffect, useMemo, useRef, useState } from 'react'
import { usePostHog } from '@posthog/react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Button } from '../../../../components/ui/button'
import {
  createObjectiveSchema,
  goalPlanSchema,
  type GoalCreationDraft,
} from '../../../../features/goals/goal-creation.schema'
import {
  previewGoalCreation,
  confirmGoalCreation,
  previewGoalEdit,
  confirmGoalEdit,
} from '../../../../features/goals/goals.functions'
import {
  allocationEntriesMatch,
  calculatePercentageSum,
} from '../../../../features/goals/goal-creation'
import type {
  GoalCreationAllocationEntry,
  GoalCreationContext,
  GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import type { GoalStatus } from '../../../../features/goals/goals'
import { useStore } from '@tanstack/react-form'
import { useGoalCreationForm } from './useGoalCreationForm'
import { GoalObjectiveFields } from './GoalObjectiveFields'
import { GoalImpact } from './GoalImpact'
import { reportGoalError, reportGoalMessage, reportGoalPreviewError } from './goal-error'

type GoalCreationStage = 'objective' | 'impact'

export interface GoalCreationProps {
  context: GoalCreationContext
  onCancel: () => void
  onCreated: () => void
  edit?: {
    goalId: string
    status?: GoalStatus
    initialDraft: GoalCreationDraft
  }
}

type GoalCreationState = ReturnType<typeof useGoalCreationState>

function applyZodIssuesToForm(
  issues: z.ZodIssue[],
  setValidationErrors: (errors: Record<string, string>) => void,
) {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const path = issue.path.join('.')
    if (!errors[path]) errors[path] = issue.message
  }
  setValidationErrors(errors)
}

function focusFirstInvalidField() {
  setTimeout(() => {
    const element = document.querySelector<HTMLElement>(
      '[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] [role="combobox"], [data-invalid="true"] button',
    )
    element?.focus()
  }, 0)
}

function useGoalCreationState(edit: GoalCreationProps['edit']) {
  const form = useGoalCreationForm(edit?.initialDraft)
  const values = useStore(form.store, (state) => state.values)
  const [stage, setStage] = useState<GoalCreationStage>('objective')
  const [preview, setPreview] = useState<GoalCreationPreviewResult | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const serverErrorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (serverError) serverErrorRef.current?.focus()
  }, [serverError])

  const isPreviewSynced = useMemo(
    () => preview !== null && allocationEntriesMatch(values.allocations ?? [], preview.proposal.allocation.entries),
    [preview, values.allocations],
  )
  const isAllocationsValid = useMemo(() => {
    const allocations = values.allocations ?? []
    return allocations.length === 0
      ? edit?.status === 'paused'
      : calculatePercentageSum(allocations).isEqualTo(100)
  }, [edit?.status, values.allocations])

  return {
    form,
    values,
    stage,
    setStage,
    preview,
    setPreview,
    isPreviewPending,
    setIsPreviewPending,
    isSubmitting,
    setIsSubmitting,
    serverError,
    setServerError,
    validationErrors,
    setValidationErrors,
    serverErrorRef,
    isPreviewSynced,
    isAllocationsValid,
  }
}

async function requestGoalPreview(
  edit: GoalCreationProps['edit'],
  draft: GoalCreationDraft,
) {
  return edit
    ? previewGoalEdit({ data: { goalId: edit.goalId, draft } })
    : previewGoalCreation({ data: draft })
}

async function requestGoalConfirmation(
  edit: GoalCreationProps['edit'],
  draft: GoalCreationDraft,
  previewToken: string,
) {
  return edit
    ? confirmGoalEdit({ data: { goalId: edit.goalId, draft, previewToken } })
    : confirmGoalCreation({ data: { draft, previewToken } })
}

function mergeStillEligiblePercentages(
  form: GoalCreationState['form'],
  entries: GoalCreationAllocationEntry[],
) {
  const currentMap = new Map(
    (form.state.values.allocations ?? []).map((entry) => [entry.goalId, entry.percentage]),
  )
  form.setFieldValue(
    'allocations',
    entries.map((entry) => ({
      goalId: entry.goalId,
      percentage: currentMap.get(entry.goalId) ?? entry.percentage,
    })),
  )
}

function useGoalCreationContinue(
  edit: GoalCreationProps['edit'],
  context: GoalCreationContext,
  state: GoalCreationState,
) {
  return async () => {
    state.setServerError(null)
    const objResult = createObjectiveSchema(context.currentMonth).safeParse(state.form.state.values)
    const planResult = goalPlanSchema.safeParse(state.form.state.values)
    if (!objResult.success || !planResult.success) {
      const issues = [
        ...(!objResult.success ? objResult.error.issues : []),
        ...(!planResult.success ? planResult.error.issues : []),
      ]
      applyZodIssuesToForm(issues, state.setValidationErrors)
      focusFirstInvalidField()
      return
    }
    state.setValidationErrors({})
    state.setIsPreviewPending(true)
    try {
      const previewResult = await requestGoalPreview(edit, state.form.state.values)
      state.setPreview(previewResult)
      const existingAllocations = state.form.state.values.allocations
      if (!existingAllocations || existingAllocations.length === 0) {
        state.form.setFieldValue('allocations', previewResult.proposal.allocation.entries.map(({ goalId, percentage }) => ({ goalId, percentage })))
      }
      state.setStage('impact')
    } catch (error) {
      reportGoalPreviewError(error, 'Ocurrió un error al calcular la proyección.', state.setPreview, state.setServerError, state.serverErrorRef)
    } finally {
      state.setIsPreviewPending(false)
    }
  }
}

function useGoalCreationPercentageCommit(edit: GoalCreationProps['edit'], state: GoalCreationState) {
  return async () => {
    const allocations = state.form.state.values.allocations || []
    if (allocations.length === 0 || !calculatePercentageSum(allocations).isEqualTo(100)) return
    state.setIsPreviewPending(true)
    try {
      await updateGoalCreationPreview(edit, state)
    } finally {
      state.setIsPreviewPending(false)
    }
  }
}

async function updateGoalCreationPreview(edit: GoalCreationProps['edit'], state: GoalCreationState) {
    try {
      state.setPreview(await requestGoalPreview(edit, state.form.state.values))
    } catch (error) {
      reportGoalPreviewError(error, 'Ocurrió un error al actualizar el impacto.', state.setPreview, state.setServerError, state.serverErrorRef)
    }
}

function useGoalCreationConfirm(
  edit: GoalCreationProps['edit'],
  onCreated: () => void,
  state: GoalCreationState,
) {
  const router = useRouter()
  const posthog = usePostHog()
  return async () => {
    if (!state.preview || !state.isPreviewSynced) return
    state.setIsSubmitting(true)
    state.setServerError(null)
    try {
      const result = await requestGoalConfirmation(edit, state.form.state.values, state.preview.previewToken)
      if (result.status === 'stale') {
        mergeStillEligiblePercentages(state.form, result.preview.proposal.allocation.entries)
        state.setPreview(result.preview)
        reportGoalMessage('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.', state.setServerError, state.serverErrorRef)
        return
      }
      posthog?.capture(edit ? 'goal_updated' : 'goal_created', {
        goal_type: state.form.state.values.type,
        strategy: state.form.state.values.strategy,
        currency: state.form.state.values.currency,
      })
      await router.invalidate()
      toast.success(edit ? 'Objetivo y Plan actualizados.' : 'Objetivo creado y Plan actualizado.')
      onCreated()
    } catch (error) {
      reportGoalError(error, 'Ocurrió un error al guardar.', state.setServerError, state.serverErrorRef)
    } finally {
      state.setIsSubmitting(false)
    }
  }
}

/*
 * The handlers stay separate because the objective step, allocation preview,
 * and confirmation have different validation and stale-data behavior.
 */
function useGoalCreationActions({
  context,
  edit,
  onCreated,
  state,
}: {
  context: GoalCreationContext
  edit: GoalCreationProps['edit']
  onCreated: () => void
  state: GoalCreationState
}) {
  return {
    continueFromObjective: useGoalCreationContinue(edit, context, state),
    handlePercentageCommit: useGoalCreationPercentageCommit(edit, state),
    handleConfirm: useGoalCreationConfirm(edit, onCreated, state),
  }
}

function GoalCreationHeader({ stage }: { stage: GoalCreationStage }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
      <h3 className="text-base font-semibold text-[var(--sea-ink)]">{stage === 'objective' ? '1. Objetivo' : '2. Distribución e impacto'}</h3>
      <span className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">Paso {stage === 'objective' ? '1' : '2'} de 2</span>
    </div>
  )
}

function GoalCreationError({ state }: { state: GoalCreationState }) {
  if (!state.serverError) return null
  return (
    <div ref={state.serverErrorRef} tabIndex={-1} role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive">
      {state.serverError}
    </div>
  )
}

function GoalCreationStage({
  context,
  edit,
  state,
  onPercentageCommit,
}: {
  context: GoalCreationContext
  edit: GoalCreationProps['edit']
  state: GoalCreationState
  onPercentageCommit: () => void
}) {
  return state.stage === 'objective' ? (
    <GoalObjectiveFields form={state.form} context={context} validationErrors={state.validationErrors} immutableIdentity={Boolean(edit)} />
  ) : (
    <GoalImpact
      form={state.form}
      context={context}
      preview={state.preview}
      isPreviewPending={state.isPreviewPending}
      onPercentageCommit={onPercentageCommit}
      transition={edit ? { goalId: edit.goalId, status: edit.status === 'paused' ? 'paused' : 'editing', label: edit.status === 'paused' ? 'Pausado' : 'Edición', editable: edit.status !== 'paused' } : undefined}
    />
  )
}

function GoalCreationBody({
  context,
  edit,
  state,
  onPercentageCommit,
}: {
  context: GoalCreationContext
  edit: GoalCreationProps['edit']
  state: GoalCreationState
  onPercentageCommit: () => void
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
      <GoalCreationHeader stage={state.stage} />
      <GoalCreationError state={state} />
      <GoalCreationStage context={context} edit={edit} state={state} onPercentageCommit={onPercentageCommit} />
    </div>
  )
}

function GoalCreationBackButton({
  stage,
  onCancel,
  onBack,
}: {
  stage: GoalCreationStage
  onCancel: () => void
  onBack: () => void
}) {
  return (
    <Button type="button" variant="outline" onClick={stage === 'objective' ? onCancel : onBack}>
      {stage === 'objective' ? 'Cancelar' : 'Volver'}
    </Button>
  )
}

function GoalCreationContinueButton({
  isPreviewPending,
  onContinue,
}: {
  isPreviewPending: boolean
  onContinue: () => void
}) {
  return (
    <Button type="button" disabled={isPreviewPending} onClick={onContinue}>
      {isPreviewPending ? 'Calculando...' : 'Continuar a la distribución'}
    </Button>
  )
}

function GoalCreationConfirmButton({
  state,
  edit,
  onConfirm,
}: {
  state: GoalCreationState
  edit: GoalCreationProps['edit']
  onConfirm: () => void
}) {
  return (
    <Button
      type="button"
      disabled={!state.isAllocationsValid || state.isPreviewPending || state.isSubmitting || !state.preview || !state.isPreviewSynced}
      onClick={onConfirm}
    >
      {state.isSubmitting
        ? 'Guardando...'
        : edit
          ? 'Actualizar objetivo y Plan'
          : 'Crear objetivo y actualizar Plan'}
    </Button>
  )
}

function GoalCreationFooter({
  state,
  edit,
  onCancel,
  onBack,
  onContinue,
  onConfirm,
}: {
  state: GoalCreationState
  edit: GoalCreationProps['edit']
  onCancel: () => void
  onBack: () => void
  onContinue: () => void
  onConfirm: () => void
}) {
  return (
    <div className="sticky bottom-0 border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
      <GoalCreationBackButton stage={state.stage} onCancel={onCancel} onBack={onBack} />
      {state.stage === 'objective' && (
        <GoalCreationContinueButton
          isPreviewPending={state.isPreviewPending}
          onContinue={onContinue}
        />
      )}
      {state.stage === 'impact' && <GoalCreationConfirmButton state={state} edit={edit} onConfirm={onConfirm} />}
    </div>
  )
}

export function GoalCreation({ context, onCancel, onCreated, edit }: GoalCreationProps) {
  const state = useGoalCreationState(edit)
  const actions = useGoalCreationActions({ context, edit, onCreated, state })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <GoalCreationBody context={context} edit={edit} state={state} onPercentageCommit={actions.handlePercentageCommit} />
      <GoalCreationFooter
        state={state}
        edit={edit}
        onCancel={onCancel}
        onBack={() => {
          state.setServerError(null)
          state.setValidationErrors({})
          state.setStage('objective')
        }}
        onContinue={actions.continueFromObjective}
        onConfirm={actions.handleConfirm}
      />
    </div>
  )
}
