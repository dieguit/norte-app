import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import * as schema from './schema'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  expenseSources,
  expenses,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
  goalSavingsPositions,
  incomeSources,
  incomes,
  investmentContributionAllocations,
  investmentContributions,
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
    expect(financialProfiles.plannedMonthlyContribution.notNull).toBe(false)
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

  it('stores the monthly commitment on an allocation snapshot', () => {
    expect(allocationPlanSnapshots.plannedMonthlyContribution.name).toBe(
      'planned_monthly_contribution',
    )
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

  it('stores investment contributions and goal allocations', () => {
    expect(investmentContributions).toBeDefined()
    expect(investmentContributionAllocations).toBeDefined()
    expect(getTableName(investmentContributions)).toBe('investment_contributions')
    expect(investmentContributions.userId.name).toBe('user_id')
    expect(investmentContributions.amount.name).toBe('amount')
    expect(investmentContributions.currency.name).toBe('currency')
    expect(investmentContributions.arsSpent.name).toBe('ars_spent')
    expect(investmentContributions.effectiveRate.name).toBe('effective_rate')
    expect(getTableName(investmentContributionAllocations)).toBe('investment_contribution_allocations')
    expect(investmentContributionAllocations.investmentPositionId.name).toBe('investment_position_id')
  })

  it('defines user-owned income sources', () => {
    expect(getTableName(incomeSources)).toBe('income_sources')
    expect(incomeSources.userId.name).toBe('user_id')
    expect(incomeSources.name.name).toBe('name')
    expect(incomeSources.normalizedName.name).toBe('normalized_name')
    expect(incomeSources.createdAt.name).toBe('created_at')
  })

  it('defines user incomes with source relationship', () => {
    expect(getTableName(incomes)).toBe('incomes')
    expect(incomes.userId.name).toBe('user_id')
    expect(incomes.sourceKind.name).toBe('source_kind')
    expect(incomes.sourceId.name).toBe('source_id')
    expect(incomes.amount.name).toBe('amount')
    expect(incomes.currency.name).toBe('currency')
    expect(incomes.recurring.name).toBe('recurring')
    expect(incomes.effectiveMonth.name).toBe('effective_month')
    expect(incomes.createdAt.name).toBe('created_at')
    expect(incomes.updatedAt.name).toBe('updated_at')
  })

  it('defines user-owned expense sources', () => {
    expect(getTableName(expenseSources)).toBe('expense_sources')
    expect(expenseSources.userId.name).toBe('user_id')
    expect(expenseSources.name.name).toBe('name')
    expect(expenseSources.normalizedName.name).toBe('normalized_name')
    expect(expenseSources.createdAt.name).toBe('created_at')
  })

  it('defines user expenses with source relationship and recurrence boundaries', () => {
    expect(getTableName(expenses)).toBe('expenses')
    expect(expenses.userId.name).toBe('user_id')
    expect(expenses.sourceKind.name).toBe('source_kind')
    expect(expenses.sourceId.name).toBe('source_id')
    expect(expenses.amount.name).toBe('amount')
    expect(expenses.currency.name).toBe('currency')
    expect(expenses.recurring.name).toBe('recurring')
    expect(expenses.effectiveMonth.name).toBe('effective_month')
    expect(expenses.endMonth.name).toBe('end_month')
    expect(expenses.createdAt.name).toBe('created_at')
    expect(expenses.updatedAt.name).toBe('updated_at')
  })
})

