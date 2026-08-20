import { useForm } from '@tanstack/react-form'
import type { GoalCreationDraft } from '../../../../features/goals/goal-creation.schema'

export const defaultGoalCreationDraft: GoalCreationDraft = {
  type: 'purchase',
  name: '',
  targetAmount: '',
  currency: 'ARS',
  desiredMonth: '',
  priority: 'medium',
  saveEnabled: true,
  investEnabled: false,
  defineSaveCommitment: false,
  saveMonthlyCommitment: '',
  defineInvestCommitment: false,
  investMonthlyCommitment: '',
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
