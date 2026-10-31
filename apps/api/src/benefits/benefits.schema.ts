import type { BenefitBankProfile, DigestCategory } from '@repo/shared-types';
import { boolean, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { timestamps } from '../database/columns';

export const benefitUserPreferences = pgTable('benefit_user_preferences', {
  userId: text('user_id').primaryKey(),
  banks: jsonb('banks').$type<BenefitBankProfile[]>().notNull().default([]),
  usesModo: boolean('uses_modo').notNull().default(false),
  categories: text('categories').array().$type<DigestCategory[]>().notNull(),
  ...timestamps(),
});
