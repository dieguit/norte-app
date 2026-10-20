import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from '../database/columns';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  ...timestamps(),
});

export type User = typeof users.$inferSelect;
