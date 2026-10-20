import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  investmentContributions,
  savingContributions,
  savingsPlaces,
} from '../src/database/schema';
import {
  assertDatabaseName,
  baseline,
  capture,
  createApi,
  migrateCli,
  startPostgres,
  withDatabase,
} from './support/database-ownership';

type Capture = Awaited<ReturnType<typeof capture>>;
const fixture = () =>
  readFileSync(resolve('test/fixtures/database-ownership.sql'), 'utf8');
async function apiRows(pool: Pool) {
  for (const [table, sql] of [
    [
      'users',
      "insert into users(name,phone) values ('Preserved','+5491100000000')",
    ],
    [
      'whatsapp_auth_state',
      `insert into whatsapp_auth_state(key,value) values ('preserve','{"nested":{"keys":[null,true,"á"]}}')`,
    ],
  ]) {
    if (
      (
        await pool.query('select to_regclass($1) as relation', [
          `public.${table}`,
        ])
      ).rows[0]?.relation
    )
      await pool.query(sql!);
  }
}
function preserved(before: Capture, after: Capture) {
  for (const [name, rows] of Object.entries(before.rows))
    expect(after.rows[name], name).toEqual(rows);
  for (const relation of before.catalog)
    expect(after.catalog).toContainEqual(relation);
  expect(after.journal.slice(0, before.journal.length)).toEqual(before.journal);
  expect(after.journal.length).toBe(before.journal.length + 1);
}

type ManifestRecord = { hash: string; created_at: string };

function loadManifestRecords() {
  const manifest = JSON.parse(
    readFileSync(resolve('migration-history/manifest.json'), 'utf8'),
  );
  const pairs = (kind: 'web' | 'api') =>
    manifest[kind].entries.map((entry: { tag: string; when: number }) => ({
      created_at: String(entry.when),
      hash: createHash('sha256')
        .update(
          readFileSync(
            resolve(
              kind === 'web' ? 'drizzle' : 'migration-history/pre-takeover',
              `${entry.tag}.sql`,
            ),
          ),
        )
        .digest('hex'),
    })) as ManifestRecord[];
  const web = pairs('web');
  const recognized = [...web, ...pairs('api')];
  return { web, recognized };
}

function acceptance(
  journal: ManifestRecord[],
  rows: Capture['rows'],
  web: ManifestRecord[],
  recognized: ManifestRecord[],
) {
  const errors: string[] = [];
  const keys = journal.map((row) => `${row.created_at}:${row.hash}`);
  if (new Set(keys).size !== keys.length) errors.push('3: duplicate');
  if (
    journal.some(
      (row) =>
        !recognized.some(
          (known) =>
            known.created_at === row.created_at && known.hash === row.hash,
        ),
    )
  )
    errors.push('3: unknown/hash');
  if (journal.some((row) => Number(row.created_at) >= 1792368000000))
    errors.push('3: unknown cutoff');
  if (
    Object.entries(rows).some(
      ([name, values]) =>
        name.startsWith('public.') &&
        !['public.users', 'public.whatsapp_auth_state'].includes(name) &&
        values.length > 0,
    ) &&
    web.some((row) => !keys.includes(`${row.created_at}:${row.hash}`))
  )
    errors.push('4: incomplete populated web');
  return errors;
}

type OperatorAcceptanceKind =
  | 'hole'
  | 'duplicate'
  | 'changed hash'
  | 'newer cutoff'
  | 'partial prefix with populated rows'
  | 'populated tables without tracking';

const recordsFor: Record<
  OperatorAcceptanceKind,
  (web: ManifestRecord[]) => ManifestRecord[]
> = {
  hole: (web) => web.filter((_, index) => index !== 10),
  duplicate: (web) => [...web, web[0]!],
  'changed hash': (web) =>
    web.map((row, index) => (index ? row : { ...row, hash: 'changed' })),
  'newer cutoff': (web) => [
    ...web,
    { hash: 'unknown', created_at: '1792368000001' },
  ],
  'partial prefix with populated rows': (web) => web.slice(0, 10),
  'populated tables without tracking': () => [],
};

describe('owned database guards', () => {
  it('rejects external URLs and names before opening a connection', async () => {
    const connect = vi
      .spyOn(Pool.prototype, 'connect')
      .mockImplementation(() => {
        throw new Error('Unexpected connection from unsafe input');
      });
    try {
      await expect(
        withDatabase('postgres://external/production', async () => undefined),
      ).rejects.toThrow('Not an owned');
      expect(() => migrateCli('postgres://external/production')).toThrow(
        'Not an owned',
      );
      for (const name of [
        'norte_test',
        'postgres',
        'norte_takeover_abc',
        'norte_takeover_' + 'a'.repeat(31) + '"',
      ]) {
        expect(() => assertDatabaseName(name)).toThrow('Unsafe test DB');
      }
      expect(connect).not.toHaveBeenCalled();
    } finally {
      connect.mockRestore();
    }
  });
});

