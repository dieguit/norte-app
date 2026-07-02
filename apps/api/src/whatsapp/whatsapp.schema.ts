import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const whatsappAuthState = pgTable('whatsapp_auth_state', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull(),
});

export type WhatsappAuthState = typeof whatsappAuthState.$inferSelect;
export type NewWhatsappAuthState = typeof whatsappAuthState.$inferInsert;
