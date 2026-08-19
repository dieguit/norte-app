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

export const financialProfiles = pgTable('financial_profiles', {
  userId: text('user_id').primaryKey(),
  baseCurrency: varchar('base_currency', { length: 3 }).notNull().default('ARS'),
  approximateMonthlyIncome: numeric('approximate_monthly_income', { precision: 12, scale: 2 }).notNull(),
  approximateMonthlyExpenses: numeric('approximate_monthly_expenses', { precision: 12, scale: 2 }),
  expensesKnowledge: varchar('expenses_knowledge', { length: 16 }).notNull(),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull(),
})

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
    saveEnabled: boolean('save_enabled').notNull().default(false),
    investEnabled: boolean('invest_enabled').notNull().default(false),
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
  ],
)

export const contributionChannels = pgTable(
  'contribution_channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    fundingMethod: varchar('funding_method', { length: 16 }).notNull(),
    destinationCurrency: varchar('destination_currency', { length: 3 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('contribution_channels_user_method_currency_uidx').on(
      table.userId,
      table.fundingMethod,
      table.destinationCurrency,
    ),
    check('contribution_channels_method_check', sql`${table.fundingMethod} in ('save', 'invest')`),
    check('contribution_channels_currency_check', sql`${table.destinationCurrency} in ('ARS', 'USD')`),
  ],
)

export const channelPlanSnapshots = pgTable(
  'channel_plan_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => contributionChannels.id, { onDelete: 'cascade' }),
    monthlyCommitmentAmount: numeric('monthly_commitment_amount', { precision: 12, scale: 2 }),
    baseCurrency: varchar('base_currency', { length: 3 }).notNull(),
    commitmentStatus: varchar('commitment_status', { length: 8 }).notNull().default('active'),
    effectiveMonth: date('effective_month', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('channel_plan_snapshots_channel_effective_uidx').on(table.channelId, table.effectiveMonth),
    check('channel_plan_snapshots_commitment_check', sql`${table.monthlyCommitmentAmount} >= 0`),
    check('channel_plan_snapshots_currency_check', sql`${table.baseCurrency} in ('ARS', 'USD')`),
    check('channel_plan_snapshots_commitment_status_check', sql`${table.commitmentStatus} in ('active', 'paused')`),
  ],
)

export const channelPlanAllocations = pgTable(
  'channel_plan_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => channelPlanSnapshots.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => financialGoals.id, { onDelete: 'cascade' }),
    percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
  },
  (table) => [
    uniqueIndex('channel_plan_allocations_snapshot_goal_uidx').on(table.snapshotId, table.goalId),
    check('channel_plan_allocations_percentage_check', sql`${table.percentage} between 0 and 100`),
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
    location: text('location'),
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

export type OnboardingDraft = typeof onboardingDrafts.$inferSelect
export type FinancialProfile = typeof financialProfiles.$inferSelect
export type FinancialGoal = typeof financialGoals.$inferSelect
export type ContributionChannel = typeof contributionChannels.$inferSelect
export type ChannelPlanSnapshot = typeof channelPlanSnapshots.$inferSelect
export type ChannelPlanAllocation = typeof channelPlanAllocations.$inferSelect
export type GoalSavingsPosition = typeof goalSavingsPositions.$inferSelect
export type GoalInvestmentPosition = typeof goalInvestmentPositions.$inferSelect
