import { useCallback } from 'react'
import { useSheetLoader } from '../../../../components/SheetLoadingState'
import { getGoalCreationContext } from '../../../../features/goals/goals.functions'
import { GoalCreation } from './GoalCreation'
import { GoalContextSheet } from './GoalContextSheet'

export interface GoalCreationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoalCreationSheet({ open, onOpenChange }: GoalCreationSheetProps) {
  const load = useCallback(async () => {
    const result = await getGoalCreationContext()
    if (result.profile === 'missing') {
      throw new Error('Completá tu perfil financiero antes de crear un objetivo.')
    }
    return result.context
  }, [])
  const { data: context, loading, error } = useSheetLoader({ open, load })

  return (
    <GoalContextSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo objetivo"
      description="Definí el objetivo, su Plan y revisá el impacto antes de confirmar."
      loading={loading}
      error={error}
    >
      {context ? (
          <GoalCreation
            context={context}
            onCancel={() => onOpenChange(false)}
            onCreated={() => onOpenChange(false)}
          />
        ) : null}
    </GoalContextSheet>
  )
}
