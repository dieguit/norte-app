import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { timestamps } from '../database/columns';

export const whatsappAuthState = pgTable('whatsapp_auth_state', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  ...timestamps(),
});
