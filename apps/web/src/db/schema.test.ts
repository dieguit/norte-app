import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import * as schema from './schema'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
  goalSavingsPositions,
  onboardingDrafts,
  savingContributionAllocations,
  savingContributions,
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
    expect(financialProfiles.plannedMonthlyContribution.name).toBe('planned_monthly_contribution')
    expect(financialProfiles.plannedMonthlyContribution.notNull).toBe(true)
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
    expect(financialGoals.strategy.name).toBe('strategy')
    expect(financialGoals.strategy.notNull).toBe(true)
  })

  it('stores monthly intent in global allocation plan snapshots and entries', () => {
    expect(financialProfiles.plannedMonthlyContribution.name).toBe('planned_monthly_contribution')
    expect(financialGoals.strategy.name).toBe('strategy')
    expect(getTableName(allocationPlanSnapshots)).toBe('allocation_plan_snapshots')
    expect(allocationPlanSnapshots.userId.name).toBe('user_id')
    expect(allocationPlanSnapshots.effectiveMonth.name).toBe('effective_month')

    expect(getTableName(allocationPlanEntries)).toBe('allocation_plan_entries')
    expect(allocationPlanEntries.snapshotId.name).toBe('snapshot_id')
    expect(allocationPlanEntries.goalId.name).toBe('goal_id')
    expect(allocationPlanEntries.percentage.name).toBe('percentage')

    expect('contributionChannels' in schema).toBe(false)
    expect('channelPlanSnapshots' in schema).toBe(false)
    expect('channelPlanAllocations' in schema).toBe(false)
  })

  it('stores Goal workspace lifecycle and actual positions', () => {
    expect(financialGoals.priority.name).toBe('priority')
    expect(financialGoals.status.name).toBe('status')
    expect(financialGoals.desiredDate.name).toBe('desired_date')
    expect(financialGoals.completedAt.name).toBe('completed_at')
    expect(getTableName(goalSavingsPositions)).toBe('goal_savings_positions')
    expect(goalSavingsPositions.goalId.name).toBe('goal_id')
    expect(goalSavingsPositions.location.name).toBe('location')
    expect(getTableName(goalInvestmentPositions)).toBe('goal_investment_positions')
    expect(goalInvestmentPositions.annualReturnRate.name).toBe('annual_return_rate')
    expect(goalInvestmentPositions.availability.name).toBe('availability')
    expect(goalInvestmentPositions.availableFrom.name).toBe('available_from')
  })

  it('stores reversible saving contributions and goal allocations', () => {
    expect(getTableName(savingContributions)).toBe('saving_contributions')
    expect(savingContributions.userId.name).toBe('user_id')
    expect(savingContributions.amount.name).toBe('amount')
    expect(savingContributions.currency.name).toBe('currency')
    expect(savingContributions.arsSpent.name).toBe('ars_spent')
    expect(savingContributions.effectiveRate.name).toBe('effective_rate')
    expect(getTableName(savingContributionAllocations)).toBe('saving_contribution_allocations')
    expect(savingContributionAllocations.savingPositionId.name).toBe('saving_position_id')
  })
})

