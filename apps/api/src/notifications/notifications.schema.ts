import { sql, type SQL } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from '../database/columns';

const typeIn = (column: AnyPgColumn): SQL =>
  sql`${column} in ('day_close_checkin')`;

export const notificationSettings = pgTable(
  'notification_settings',
  {
    userId: text('user_id').notNull(),
    type: text('type').notNull(),
    enabled: boolean('enabled').notNull(),
    frequency: text('frequency').notNull().default('daily'),
    time: text('time').notNull(),
    ...timestamps(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.type] }),
    check('notification_settings_type_check', typeIn(table.type)),
    check(
      'notification_settings_frequency_check',
      sql`${table.frequency} in ('daily')`,
    ),
    check(
      'notification_settings_time_check',
      sql`${table.time} ~ '^([01][0-9]|2[0-3]):(00|30)$'`,
    ),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    type: text('type').notNull(),
    period: date('period', { mode: 'string' }).notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    status: text('status').notNull(),
    ...timestamps(),
  },
  (table) => [
    unique('notifications_user_type_period_unique').on(
      table.userId,
      table.type,
      table.period,
    ),
    index('notifications_status_scheduled_at_idx').on(
      table.status,
      table.scheduledAt,
    ),
    check('notifications_type_check', typeIn(table.type)),
    check(
      'notifications_status_check',
      sql`${table.status} in ('open', 'answered', 'closed')`,
    ),
  ],
);
