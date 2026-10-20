import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from '../src/database/schema';

export function assertFixtureTarget(env: NodeJS.ProcessEnv): string {
  const connectionString = env.DATABASE_URL;
  const refuse = () => {
    throw new Error('Refusing unauthorized fixture database target');
  };
  if (!connectionString) return refuse();
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return refuse();
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    url.pathname !== '/norte_test' ||
    connectionString.includes('?') ||
    connectionString.includes('#')
  )
    return refuse();
  const compose =
    env.E2E_COMPOSE === '1' &&
    url.hostname === 'postgres-e2e' &&
    url.port === '5432';
  const disposable =
    env.E2E_ALLOW_DISPOSABLE_DATABASE === '1' &&
    env.E2E_DISPOSABLE_DATABASE_URL === connectionString;
  if (!compose && !disposable) return refuse();
  return connectionString;
}

export async function createFixtureDatabase(env: NodeJS.ProcessEnv) {
  const pool = new Pool({ connectionString: assertFixtureTarget(env) });
  try {
    const { rows } = await pool.query<{ name: string }>(
      'select current_database() as name',
    );
    if (rows[0]?.name !== 'norte_test')
      throw new Error('Refusing non-test fixture target');
    return { pool, db: drizzle(pool, { schema }) };
  } catch {
    await pool.end().catch(() => undefined);
    throw new Error(
      'Refusing fixture database: Unable to verify fixture database',
    );
  }
}
