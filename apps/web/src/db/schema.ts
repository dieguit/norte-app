import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
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
  plannedMonthlyContribution: numeric('planned_monthly_contribution', { precision: 12, scale: 2 }).notNull(),
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
    emergencyFundMonths: integer('emergency_fund_months'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [index('financial_goals_user_id_idx').on(table.userId)],
)

export type OnboardingDraft = typeof onboardingDrafts.$inferSelect
export type FinancialProfile = typeof financialProfiles.$inferSelect
export type FinancialGoal = typeof financialGoals.$inferSelect
