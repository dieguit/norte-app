import { z } from 'zod'

export type OnboardingAnswers = Record<string, string | number>

type OnboardingField = {
  id: string
  type: 'select' | 'currency'
  label: string
  required: boolean
  requiredMessage?: string
  options?: readonly string[]
}

type OnboardingStep = {
  id: string
  title: string
  fields: readonly OnboardingField[]
}

export const onboardingSteps: readonly OnboardingStep[] = [
  {
    id: 'income',
    title: 'Your income',
    fields: [
      {
        id: 'incomeRange',
        type: 'select',
        label: 'Which range best describes your monthly income?',
        required: true,
        requiredMessage: 'Choose an income range.',
        options: ['Less than ARS 500,000', 'ARS 500,000-1,000,000', 'ARS 1,000,000-2,000,000', 'More than ARS 2,000,000'],
      },
      { id: 'monthlyIncome', type: 'currency', label: 'Exact monthly income in ARS', required: false },
    ],
  },
  {
    id: 'savings',
    title: 'Your savings',
    fields: [
      { id: 'savingsRange', type: 'select', label: 'Which range best describes your savings?', required: true, requiredMessage: 'Choose a savings range.', options: ['No savings', 'Less than ARS 1,000,000', 'ARS 1,000,000-5,000,000', 'More than ARS 5,000,000'] },
      { id: 'savings', type: 'currency', label: 'Exact savings in ARS', required: false },
    ],
  },
  {
    id: 'debt',
    title: 'Your debt',
    fields: [
      { id: 'debtRange', type: 'select', label: 'Which range best describes your debt?', required: true, requiredMessage: 'Choose a debt range.', options: ['No debt', 'Less than ARS 1,000,000', 'ARS 1,000,000-5,000,000', 'More than ARS 5,000,000'] },
      { id: 'debt', type: 'currency', label: 'Exact debt in ARS', required: false },
    ],
  },
] as const

export function validateStep(stepIndex: number, answers: OnboardingAnswers) {
  const step = onboardingSteps[stepIndex]
  if (!step) return {}
  return Object.fromEntries(
    step.fields.flatMap((field) =>
      field.required && !answers[field.id]
        ? [[field.id, field.requiredMessage ?? 'This field is required.']]
        : [],
    ),
  )
}

export function getFirstIncompleteStep(answers: OnboardingAnswers) {
  return onboardingSteps.findIndex((_, index) => Object.keys(validateStep(index, answers)).length > 0)
}

export const saveDraftInput = z.object({
  deviceId: z.uuid(),
  answers: z.record(z.string(), z.union([z.string(), z.number()])),
  completed: z.boolean(),
})
