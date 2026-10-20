import { describe, expect, it } from 'vitest';
import { pgTable, text } from 'drizzle-orm/pg-core';
import {
  createdAt,
  currencyIn,
  moneyAmount,
  timestamps,
  updatedAt,
} from './columns';

const testTable = pgTable('test_table', {
  curr: text('curr').notNull(),
  amt: moneyAmount(),
  ca: createdAt(),
  ua: updatedAt(),
  ...timestamps(),
});

describe('columns helpers', () => {
  it('creates timestamp and currency helpers', () => {
    expect(testTable.curr.name).toBe('curr');
    expect(testTable.amt.name).toBe('amount');
    expect(testTable.ca.name).toBe('created_at');
    expect(testTable.ua.name).toBe('updated_at');
    expect(testTable.createdAt.name).toBe('created_at');
    expect(testTable.updatedAt.name).toBe('updated_at');
    expect(currencyIn(testTable.curr)).toBeDefined();
  });
});
