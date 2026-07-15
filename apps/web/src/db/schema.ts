import { sql } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export type OnboardingAnswers = Record<string, string | number>

export const onboardingDrafts = pgTable('onboarding_drafts', {
  deviceId: text('device_id').primaryKey(),
  answers: jsonb('answers').$type<OnboardingAnswers>().notNull().default({}),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull(),
})

export type OnboardingDraft = typeof onboardingDrafts.$inferSelect
