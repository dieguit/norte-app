import { useForm } from '@tanstack/react-form'
import type { GoalCreationDraft } from '../../../../features/goals/goal-creation.schema'

const defaultGoalCreationDraft: GoalCreationDraft = {
  type: 'purchase',
  name: '',
  targetAmount: '',
  currency: 'ARS',
  desiredMonth: '',
  priority: 'medium',
  strategy: 'save',
  annualReturnRate: '8',
  availability: 'available_now',
  availableFromMonth: '',
  allocations: [],
}

export function useGoalCreationForm(initialDraft?: Partial<GoalCreationDraft>) {
  return useForm({
    defaultValues: {
      ...defaultGoalCreationDraft,
      ...initialDraft,
    },
  })
}

export type GoalCreationFormApi = ReturnType<typeof useGoalCreationForm>
