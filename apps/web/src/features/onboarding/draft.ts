import { z } from 'zod'
import { filterAnswersForActiveSteps, type OnboardingAnswers, onboardingAnswerSchema } from './definition'

export const DRAFT_KEY = 'onboarding-draft'

const localDraftSchema = z.object({
  deviceId: z.uuid(),
  answers: z.record(z.string(), onboardingAnswerSchema),
  stepIndex: z.number().int().nonnegative(),
  completed: z.boolean(),
  updatedAt: z.string().datetime(),
})

export type LocalDraft = z.infer<typeof localDraftSchema> & {
  answers: OnboardingAnswers
}

export function loadDraft(deviceId?: string): LocalDraft | null {
  const stored = localStorage.getItem(DRAFT_KEY)
  if (!stored) return null

  try {
    const parsed = localDraftSchema.safeParse(JSON.parse(stored))
    if (!parsed.success || (deviceId && parsed.data.deviceId !== deviceId)) return null
    return { ...parsed.data, answers: filterAnswersForActiveSteps(parsed.data.answers) }
  } catch {
    return null
  }
}

export function saveDraft(draft: LocalDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    ...draft,
    answers: filterAnswersForActiveSteps(draft.answers),
  }))
}
