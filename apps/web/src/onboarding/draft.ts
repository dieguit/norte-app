import { z } from 'zod'
import type { OnboardingAnswers } from './definition'

export const DRAFT_KEY = 'onboarding-draft'

const localDraftSchema = z.object({
  deviceId: z.uuid(),
  answers: z.record(z.string(), z.union([z.string(), z.number()])),
  stepIndex: z.number().int().nonnegative(),
  completed: z.boolean(),
  updatedAt: z.string().datetime(),
})

export type LocalDraft = z.infer<typeof localDraftSchema> & {
  answers: OnboardingAnswers
}

export function loadDraft(): LocalDraft | null {
  const stored = localStorage.getItem(DRAFT_KEY)
  if (!stored) return null

  try {
    const parsed = localDraftSchema.safeParse(JSON.parse(stored))
    return parsed.success ? (parsed.data as LocalDraft) : null
  } catch {
    return null
  }
}

export function saveDraft(draft: LocalDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}
