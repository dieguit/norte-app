import { useCallback } from 'react'
import { useSheetLoader } from '../../../../components/SheetLoadingState'
import { getGoalEditContext } from '../../../../features/goals/goals.functions'
import { GoalCreation } from './GoalCreation'
import { GoalContextSheet } from './GoalContextSheet'

export interface GoalEditSheetProps {
  open: boolean
  goalId: string | null
  onOpenChange: (open: boolean) => void
}

export function GoalEditSheet({ open, goalId, onOpenChange }: GoalEditSheetProps) {
  const load = useCallback(async () => {
    if (!goalId) throw new Error('No pudimos cargar los datos.')
    const result = await getGoalEditContext({ data: { goalId } })
    if (result.profile === 'missing') {
      throw new Error('Completá tu perfil financiero antes de editar un objetivo.')
    }
    return {
      goalId: result.goalId,
      status: result.status,
      draft: result.draft,
      context: result.context,
    }
  }, [goalId])
  const { data: context, loading, error } = useSheetLoader({ open: open && Boolean(goalId), load })

  return (
    <GoalContextSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Editar objetivo"
      description="Actualizá el objetivo, su Plan y revisá el impacto antes de confirmar."
      loading={loading}
      error={error}
    >
      {context ? (
          <GoalCreation
            context={context.context}
            edit={{ goalId: context.goalId, status: context.status, initialDraft: context.draft }}
            onCancel={() => onOpenChange(false)}
            onCreated={() => onOpenChange(false)}
          />
        ) : null}
    </GoalContextSheet>
  )
}
