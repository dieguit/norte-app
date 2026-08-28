import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { Report } from '@/features/admin/report'
import type { OnboardingAnswers } from '@/features/onboarding/definition'

export const onboardingDrafts = pgTable('onboarding_drafts', {
  deviceId: text('device_id').primaryKey(),
  answers: jsonb('answers').$type<OnboardingAnswers>().notNull().default({}),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  report: jsonb('report').$type<Report>(),
  reportSentOn: timestamp('report_sent_on', { withTimezone: true }),
  ctaClickedOn: timestamp('cta_clicked_on', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull(),
})

export const financialProfiles = pgTable(
  'financial_profiles',
  {
    userId: text('user_id').primaryKey(),
    baseCurrency: varchar('base_currency', { length: 3 }).notNull().default('ARS'),
    expensesKnowledge: varchar('expenses_knowledge', { length: 16 }).notNull(),
    plannedMonthlyContribution: numeric('planned_monthly_contribution', { precision: 12, scale: 2 }),
    goalDedicationPercentage: numeric('goal_dedication_percentage', {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default('90.00'),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    check(
      'financial_profiles_goal_dedication_percentage_check',
      sql`${table.goalDedicationPercentage} between 0 and 100`,
    ),
  ],
)

export const financialGoals = pgTable(
  'financial_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    targetAmount: numeric('target_amount', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    priority: varchar('priority', { length: 8 }).notNull().default('medium'),
    status: varchar('status', { length: 12 }).notNull().default('active'),
    desiredDate: date('desired_date', { mode: 'string' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    emergencyFundMonths: integer('emergency_fund_months'),
    strategy: varchar('strategy', { length: 16 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    index('financial_goals_user_id_idx').on(table.userId),
    check('financial_goals_priority_check', sql`${table.priority} in ('high', 'medium', 'low')`),
    check('financial_goals_status_check', sql`${table.status} in ('active', 'paused', 'completed')`),
    check('financial_goals_strategy_check', sql`${table.strategy} in ('save', 'invest')`),
  ],
)

export const allocationPlanSnapshots = pgTable(
  'allocation_plan_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    effectiveMonth: date('effective_month', { mode: 'string' }).notNull(),
    plannedMonthlyContribution: numeric('planned_monthly_contribution', {
      precision: 12,
      scale: 2,
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('allocation_plan_snapshots_user_effective_uidx').on(table.userId, table.effectiveMonth),
  ],
)

export const allocationPlanEntries = pgTable(
  'allocation_plan_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => allocationPlanSnapshots.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => financialGoals.id, { onDelete: 'cascade' }),
    percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
  },
  (table) => [
    uniqueIndex('allocation_plan_entries_snapshot_goal_uidx').on(table.snapshotId, table.goalId),
    check('allocation_plan_entries_percentage_check', sql`${table.percentage} between 0 and 100`),
  ],
)

export const goalSavingsPositions = pgTable(
  'goal_savings_positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => financialGoals.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    index('goal_savings_positions_goal_id_idx').on(table.goalId),
    check('goal_savings_positions_amount_check', sql`${table.amount} >= 0`),
    check('goal_savings_positions_currency_check', sql`${table.currency} in ('ARS', 'USD')`),
  ],
)

export const goalInvestmentPositions = pgTable(
  'goal_investment_positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => financialGoals.id, { onDelete: 'cascade' }),
    currentValue: numeric('current_value', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    annualReturnRate: numeric('annual_return_rate', { precision: 6, scale: 3 }).notNull().default('8.000'),
    availability: varchar('availability', { length: 16 }).notNull().default('available_now'),
    availableFrom: date('available_from', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('goal_investment_positions_goal_id_uidx').on(table.goalId),
    check('goal_investment_positions_current_value_check', sql`${table.currentValue} >= 0`),
    check('goal_investment_positions_currency_check', sql`${table.currency} in ('ARS', 'USD')`),
    check(
      'goal_investment_positions_availability_check',
      sql`${table.availability} in ('available_now', 'available_from', 'long_term')`,
    ),
    check(
      'goal_investment_positions_available_from_check',
      sql`(${table.availability} = 'available_from' and ${table.availableFrom} is not null) or (${table.availability} != 'available_from' and ${table.availableFrom} is null)`,
    ),
  ],
)

export const savingContributions = pgTable(
  'saving_contributions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    placeId: uuid('place_id')
      .notNull()
      .references(() => savingsPlaces.id, { onDelete: 'restrict' }),
    arsSpent: numeric('ars_spent', { precision: 12, scale: 2 }),
    effectiveRate: numeric('effective_rate', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    index('saving_contributions_user_id_idx').on(table.userId),
    index('saving_contributions_place_id_idx').on(table.placeId),
    check('saving_contributions_amount_check', sql`${table.amount} > 0`),
    check('saving_contributions_currency_check', sql`${table.currency} in ('ARS', 'USD')`),
    check(
      'saving_contributions_usd_fields_check',
      sql`(${table.currency} = 'USD' and ${table.arsSpent} is not null and ${table.effectiveRate} is not null) or (${table.currency} = 'ARS' and ${table.arsSpent} is null and ${table.effectiveRate} is null)`,
    ),
  ],
)

export const savingContributionAllocations = pgTable(
  'saving_contribution_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contributionId: uuid('contribution_id')
      .notNull()
      .references(() => savingContributions.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => financialGoals.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
    savingPositionId: uuid('saving_position_id')
      .notNull()
      .references(() => goalSavingsPositions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('saving_contribution_allocations_contribution_id_idx').on(table.contributionId),
    index('saving_contribution_allocations_goal_id_idx').on(table.goalId),
    uniqueIndex('saving_contribution_allocations_saving_position_id_uidx').on(table.savingPositionId),
    check('saving_contribution_allocations_amount_check', sql`${table.amount} >= 0`),
    check('saving_contribution_allocations_percentage_check', sql`${table.percentage} between 0 and 100`),
  ],
)

export const investmentContributions = pgTable(
  'investment_contributions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    arsSpent: numeric('ars_spent', { precision: 12, scale: 2 }),
    effectiveRate: numeric('effective_rate', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    index('investment_contributions_user_id_idx').on(table.userId),
    check('investment_contributions_amount_check', sql`${table.amount} > 0`),
    check('investment_contributions_currency_check', sql`${table.currency} in ('ARS', 'USD')`),
    check(
      'investment_contributions_usd_fields_check',
      sql`(${table.currency} = 'USD' and ${table.arsSpent} is not null and ${table.effectiveRate} is not null) or (${table.currency} = 'ARS' and ${table.arsSpent} is null and ${table.effectiveRate} is null)`,
    ),
  ],
)

export const investmentContributionAllocations = pgTable(
  'investment_contribution_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contributionId: uuid('contribution_id')
      .notNull()
      .references(() => investmentContributions.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => financialGoals.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
    investmentPositionId: uuid('investment_position_id')
      .notNull()
      .references(() => goalInvestmentPositions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('investment_contribution_allocations_contribution_id_idx').on(table.contributionId),
    index('investment_contribution_allocations_goal_id_idx').on(table.goalId),
    uniqueIndex('investment_contribution_allocations_contribution_position_uidx').on(
      table.contributionId,
      table.investmentPositionId,
    ),
    check('investment_contribution_allocations_amount_check', sql`${table.amount} >= 0`),
    check('investment_contribution_allocations_percentage_check', sql`${table.percentage} between 0 and 100`),
  ],
)

export type OnboardingDraft = typeof onboardingDrafts.$inferSelect
export type FinancialProfile = typeof financialProfiles.$inferSelect
export type FinancialGoal = typeof financialGoals.$inferSelect
export type AllocationPlanSnapshot = typeof allocationPlanSnapshots.$inferSelect
export type AllocationPlanEntry = typeof allocationPlanEntries.$inferSelect
export type GoalSavingsPosition = typeof goalSavingsPositions.$inferSelect
export type GoalInvestmentPosition = typeof goalInvestmentPositions.$inferSelect
export type SavingContribution = typeof savingContributions.$inferSelect
export type SavingContributionAllocation = typeof savingContributionAllocations.$inferSelect
export type InvestmentContribution = typeof investmentContributions.$inferSelect
export type InvestmentContributionAllocation = typeof investmentContributionAllocations.$inferSelect
export type SavingsPlace = typeof savingsPlaces.$inferSelect
export type SavingsPlaceTransfer = typeof savingsPlaceTransfers.$inferSelect

export const incomeSources = pgTable(
  'income_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('income_sources_user_normalized_name_uidx').on(
      table.userId,
      table.normalizedName,
    ),
  ],
)

export const incomes = pgTable(
  'incomes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    sourceKind: varchar('source_kind', { length: 24 }).notNull(),
    sourceId: uuid('source_id').references(() => incomeSources.id, { onDelete: 'restrict' }),
    concept: varchar('concept', { length: 120 }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    recurring: boolean('recurring').notNull(),
    effectiveMonth: date('effective_month', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    index('incomes_user_id_idx').on(table.userId),
    check('incomes_amount_check', sql`${table.amount} > 0`),
    check('incomes_currency_check', sql`${table.currency} in ('ARS', 'USD')`),
    check(
      'incomes_source_kind_check',
      sql`${table.sourceKind} in ('salary', 'independent', 'pension', 'rent', 'investments', 'family_support', 'asset_sale', 'bonus', 'occasional_work', 'gift_inheritance', 'refund', 'extraordinary_income', 'custom')`,
    ),
    check(
      'incomes_source_check',
      sql`(${table.sourceKind} = 'custom' and ${table.sourceId} is not null) or (${table.sourceKind} != 'custom' and ${table.sourceId} is null)`,
    ),
  ],
)

export type IncomeSource = typeof incomeSources.$inferSelect
export type Income = typeof incomes.$inferSelect

export const expenseSources = pgTable(
  'expense_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('expense_sources_user_normalized_name_uidx').on(
      table.userId,
      table.normalizedName,
    ),
  ],
)

export const savingsPlaces = pgTable(
  'savings_places',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('savings_places_user_normalized_name_uidx').on(table.userId, table.normalizedName),
  ],
)

export const savingsPlaceTransfers = pgTable(
  'savings_place_transfers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    fromPlaceId: uuid('from_place_id')
      .notNull()
      .references(() => savingsPlaces.id, { onDelete: 'restrict' }),
    toPlaceId: uuid('to_place_id')
      .notNull()
      .references(() => savingsPlaces.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('savings_place_transfers_user_id_idx').on(table.userId),
    index('savings_place_transfers_from_place_id_idx').on(table.fromPlaceId),
    index('savings_place_transfers_to_place_id_idx').on(table.toPlaceId),
    check('savings_place_transfers_amount_check', sql`${table.amount} > 0`),
    check('savings_place_transfers_currency_check', sql`${table.currency} in ('ARS', 'USD')`),
    check('savings_place_transfers_places_check', sql`${table.fromPlaceId} <> ${table.toPlaceId}`),
  ],
)

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    sourceKind: varchar('source_kind', { length: 24 }).notNull(),
    sourceId: uuid('source_id').references(() => expenseSources.id, { onDelete: 'restrict' }),
    concept: varchar('concept', { length: 120 }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    recurring: boolean('recurring').notNull(),
    effectiveMonth: date('effective_month', { mode: 'string' }).notNull(),
    endMonth: date('end_month', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    index('expenses_user_id_idx').on(table.userId),
    check('expenses_amount_check', sql`${table.amount} > 0`),
    check('expenses_currency_check', sql`${table.currency} in ('ARS', 'USD')`),
    check(
      'expenses_source_kind_check',
      sql`${table.sourceKind} in ('housing', 'school', 'health', 'loans', 'utilities', 'insurance', 'family_support', 'subscriptions', 'clothing', 'gift', 'family_help', 'occasional_health', 'maintenance', 'travel_leisure', 'technology', 'taxes_fees', 'custom')`,
    ),
    check(
      'expenses_source_check',
      sql`(${table.sourceKind} = 'custom' and ${table.sourceId} is not null) or (${table.sourceKind} != 'custom' and ${table.sourceId} is null)`,
    ),
    check(
      'expenses_end_month_check',
      sql`(${table.recurring} = false and ${table.endMonth} is null) or (${table.recurring} = true and (${table.endMonth} is null or ${table.endMonth} > ${table.effectiveMonth}))`,
    ),
  ],
)

export type ExpenseSource = typeof expenseSources.$inferSelect
export type Expense = typeof expenses.$inferSelect
