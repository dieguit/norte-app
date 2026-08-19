import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  channelPlanAllocations,
  channelPlanSnapshots,
  contributionChannels,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
  goalSavingsPositions,
  onboardingDrafts,
} from './schema'

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
    expect('plannedMonthlyContribution' in financialProfiles).toBe(false)
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
    expect(financialGoals.saveEnabled.name).toBe('save_enabled')
    expect(financialGoals.investEnabled.name).toBe('invest_enabled')
  })

  it('stores monthly intent in contribution channel snapshots', () => {
    expect('plannedMonthlyContribution' in financialProfiles).toBe(false)

    expect(getTableName(contributionChannels)).toBe('contribution_channels')
    expect(contributionChannels.userId.name).toBe('user_id')
    expect(contributionChannels.fundingMethod.name).toBe('funding_method')
    expect(contributionChannels.destinationCurrency.name).toBe('destination_currency')

    expect(getTableName(channelPlanSnapshots)).toBe('channel_plan_snapshots')
    expect(channelPlanSnapshots.channelId.name).toBe('channel_id')
    expect(channelPlanSnapshots.monthlyCommitmentAmount.name).toBe('monthly_commitment_amount')
    expect(channelPlanSnapshots.baseCurrency.name).toBe('base_currency')
    expect(channelPlanSnapshots.effectiveMonth.name).toBe('effective_month')

    expect(getTableName(channelPlanAllocations)).toBe('channel_plan_allocations')
    expect(channelPlanAllocations.snapshotId.name).toBe('snapshot_id')
    expect(channelPlanAllocations.goalId.name).toBe('goal_id')
    expect(channelPlanAllocations.percentage.name).toBe('percentage')
  })

  it('stores Goal workspace lifecycle and actual positions', () => {
    expect(financialGoals.priority.name).toBe('priority')
    expect(financialGoals.status.name).toBe('status')
    expect(financialGoals.desiredDate.name).toBe('desired_date')
    expect(financialGoals.completedAt.name).toBe('completed_at')
    expect(channelPlanSnapshots.commitmentStatus.name).toBe('commitment_status')
    expect(channelPlanSnapshots.monthlyCommitmentAmount.notNull).toBe(false)
    expect(getTableName(goalSavingsPositions)).toBe('goal_savings_positions')
    expect(goalSavingsPositions.goalId.name).toBe('goal_id')
    expect(goalSavingsPositions.location.name).toBe('location')
    expect(getTableName(goalInvestmentPositions)).toBe('goal_investment_positions')
    expect(goalInvestmentPositions.annualReturnRate.name).toBe('annual_return_rate')
    expect(goalInvestmentPositions.availability.name).toBe('availability')
    expect(goalInvestmentPositions.availableFrom.name).toBe('available_from')
  })
})

