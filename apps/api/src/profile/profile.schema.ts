import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  check,
  index,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import {
  createdAt,
  currencyIn,
  moneyAmount,
  timestamps,
} from '../database/columns';

export const financialProfiles = pgTable(
  'financial_profiles',
  {
    userId: text('user_id').primaryKey(),
    baseCurrency: varchar('base_currency', { length: 3 })
      .notNull()
      .default('ARS'),
    expensesKnowledge: varchar('expenses_knowledge', { length: 16 }).notNull(),
    plannedMonthlyContribution: moneyAmount('planned_monthly_contribution'),
    goalDedicationPercentage: numeric('goal_dedication_percentage', {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default('90.00'),
    onboardingCompleted: boolean('onboarding_completed')
      .notNull()
      .default(false),
    ...timestamps(),
  },
  (table) => [
    check(
      'financial_profiles_goal_dedication_percentage_check',
      sql`${table.goalDedicationPercentage} between 0 and 100`,
    ),
  ],
);

function sourceTable<TName extends string>(name: TName, indexName: string) {
  return pgTable(
    name,
    {
      id: uuid('id').defaultRandom().primaryKey(),
      userId: text('user_id')
        .notNull()
        .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
      name: varchar('name', { length: 120 }).notNull(),
      normalizedName: varchar('normalized_name', { length: 120 }).notNull(),
      createdAt: createdAt(),
    },
    (table) => [uniqueIndex(indexName).on(table.userId, table.normalizedName)],
  );
}

export const incomeSources = sourceTable(
  'income_sources',
  'income_sources_user_normalized_name_uidx',
);

const commonEntryColumns = (sourceTableRef: () => AnyPgColumn) => ({
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
  sourceKind: varchar('source_kind', { length: 24 }).notNull(),
  sourceId: uuid('source_id').references(sourceTableRef, {
    onDelete: 'restrict',
  }),
  concept: varchar('concept', { length: 120 }),
  amount: moneyAmount().notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  recurring: boolean('recurring').notNull(),
  effectiveMonth: date('effective_month', { mode: 'string' }).notNull(),
});

export const incomes = pgTable(
  'incomes',
  {
    ...commonEntryColumns(() => incomeSources.id),
    ...timestamps(),
  },
  (table) => [
    index('incomes_user_id_idx').on(table.userId),
    check('incomes_amount_check', sql`${table.amount} > 0`),
    check('incomes_currency_check', currencyIn(table.currency)),
    check(
      'incomes_source_kind_check',
      sql`${table.sourceKind} in ('salary', 'independent', 'pension', 'rent', 'investments', 'family_support', 'asset_sale', 'bonus', 'occasional_work', 'gift_inheritance', 'refund', 'extraordinary_income', 'custom', 'uncategorized')`,
    ),
    check(
      'incomes_source_check',
      sql`(${table.sourceKind} = 'custom' and ${table.sourceId} is not null) or (${table.sourceKind} != 'custom' and ${table.sourceId} is null)`,
    ),
  ],
);

export const expenseSources = sourceTable(
  'expense_sources',
  'expense_sources_user_normalized_name_uidx',
);

export const expenses = pgTable(
  'expenses',
  {
    ...commonEntryColumns(() => expenseSources.id),
    endMonth: date('end_month', { mode: 'string' }),
    ...timestamps(),
  },
  (table) => [
    index('expenses_user_id_idx').on(table.userId),
    check('expenses_amount_check', sql`${table.amount} > 0`),
    check('expenses_currency_check', currencyIn(table.currency)),
    check(
      'expenses_source_kind_check',
      sql`${table.sourceKind} in ('housing', 'school', 'health', 'loans', 'utilities', 'insurance', 'family_support', 'subscriptions', 'clothing', 'gift', 'family_help', 'occasional_health', 'maintenance', 'travel_leisure', 'technology', 'taxes_fees', 'custom', 'uncategorized')`,
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
);

export const allocationPlanSnapshots = pgTable(
  'allocation_plan_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
    effectiveMonth: date('effective_month', { mode: 'string' }).notNull(),
    plannedMonthlyContribution: moneyAmount('planned_monthly_contribution'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('allocation_plan_snapshots_user_effective_uidx').on(
      table.userId,
      table.effectiveMonth,
    ),
  ],
);

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
    uniqueIndex('allocation_plan_entries_snapshot_goal_uidx').on(
      table.snapshotId,
      table.goalId,
    ),
    check(
      'allocation_plan_entries_percentage_check',
      sql`${table.percentage} between 0 and 100`,
    ),
  ],
);

export const financialGoals = pgTable(
  'financial_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    targetAmount: moneyAmount('target_amount'),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    priority: varchar('priority', { length: 8 }).notNull().default('medium'),
    status: varchar('status', { length: 12 }).notNull().default('active'),
    desiredDate: date('desired_date', { mode: 'string' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    emergencyFundMonths: integer('emergency_fund_months'),
    strategy: varchar('strategy', { length: 16 }).notNull(),
    ...timestamps(),
  },
  (table) => [
    index('financial_goals_user_id_idx').on(table.userId),
    check(
      'financial_goals_priority_check',
      sql`${table.priority} in ('high', 'medium', 'low')`,
    ),
    check(
      'financial_goals_status_check',
      sql`${table.status} in ('active', 'paused', 'completed')`,
    ),
    check(
      'financial_goals_strategy_check',
      sql`${table.strategy} in ('save', 'invest')`,
    ),
  ],
);

export const goalSavingsPositions = pgTable(
  'goal_savings_positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => financialGoals.id, { onDelete: 'cascade' }),
    amount: moneyAmount().notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    ...timestamps(),
  },
  (table) => [
    index('goal_savings_positions_goal_id_idx').on(table.goalId),
    check('goal_savings_positions_amount_check', sql`${table.amount} >= 0`),
    check('goal_savings_positions_currency_check', currencyIn(table.currency)),
  ],
);

export const goalInvestmentPositions = pgTable(
  'goal_investment_positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => financialGoals.id, { onDelete: 'cascade' }),
    currentValue: moneyAmount('current_value').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    annualReturnRate: numeric('annual_return_rate', {
      precision: 6,
      scale: 3,
    })
      .notNull()
      .default('8.000'),
    availability: varchar('availability', { length: 16 })
      .notNull()
      .default('available_now'),
    availableFrom: date('available_from', { mode: 'string' }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('goal_investment_positions_goal_id_uidx').on(table.goalId),
    check(
      'goal_investment_positions_current_value_check',
      sql`${table.currentValue} >= 0`,
    ),
    check(
      'goal_investment_positions_currency_check',
      currencyIn(table.currency),
    ),
    check(
      'goal_investment_positions_availability_check',
      sql`${table.availability} in ('available_now', 'available_from', 'long_term')`,
    ),
    check(
      'goal_investment_positions_available_from_check',
      sql`(${table.availability} = 'available_from' and ${table.availableFrom} is not null) or (${table.availability} != 'available_from' and ${table.availableFrom} is null)`,
    ),
  ],
);

const commonAllocationColumns = (contributionRef: () => AnyPgColumn) => ({
  id: uuid('id').defaultRandom().primaryKey(),
  contributionId: uuid('contribution_id')
    .notNull()
    .references(contributionRef, { onDelete: 'cascade' }),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => financialGoals.id, { onDelete: 'cascade' }),
  amount: moneyAmount().notNull(),
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
});

export const savingContributionAllocations = pgTable(
  'saving_contribution_allocations',
  {
    ...commonAllocationColumns(() => savingContributions.id),
    savingPositionId: uuid('saving_position_id')
      .notNull()
      .references(() => goalSavingsPositions.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('saving_contribution_allocations_contribution_id_idx').on(
      table.contributionId,
    ),
    index('saving_contribution_allocations_goal_id_idx').on(table.goalId),
    uniqueIndex('saving_contribution_allocations_saving_position_id_uidx').on(
      table.savingPositionId,
    ),
    check(
      'saving_contribution_allocations_amount_check',
      sql`${table.amount} >= 0`,
    ),
    check(
      'saving_contribution_allocations_percentage_check',
      sql`${table.percentage} between 0 and 100`,
    ),
  ],
);

export const investmentContributionAllocations = pgTable(
  'investment_contribution_allocations',
  {
    ...commonAllocationColumns(() => investmentContributions.id),
    investmentPositionId: uuid('investment_position_id')
      .notNull()
      .references(() => goalInvestmentPositions.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('investment_contribution_allocations_contribution_id_idx').on(
      table.contributionId,
    ),
    index('investment_contribution_allocations_goal_id_idx').on(table.goalId),
    uniqueIndex(
      'investment_contribution_allocations_contribution_position_uidx',
    ).on(table.contributionId, table.investmentPositionId),
    check(
      'investment_contribution_allocations_amount_check',
      sql`${table.amount} >= 0`,
    ),
    check(
      'investment_contribution_allocations_percentage_check',
      sql`${table.percentage} between 0 and 100`,
    ),
  ],
);

export const savingsPlaces = pgTable(
  'savings_places',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 120 }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('savings_places_user_normalized_name_uidx').on(
      table.userId,
      table.normalizedName,
    ),
    foreignKey({
      name: 'savings_places_user_id_fk',
      columns: [table.userId],
      foreignColumns: [financialProfiles.userId],
    })
      .onDelete('cascade')
      .onUpdate('no action'),
  ],
);

const contributionColumns = () => ({
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => financialProfiles.userId, { onDelete: 'cascade' }),
  amount: moneyAmount().notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
});

