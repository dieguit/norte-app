import { sql, type SQL } from 'drizzle-orm';
import { numeric, timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull();
export const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const moneyAmount = (name = 'amount') =>
  numeric(name, { precision: 12, scale: 2 });
export const currencyIn = (column: AnyPgColumn): SQL =>
  sql`${column} in ('ARS', 'USD')`;
