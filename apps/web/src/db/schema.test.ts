import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { financialProfiles, onboardingDrafts } from './schema'

describe('onboarding database schema', () => {
  it('defines the drafts table', () => {
    expect(getTableName(onboardingDrafts)).toBe('onboarding_drafts')
  })

  it('defines report columns on drafts', () => {
    expect(onboardingDrafts.report.name).toBe('report')
    expect(onboardingDrafts.reportSentOn.name).toBe('report_sent_on')
  })

  it('defines the report CTA timestamp on drafts', () => {
    expect(onboardingDrafts.ctaClickedOn.name).toBe('cta_clicked_on')
  })

  it('defines user-owned financial profiles', () => {
    expect(getTableName(financialProfiles)).toBe('financial_profiles')
    expect(financialProfiles.userId.name).toBe('user_id')
    expect(financialProfiles.userId.primary).toBe(true)
  })
})
