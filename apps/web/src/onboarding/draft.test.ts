// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getFirstIncompleteStep,
  onboardingSteps,
  validateStep,
} from './definition'
import { loadDraft, saveDraft } from './draft'

describe('onboarding draft', () => {
  beforeEach(() => localStorage.clear())

  it('keeps fields grouped by step and validates requiredness independently from type', () => {
    expect(onboardingSteps[0]?.fields).toHaveLength(2)
    expect(validateStep(0, {})).toEqual({ incomeRange: 'Choose an income range.' })
    expect(validateStep(0, { incomeRange: '1000000-2000000' })).toEqual({})
  })

  it('resumes at the first incomplete step', () => {
    expect(getFirstIncompleteStep({ incomeRange: '1000000-2000000' })).toBe(1)
  })

  it('round-trips a local draft', () => {
    saveDraft({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers: { incomeRange: '1000000-2000000' },
      stepIndex: 1,
      completed: false,
      updatedAt: '2026-07-14T00:00:00.000Z',
    })

    expect(loadDraft()).toMatchObject({ stepIndex: 1, completed: false })
  })
})
