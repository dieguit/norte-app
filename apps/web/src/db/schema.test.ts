import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { onboardingDrafts } from './schema'

describe('onboarding database schema', () => {
  it('defines the drafts table', () => {
    expect(getTableName(onboardingDrafts)).toBe('onboarding_drafts')
  })

  it('defines report columns on drafts', () => {
    expect(onboardingDrafts.report.name).toBe('report')
    expect(onboardingDrafts.reportSentOn.name).toBe('report_sent_on')
  })
})
