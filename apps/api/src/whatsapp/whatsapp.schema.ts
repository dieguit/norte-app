import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { updatedAt } from '../database/columns';

export const whatsappAuthState = pgTable('whatsapp_auth_state', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
});

export const whatsappLinks = pgTable('whatsapp_links', {
  jid: text('jid').primaryKey(),
  userId: text('user_id').notNull().unique(),
  linkedAt: timestamp('linked_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const whatsappLinkTokens = pgTable('whatsapp_link_tokens', {
  token: text('token').primaryKey(),
  jid: text('jid').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});