describe('API database ownership — real Drizzle CLI', () => {
  let server: Awaited<ReturnType<typeof startPostgres>>;
  beforeAll(async () => {
    server = await startPostgres();
  }, 120_000);
  afterAll(async () => {
    await server?.stop();
  }, 30_000);

  async function success(
    pool: Pool,
    url: string,
    journalCount: number,
    before?: Capture,
  ) {
    migrateCli(url);
    const after = await capture(pool);
    expect(
      Object.keys(after.rows).filter((name) => name.startsWith('public.')),
    ).toHaveLength(20);
    expect(after.journal).toHaveLength(journalCount);
    if (before) preserved(before, after);
    migrateCli(url);
    expect(await capture(pool)).toEqual(after);
  }

  it('fresh: replays immutable web history including escaped 0011 and creates 20 tables', async () => {
    await withDatabase(server.adminUrl, async (pool, url) => {
      await success(pool, url, 22);
      const snapshot = JSON.parse(
        readFileSync(resolve('drizzle/meta/0021_snapshot.json'), 'utf8'),
      );
      const actual = (
        await pool.query(`select c.relname as table,k.conname as name from pg_constraint k
        join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
        where k.contype='f' and n.nspname='public' order by c.relname,k.conname`)
      ).rows;
      const expected = Object.entries(snapshot.tables)
        .flatMap(([name, table]) =>
          Object.keys(
            (table as { foreignKeys: Record<string, unknown> }).foreignKeys,
          ).map((fk) => ({
            table: name.replace('public.', ''),
            name: fk.slice(0, 63),
          })),
        )
        .sort(
          (a, b) =>
            a.table.localeCompare(b.table) || a.name.localeCompare(b.name),
        );
      expect(
        [...actual].sort(
          (a, b) =>
            a.table.localeCompare(b.table) || a.name.localeCompare(b.name),
        ),
      ).toEqual(expected);
    });
  }, 120_000);

  it.each(['neither', 'users', 'whatsapp_auth_state', 'both'] as const)(
    'full-web populated; API independently present: %s, exact preservation and rerun',
    async (present) => {
      await withDatabase(server.adminUrl, async (pool, url) => {
        await baseline(pool, 'web');
        await pool.query(fixture());
        for (const table of ['users', 'whatsapp_auth_state'] as const) {
          if (present === table || present === 'both')
            await createApi(pool, table);
        }
        await apiRows(pool);
        const before = await capture(pool);
        expect(before.rows['public.financial_profiles']![0]).toContain(
          '2024-01-02T03:04:05.123456',
        );
        expect(before.rows['public.financial_goals']!.join('\n')).toContain(
          '12345678.91',
        );
        expect(
          Object.keys(before.rows).filter((name) => name.startsWith('public.'))
            .length,
        ).toBe(18 + (present === 'both' ? 2 : present === 'neither' ? 0 : 1));
        for (const rows of Object.values(before.rows))
          expect(rows.length).toBeGreaterThan(0);
        await success(pool, url, 22, before);
        if (present === 'neither') {
          const db = drizzle(pool);
          for (const [table, id, update] of [
            [
              savingsPlaces,
              '00000000-0000-0000-0000-000000000006',
              () =>
                db
                  .update(savingsPlaces)
                  .set({ name: 'Banco actualizado' })
                  .where(
                    eq(
                      savingsPlaces.id,
                      '00000000-0000-0000-0000-000000000006',
                    ),
                  ),
            ],
            [
              savingContributions,
              '00000000-0000-0000-0000-000000000009',
              () =>
                db
                  .update(savingContributions)
                  .set({ amount: '123.46' })
                  .where(
                    eq(
                      savingContributions.id,
                      '00000000-0000-0000-0000-000000000009',
                    ),
                  ),
            ],
            [
              investmentContributions,
              '00000000-0000-0000-0000-000000000011',
              () =>
                db
                  .update(investmentContributions)
                  .set({ amount: '456.79' })
                  .where(
                    eq(
                      investmentContributions.id,
                      '00000000-0000-0000-0000-000000000011',
                    ),
                  ),
            ],
          ] as const) {
            const old = await db
              .select({ id: table.id, updatedAt: table.updatedAt })
              .from(table)
              .where(eq(table.id, id));
            await pool.query('select pg_sleep(0.01)');
            await update();
            const current = await db
              .select({ updatedAt: table.updatedAt })
              .from(table)
              .where(eq(table.id, old[0]!.id));
            expect(current[0]!.updatedAt.getTime()).toBeGreaterThan(
              old[0]!.updatedAt.getTime(),
            );
          }
        }
      });
    },
    120_000,
  );

  it.each(['api-only', 'combined'] as const)(
    '%s populated preserves original API records',
    async (kind) => {
      await withDatabase(server.adminUrl, async (pool, url) => {
        await baseline(pool, 'api');
        await apiRows(pool);
        if (kind === 'combined') {
          await baseline(pool, 'web');
          await pool.query(fixture());
        }
        const before = await capture(pool);
        if (kind === 'api-only')
          expect(Object.keys(before.rows).sort()).toEqual([
            'public.users',
            'public.whatsapp_auth_state',
          ]);
        migrateCli(url);
        const after = await capture(pool);
        expect(
          Object.keys(after.rows).filter((name) => name.startsWith('public.')),
        ).toHaveLength(20);
        for (const [name, rows] of Object.entries(before.rows))
          expect(after.rows[name]).toEqual(rows);
        for (const relation of before.catalog)
          expect(after.catalog).toContainEqual(relation);
        expect(after.journal.slice(0, before.journal.length)).toEqual(
          before.journal,
        );
        expect(after.journal).toHaveLength(24);
        migrateCli(url);
        expect(await capture(pool)).toEqual(after);
      });
    },
    120_000,
  );

  const drifts = [
    [
      'view',
      (t: string) => `drop table ${t}; create view ${t} as select 1 as wrong`,
    ],
    [
      'materialized view',
      (t: string) =>
        `drop table ${t}; create materialized view ${t} as select 1 as wrong`,
    ],
    [
      'type',
      (t: string) =>
        `alter table ${t} alter column ${t === 'users' ? 'phone' : 'value'} type varchar using ${t === 'users' ? 'phone' : 'value'}::text`,
    ],
    [
      'nullability',
      (t: string) =>
        `alter table ${t} alter column ${t === 'users' ? 'phone' : 'value'} drop not null`,
    ],
    [
      'default',
      (t: string) =>
        `alter table ${t} alter column updated_at set default '2020-01-01'::timestamptz`,
    ],
    [
      'PK default',
      (t: string) =>
        `alter table ${t} alter column ${t === 'users' ? 'id' : 'key'} set default ${t === 'users' ? "'00000000-0000-0000-0000-000000000099'::uuid" : "'unexpected'::text"}`,
    ],
    [
      'missing column',
      (t: string) => `alter table ${t} drop column updated_at`,
    ],
    [
      'extra column',
      (t: string) => `alter table ${t} add column unexpected text`,
    ],
    [
      'generated column',
      (t: string) =>
        `alter table ${t} drop column ${t === 'users' ? 'name' : 'value'}; alter table ${t} add column ${t === 'users' ? "name text generated always as ('generated'::text) stored not null" : "value jsonb generated always as ('{}'::jsonb) stored not null"}`,
    ],
    ['missing PK', (t: string) => `alter table ${t} drop constraint ${t}_pkey`],
    [
      'wrong PK',
      (t: string) =>
        `alter table ${t} drop constraint ${t}_pkey; alter table ${t} add primary key (${t === 'users' ? 'phone' : 'value'})`,
    ],
    [
      'composite PK',
      (t: string) =>
        `alter table ${t} drop constraint ${t}_pkey; alter table ${t} add primary key (${t === 'users' ? 'id,phone' : 'key,value'})`,
    ],
    ['unique', (t: string) => `alter table ${t} add unique(updated_at)`],
    [
      'check',
      (t: string) => `alter table ${t} add check(updated_at >= created_at)`,
    ],
    [
      'FK',
      (t: string) =>
        `alter table ${t} add foreign key (${t === 'users' ? 'id' : 'key'}) references ${t}(${t === 'users' ? 'id' : 'key'})`,
    ],
    ['index', (t: string) => `create index unexpected on ${t}(updated_at)`],
    ['PK index', (t: string) => `alter index ${t}_pkey rename to unexpected`],
    [
      'PK index options',
      (t: string) => `alter index ${t}_pkey set (fillfactor=70)`,
    ],
    [
      'deferrable PK',
      (t: string) =>
        `alter table ${t} drop constraint ${t}_pkey; alter table ${t} add primary key (${t === 'users' ? 'id' : 'key'}) deferrable`,
    ],
    [
      'trigger',
      (t: string) =>
        `create function public.noop() returns trigger language plpgsql as $$begin return new; end$$; create trigger unexpected before update on ${t} for each row execute function public.noop()`,
    ],
    ['RLS', (t: string) => `alter table ${t} enable row level security`],
    ['policy', (t: string) => `create policy unexpected on ${t} using (true)`],
    ['persistence', (t: string) => `alter table ${t} set unlogged`],
    [
      'inheritance',
      (t: string) => `create table unexpected_child() inherits (${t})`,
    ],
    [
      'collation',
      (t: string) =>
        `alter table ${t} alter column ${t === 'users' ? 'phone' : 'key'} type text collate "C"`,
    ],
  ] as const;
  for (const table of ['users', 'whatsapp_auth_state'] as const) {
    it.each(drifts)(
      `${table}: rejects %s with table-specific diagnostic and unchanged capture`,
      async (_name, ddl) => {
        await withDatabase(server.adminUrl, async (pool, url) => {
          await baseline(pool, 'web');
          await pool.query(fixture());
          await createApi(pool, table);
          await apiRows(pool);
          await pool.query(ddl(table));
          const before = await capture(pool);
          expect(() => migrateCli(url)).toThrow(
            `API ownership: incompatible public.${table}`,
          );
          expect(await capture(pool)).toEqual(before);
        });
      },
      120_000,
    );
  }

  async function assertIncompatibleWhatsappState(pool: Pool, url: string) {
    await createApi(pool, 'whatsapp_auth_state');
    await apiRows(pool);
    await pool.query(
      'alter table whatsapp_auth_state alter column value drop not null',
    );
    const before = await capture(pool);
    expect(() => migrateCli(url)).toThrow(
      'API ownership: incompatible public.whatsapp_auth_state',
    );
    expect(await capture(pool)).toEqual(before);
  }

  it('late failure rolls back users creation; explicit disposable repair permits retry and exact rerun', async () => {
    await withDatabase(server.adminUrl, async (pool, url) => {
      await baseline(pool, 'web');
      await pool.query(fixture());
      await assertIncompatibleWhatsappState(pool, url);
      await pool.query(
        'alter table whatsapp_auth_state alter column value set not null',
      );
      await success(pool, url, 22, await capture(pool));
    });
  }, 120_000);

  it('no initial tracking: entire pending web batch rolls back, only empty tracking infrastructure may remain', async () => {
    await withDatabase(server.adminUrl, async (pool, url) => {
      await assertIncompatibleWhatsappState(pool, url);
    });
  }, 120_000);

  it.each([
    ['hole', '4: incomplete populated web'],
    ['duplicate', '3: duplicate'],
    ['changed hash', '3: unknown/hash'],
    ['newer cutoff', '3: unknown cutoff'],
    ['partial prefix with populated rows', '4: incomplete populated web'],
    ['populated tables without tracking', '4: incomplete populated web'],
  ])(
    'operator acceptance rejects %s; does not invoke raw CLI',
    async (kind, expectedError) => {
      await withDatabase(server.adminUrl, async (pool) => {
        const { web, recognized } = loadManifestRecords();
        expect(
          acceptance(
            web,
            { 'public.onboarding_drafts': ['populated'] },
            web,
            recognized,
          ),
        ).toEqual([]);
        const partial = kind === 'partial prefix with populated rows';
        await baseline(pool, 'web', partial ? 10 : 21);
        if (partial)
          await pool.query(
            "insert into onboarding_drafts(device_id) values ('partial-preserve')",
          );
        else await pool.query(fixture());
        const records = recordsFor[kind as OperatorAcceptanceKind](web);
        if (records.length) {
          await pool.query(
            'create schema drizzle; create table drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)',
          );
          for (const record of records)
            await pool.query(
              'insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)',
              [record.hash, record.created_at],
            );
        }
        const observed = await capture(pool);
        expect(
          acceptance(
            observed.journal as ManifestRecord[],
            observed.rows,
            web,
            recognized,
          ),
        ).toContain(expectedError);
        expect(await capture(pool)).toEqual(observed);
      });
    },
    120_000,
  );

  it('installed latest-timestamp algorithm model skips takeover at an unknown newer cutoff', () => {
    const pending = (latest: number, when: number) => latest < when;
    expect(pending(1792368000001, 1792368000000)).toBe(false);
    expect(pending(1792368000000, 1792368000000)).toBe(false);
    expect(pending(1788525485409, 1792368000000)).toBe(true);
  });
});
