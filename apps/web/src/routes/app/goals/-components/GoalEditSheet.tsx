import { useCallback } from 'react'
import { SheetLoadingState, useSheetLoader } from '../../../../components/SheetLoadingState'
import { getGoalEditContext } from '../../../../features/goals/goals.functions'
import { GoalCreation } from './GoalCreation'
import { GoalContextSheet } from './GoalContextSheet'

export interface GoalEditSheetProps {
  open: boolean
  goalId: string | null
  onOpenChange: (open: boolean) => void
}

function useGoalEditLoad(goalId: string | null) {
  return useCallback(async () => {
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
}

export function GoalEditBody({ goalId, onDone }: { goalId: string; onDone: () => void }) {
  const { data, loading, error } = useSheetLoader({ open: true, load: useGoalEditLoad(goalId) })
  if (loading) return <SheetLoadingState />
  if (error) return <div className="flex flex-1 flex-col items-center justify-center p-6 text-center"><p role="alert" className="text-sm text-destructive">{error}</p></div>
  return data ? (
    <GoalCreation
      context={data.context}
      edit={{ goalId: data.goalId, status: data.status, initialDraft: data.draft }}
      onCancel={onDone}
      onCreated={onDone}
    />
  ) : null
}

export function GoalEditSheet({ open, goalId, onOpenChange }: GoalEditSheetProps) {
  const load = useGoalEditLoad(goalId)
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
