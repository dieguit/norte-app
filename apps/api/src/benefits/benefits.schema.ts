import { sql } from 'drizzle-orm';
import {
  check,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from '../database/columns';

export const benefitUserPreferences = pgTable('benefit_user_preferences', {
  userId: text('user_id').primaryKey(),
  instrumentSlugs: text('instrument_slugs').array().notNull(),
  categories: text('categories').array().notNull(),
  ...timestamps(),
});

export const benefits = pgTable(
  'benefits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerSlug: text('provider_slug').notNull(),
    sourceUrl: text('source_url').notNull(),
    fingerprint: text('fingerprint').notNull().unique(),
    title: text('title').notNull(),
    merchant: text('merchant'),
    category: text('category').notNull(),
    kind: text('kind').notNull(),
    value: numeric('value', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }).notNull(),
    maxAmount: numeric('max_amount', {
      precision: 12,
      scale: 2,
      mode: 'number',
    }),
    maxAmountPeriod: text('max_amount_period'),
    weekdays: integer('weekdays').array(),
    validFrom: date('valid_from', { mode: 'string' }),
    validTo: date('valid_to', { mode: 'string' }),
    instrumentSlugs: text('instrument_slugs').array().notNull(),
    conditions: text('conditions'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (table) => [
    check(
      'benefits_kind_check',
      sql`${table.kind} in ('discount', 'cashback', 'installments', 'nxm')`,
    ),
    check(
      'benefits_max_amount_period_check',
      sql`${table.maxAmountPeriod} in ('transaction', 'day', 'week', 'month')`,
    ),
  ],
);
// ponytail: stale benefits are never purged; add a cleanup of last_seen_at < now - 30d when the table grows.
