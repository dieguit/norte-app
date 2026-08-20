import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import BigNumber from 'bignumber.js'
import type { z } from 'zod'
import { Button } from '../../../../components/ui/button'
import {
  createObjectiveSchema,
  goalPlanSchema,
} from '../../../../features/goals/goal-creation.schema'
import {
  previewGoalCreation,
  confirmGoalCreation,
} from '../../../../features/goals/goals.functions'
import type {
  GoalCreationAllocationGroup,
  GoalCreationContext,
  GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import { useStore } from '@tanstack/react-form'
import { useGoalCreationForm } from './useGoalCreationForm'
import { GoalObjectiveFields } from './GoalObjectiveFields'
import { GoalPlanFields } from './GoalPlanFields'
import { GoalImpact } from './GoalImpact'

export type GoalCreationStage = 'objective' | 'plan' | 'impact'

export interface GoalCreationProps {
  context: GoalCreationContext
  onCancel: () => void
  onCreated: () => void
}

export function GoalCreation({
  context,
  onCancel,
  onCreated,
}: GoalCreationProps) {
  const router = useRouter()
  const form = useGoalCreationForm()
  const values = useStore(form.store, (state) => state.values)

  const [stage, setStage] = useState<GoalCreationStage>('objective')
  const [preview, setPreview] = useState<GoalCreationPreviewResult | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const serverErrorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (serverError) {
      serverErrorRef.current?.focus()
    }
  }, [serverError])

  const applyZodIssuesToForm = (issues: z.ZodIssue[]) => {
    const errors: Record<string, string> = {}
    for (const issue of issues) {
      const path = issue.path.join('.')
      if (!errors[path]) {
        errors[path] = issue.message
      }
    }
    setValidationErrors(errors)
  }

  const focusFirstInvalidField = () => {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        '[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] [role="combobox"], [data-invalid="true"] button',
      )
      el?.focus()
    }, 0)
  }

  const isPreviewSynced = useMemo(() => {
    if (!preview) return false
    const draftAllocations = values.allocations
    if (!draftAllocations || draftAllocations.length === 0) return true
    return draftAllocations.every((draftGroup) => {
      const propGroup = preview.proposal.allocationGroups.find((g) => g.key === draftGroup.key)
      if (!propGroup) return false
      return draftGroup.entries.every((draftEntry) => {
        const propEntry = propGroup.entries.find((e) => e.goalId === draftEntry.goalId)
        if (!propEntry) return false
        try {
          const dPct = new BigNumber((draftEntry.percentage || '0').trim().replace(',', '.'))
          const pPct = new BigNumber((propEntry.percentage || '0').trim().replace(',', '.'))
          if (!dPct.isFinite() || dPct.isNaN() || !pPct.isFinite() || pPct.isNaN()) return false
          return dPct.toFixed(2) === pPct.toFixed(2)
        } catch {
          return false
        }
      })
    })
  }, [preview, values.allocations])

  const isAllocationsValid = useMemo(() => {
    const allocations = values.allocations || []
    return (
      allocations.length > 0 &&
      allocations.every((group) => {
        const totalBn = group.entries.reduce((sum, e) => {
          const cleaned = (e.percentage ?? '').trim().replace(',', '.')
          if (!cleaned) return sum
          try {
            const val = new BigNumber(cleaned)
            return sum.plus(val.isFinite() && !val.isNaN() ? val : 0)
          } catch {
            return sum
          }
        }, new BigNumber(0))
        return totalBn.isEqualTo(100)
      })
    )
  }, [values.allocations])

  const continueFromObjective = async () => {
    setServerError(null)
    const result = createObjectiveSchema(context.currentMonth).safeParse(form.state.values)
    if (!result.success) {
      applyZodIssuesToForm(result.error.issues)
      focusFirstInvalidField()
      return
    }
    setValidationErrors({})
    setStage('plan')
  }

  const continueFromPlan = async () => {
    setServerError(null)
    const result = goalPlanSchema.safeParse(form.state.values)
    if (!result.success) {
      applyZodIssuesToForm(result.error.issues)
      focusFirstInvalidField()
      return
    }
    setValidationErrors({})
    setIsPreviewPending(true)
    try {
      const previewResult = await previewGoalCreation({ data: form.state.values })
      setPreview(previewResult)

      // First entry into impact: seed allocations if empty
      const existingAllocations = form.state.values.allocations
      if (!existingAllocations || existingAllocations.length === 0) {
        form.setFieldValue('allocations', previewResult.proposal.allocationGroups)
      }

      setStage('impact')
    } catch (err: any) {
      setPreview(null)
      setServerError(err?.message ?? 'Ocurrió un error al calcular la proyección.')
      setTimeout(() => serverErrorRef.current?.focus(), 0)
    } finally {
      setIsPreviewPending(false)
    }
  }

  const handlePercentageCommit = async () => {
    const allocations = form.state.values.allocations || []
    const allGroupsValid =
      allocations.length > 0 &&
      allocations.every((group) => {
        const totalBn = group.entries.reduce((sum, e) => {
          try {
            const val = new BigNumber((e.percentage || '').replace(',', '.'))
            return sum.plus(val.isFinite() && !val.isNaN() ? val : 0)
          } catch {
            return sum
          }
        }, new BigNumber(0))
        return totalBn.isEqualTo(100)
      })

    if (!allGroupsValid) {
      return
    }

    setIsPreviewPending(true)
    try {
      const previewResult = await previewGoalCreation({ data: form.state.values })
      setPreview(previewResult)
    } catch (err: any) {
      setPreview(null)
      setServerError(err?.message ?? 'Ocurrió un error al actualizar el impacto.')
      setTimeout(() => serverErrorRef.current?.focus(), 0)
    } finally {
      setIsPreviewPending(false)
    }
  }

  const mergeStillEligiblePercentages = (serverGroups: GoalCreationAllocationGroup[]) => {
    const currentAllocations = form.state.values.allocations || []
    const merged = serverGroups.map((serverGroup) => {
      const currentGroup = currentAllocations.find((g) => g.key === serverGroup.key)
      if (!currentGroup) return serverGroup

      const currentMap = new Map(currentGroup.entries.map((e) => [e.goalId, e.percentage]))
      const mergedEntries = serverGroup.entries.map((entry) => {
        const existingPct = currentMap.get(entry.goalId)
        return {
          ...entry,
          percentage: existingPct !== undefined ? existingPct : entry.percentage,
        }
      })

      return {
        ...serverGroup,
        entries: mergedEntries,
      }
    })
    form.setFieldValue('allocations', merged)
  }

  const handleConfirm = async () => {
    if (!preview || !isPreviewSynced) return
    setIsSubmitting(true)
    setServerError(null)

    try {
      const result = await confirmGoalCreation({
        data: {
          draft: form.state.values,
          previewToken: preview.previewToken,
        },
      })

      if (result.status === 'stale') {
        mergeStillEligiblePercentages(result.preview.proposal.allocationGroups)
        setPreview(result.preview)
        setServerError('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.')
        setTimeout(() => serverErrorRef.current?.focus(), 0)
        return
      }

      await router.invalidate()
      toast.success('Objetivo creado y Plan actualizado.')
      onCreated()
    } catch (err: any) {
      setServerError(err?.message ?? 'Ocurrió un error al guardar.')
      setTimeout(() => serverErrorRef.current?.focus(), 0)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable Stage Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Step progress heading */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h3 className="text-base font-semibold text-[var(--sea-ink)]">
            {stage === 'objective' && '1. Objetivo'}
            {stage === 'plan' && '2. Plan'}
            {stage === 'impact' && '3. Impacto en tu Plan'}
          </h3>
          <span className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
            Paso {stage === 'objective' ? '1' : stage === 'plan' ? '2' : '3'} de 3
          </span>
        </div>

        {/* Server error summary */}
        {serverError && (
          <div
            ref={serverErrorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive"
          >
            {serverError}
          </div>
        )}

        {/* Stage Components */}
        {stage === 'objective' && (
          <GoalObjectiveFields
            form={form}
            context={context}
            validationErrors={validationErrors}
          />
        )}

        {stage === 'plan' && (
          <GoalPlanFields
            form={form}
            context={context}
            validationErrors={validationErrors}
          />
        )}

        {stage === 'impact' && (
          <GoalImpact
            form={form}
            context={context}
            preview={preview}
            isPreviewPending={isPreviewPending}
            onPercentageCommit={handlePercentageCommit}
          />
        )}
      </div>

      {/* Sticky Actions Footer */}
      <div className="sticky bottom-0 border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
        {stage === 'objective' ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setServerError(null)
              setValidationErrors({})
              setStage(stage === 'impact' ? 'plan' : 'objective')
            }}
          >
            Volver
          </Button>
        )}

        {stage === 'objective' && (
          <Button
            type="button"
            onClick={continueFromObjective}
          >
            Continuar al Plan
          </Button>
        )}

        {stage === 'plan' && (
          <Button
            type="button"
            disabled={isPreviewPending}
            onClick={continueFromPlan}
          >
            {isPreviewPending ? 'Calculando...' : 'Continuar al impacto'}
          </Button>
        )}

        {stage === 'impact' && (
          <Button
            type="button"
            disabled={!isAllocationsValid || isPreviewPending || isSubmitting || !preview || !isPreviewSynced}
            onClick={handleConfirm}
          >
            {isSubmitting ? 'Guardando...' : 'Crear objetivo y actualizar Plan'}
          </Button>
        )}
      </div>
    </div>
  )
}