const contributionUsdColumns = () => ({
  arsSpent: moneyAmount('ars_spent'),
  effectiveRate: moneyAmount('effective_rate'),
  ...timestamps(),
});

const usdFieldsCheck = (table: {
  currency: AnyPgColumn;
  arsSpent: AnyPgColumn;
  effectiveRate: AnyPgColumn;
}) =>
  sql`(${table.currency} = 'USD' and ${table.arsSpent} is not null and ${table.effectiveRate} is not null) or (${table.currency} = 'ARS' and ${table.arsSpent} is null and ${table.effectiveRate} is null)`;

export const savingContributions = pgTable(
  'saving_contributions',
  {
    ...contributionColumns(),
    placeId: uuid('place_id').notNull(),
    ...contributionUsdColumns(),
  },
  (table) => [
    index('saving_contributions_user_id_idx').on(table.userId),
    index('saving_contributions_place_id_idx').on(table.placeId),
    foreignKey({
      name: 'saving_contributions_place_id_fk',
      columns: [table.placeId],
      foreignColumns: [savingsPlaces.id],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
    check('saving_contributions_amount_check', sql`${table.amount} > 0`),
    check('saving_contributions_currency_check', currencyIn(table.currency)),
    check('saving_contributions_usd_fields_check', usdFieldsCheck(table)),
  ],
);

export const savingsPlaceTransfers = pgTable(
  'savings_place_transfers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    fromPlaceId: uuid('from_place_id').notNull(),
    toPlaceId: uuid('to_place_id').notNull(),
    amount: moneyAmount().notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    createdAt: createdAt(),
  },
  (table) => [
    index('savings_place_transfers_user_id_idx').on(table.userId),
    index('savings_place_transfers_from_place_id_idx').on(table.fromPlaceId),
    index('savings_place_transfers_to_place_id_idx').on(table.toPlaceId),
    foreignKey({
      name: 'savings_place_transfers_user_id_fk',
      columns: [table.userId],
      foreignColumns: [financialProfiles.userId],
    })
      .onDelete('cascade')
      .onUpdate('no action'),
    foreignKey({
      name: 'savings_place_transfers_from_place_id_fk',
      columns: [table.fromPlaceId],
      foreignColumns: [savingsPlaces.id],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
    foreignKey({
      name: 'savings_place_transfers_to_place_id_fk',
      columns: [table.toPlaceId],
      foreignColumns: [savingsPlaces.id],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
    check('savings_place_transfers_amount_check', sql`${table.amount} > 0`),
    check('savings_place_transfers_currency_check', currencyIn(table.currency)),
    check(
      'savings_place_transfers_places_check',
      sql`${table.fromPlaceId} <> ${table.toPlaceId}`,
    ),
  ],
);

export const goalCompletionWithdrawals = pgTable(
  'goal_completion_withdrawals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id').notNull(),
    placeId: uuid('place_id').notNull(),
    amount: moneyAmount().notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('goal_completion_withdrawals_goal_place_uidx').on(
      table.goalId,
      table.placeId,
    ),
    index('goal_completion_withdrawals_goal_id_idx').on(table.goalId),
    index('goal_completion_withdrawals_place_id_idx').on(table.placeId),
    foreignKey({
      name: 'goal_completion_withdrawals_goal_id_fk',
      columns: [table.goalId],
      foreignColumns: [financialGoals.id],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
    foreignKey({
      name: 'goal_completion_withdrawals_place_id_fk',
      columns: [table.placeId],
      foreignColumns: [savingsPlaces.id],
    })
      .onDelete('restrict')
      .onUpdate('no action'),
    check('goal_completion_withdrawals_amount_check', sql`${table.amount} > 0`),
    check(
      'goal_completion_withdrawals_currency_check',
      currencyIn(table.currency),
    ),
  ],
);

export const investmentContributions = pgTable(
  'investment_contributions',
  {
    ...contributionColumns(),
    ...contributionUsdColumns(),
  },
  (table) => [
    index('investment_contributions_user_id_idx').on(table.userId),
    check('investment_contributions_amount_check', sql`${table.amount} > 0`),
    check(
      'investment_contributions_currency_check',
      currencyIn(table.currency),
    ),
    check('investment_contributions_usd_fields_check', usdFieldsCheck(table)),
  ],
);
