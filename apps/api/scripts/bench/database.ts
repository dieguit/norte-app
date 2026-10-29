import assert from 'node:assert/strict';
import type { Pool } from 'pg';

const tables = [
  'saving_contributions',
  'investment_contributions',
  'savings_place_transfers',
  'financial_goals',
  'expenses',
  'incomes',
  'allocation_plan_snapshots',
  'expense_sources',
  'income_sources',
  'savings_places',
  'financial_profiles',
  'notification_settings',
  'notifications',
  'whatsapp_links',
  'benefit_user_preferences',
];

export async function snapshotUser(pool: Pool, userId: string) {
  return Promise.all(
    tables.map(async (table) => ({
      table,
      rows: (
        await pool.query<{ row: Record<string, unknown> }>(
          `select to_jsonb(t) as row from public.${table} t where user_id = $1 order by to_jsonb(t)::text`,
          [userId],
        )
      ).rows,
    })),
  );
}

export async function cleanupBenchUser(pool: Pool, userId: string) {
  assert.match(userId, /^bench_[0-9a-f-]{36}$/);
  const client = await pool.connect();
  try {
    await client.query('begin');
    // Withdrawals restrict goal deletion; contribution allocations cascade from contributions.
    await client.query(
      'delete from goal_completion_withdrawals where goal_id in (select id from financial_goals where user_id = $1)',
      [userId],
    );
    for (const table of tables)
      await client.query(`delete from public.${table} where user_id = $1`, [
        userId,
      ]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  const counts = (await snapshotUser(pool, userId)).map(({ table, rows }) => ({
    table,
    rows: rows.length,
  }));
  console.log('Cleanup', userId, counts);
  assert(
    counts.every(({ rows }) => rows === 0),
    'Bench user rows remain',
  );
}
