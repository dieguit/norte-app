import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { financialGoals, financialProfiles, onboardingDrafts } from './schema'

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
    expect(financialProfiles.baseCurrency.name).toBe('base_currency')
    expect(financialProfiles.approximateMonthlyIncome.name).toBe('approximate_monthly_income')
    expect(financialProfiles.approximateMonthlyExpenses.name).toBe('approximate_monthly_expenses')
    expect(financialProfiles.expensesKnowledge.name).toBe('expenses_knowledge')
    expect(financialProfiles.plannedMonthlyContribution.name).toBe('planned_monthly_contribution')
    expect(financialProfiles.onboardingCompleted.name).toBe('onboarding_completed')
  })

  it('defines financial goals table', () => {
    expect(getTableName(financialGoals)).toBe('financial_goals')
    expect(financialGoals.id.name).toBe('id')
    expect(financialGoals.userId.name).toBe('user_id')
    expect(financialGoals.name.name).toBe('name')
    expect(financialGoals.type.name).toBe('type')
    expect(financialGoals.targetAmount.name).toBe('target_amount')
    expect(financialGoals.currency.name).toBe('currency')
    expect(financialGoals.emergencyFundMonths.name).toBe('emergency_fund_months')
  })
})

