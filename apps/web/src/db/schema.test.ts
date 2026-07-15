import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { onboardingDrafts } from './schema'

describe('onboarding database schema', () => {
  it('defines the drafts table', () => {
    expect(getTableName(onboardingDrafts)).toBe('onboarding_drafts')
  })
})
