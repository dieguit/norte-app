import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';

const owned = new Map<string, string>();
const databases = new Map<string, string>();
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
export function assertDatabaseName(name: string) {
  if (!/^norte_takeover_[a-f0-9]{32}$/.test(name))
    throw new Error('Unsafe test DB');
}

export async function startPostgres() {
  const container = `norte-takeover-${randomUUID()}`;
  const password = randomUUID();
  let adminUrl = '';
  const image = process.env.TAKEOVER_POSTGRES_IMAGE ?? 'postgres:17-alpine';
  if (!/^postgres:\d+-alpine$/.test(image))
    throw new Error('Unsafe test image');
  const stop = async () => {
    owned.delete(adminUrl);
    execFileSync('docker', ['stop', container], {
      stdio: 'pipe',
      timeout: 30_000,
    });
  };
  try {
    execFileSync(
      'docker',
      [
        'run',
        '--detach',
        '--rm',
        '--name',
        container,
        '--publish',
        '127.0.0.1::5432',
        '--env',
        `POSTGRES_PASSWORD=${password}`,
        image,
        'postgres',
        '-c',
        'log_line_prefix=%m [%p] %d ',
      ],
      { stdio: 'pipe', timeout: 90_000 },
    );
    const binding = execFileSync('docker', ['port', container, '5432/tcp'], {
      encoding: 'utf8',
      timeout: 10_000,
    }).trim();
    if (!/^127\.0\.0\.1:\d+$/.test(binding))
      throw new Error('Unexpected test binding');
    adminUrl = `postgres://postgres:${password}@${binding}/postgres`;
    const pool = new Pool({
      connectionString: adminUrl,
      connectionTimeoutMillis: 500,
    });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          await pool.query('select 1');
          ready = true;
          break;
        } catch {
          await new Promise((done) => setTimeout(done, 200));
        }
      }
      if (!ready) throw new Error('Owned PostgreSQL readiness timeout');
    } finally {
      await pool.end();
    }
    owned.set(adminUrl, container);
    return { adminUrl, stop };
  } catch {
    try {
      await stop();
    } catch {
      /* Container may not have started. */
    }
    throw new Error('Unable to start owned PostgreSQL 17');
  }
}

export async function withDatabase<T>(
  adminUrl: string,
  run: (pool: Pool, url: string) => Promise<T>,
): Promise<T> {
  if (!owned.has(adminUrl)) throw new Error('Not an owned PostgreSQL server');
  const name = `norte_takeover_${randomUUID().replaceAll('-', '')}`;
  assertDatabaseName(name);
  const admin = new Pool({ connectionString: adminUrl });
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  let pool: Pool | undefined;
  let created = false;
  try {
    await admin.query(`CREATE DATABASE ${quote(name)}`);
    created = true;
    pool = new Pool({ connectionString: url.href });
    const { rows } = await pool.query('select current_database() as name');
    if (rows[0]?.name !== name) throw new Error('Wrong isolated database');
    databases.set(url.href, owned.get(adminUrl)!);
    return await run(pool, url.href);
  } finally {
    databases.delete(url.href);
    await pool?.end();
    try {
      if (created) await admin.query(`DROP DATABASE ${quote(name)}`);
    } finally {
      await admin.end();
    }
  }
}

export function migrateCli(url: string): void {
  if (!databases.has(url)) throw new Error('Not an owned test database');
  const directory = mkdtempSync('/tmp/opencode/norte-cli-');
  const empty = join(directory, 'empty.env');
  writeFileSync(empty, '');
  const since = new Date().toISOString();
  try {
    execFileSync('pnpm', ['--filter', '@repo/api', 'db:migrate'], {
      cwd: resolve('../..'),
      env: {
        PATH: process.env.PATH ?? '',
        HOME: directory,
        NODE_ENV: 'test',
        DATABASE_URL: url,
        DOTENV_CONFIG_PATH: empty,
      },
      stdio: 'pipe',
      timeout: 60_000,
    });
  } catch (error) {
    const output = error as { stdout?: Buffer; stderr?: Buffer };
    // Kit 0.31.10's rejected progress renderer discards the PostgreSQL error.
    const logs = spawnSync(
      'docker',
      ['logs', '--since', since, databases.get(url)!],
      { encoding: 'utf8', stdio: 'pipe', timeout: 10_000 },
    );
    const databaseName = new URL(url).pathname.slice(1);
    const diagnostic = `${logs.stdout ?? ''}\n${logs.stderr ?? ''}`
      .split('\n')
      .filter((line) => line.includes(databaseName) && line.includes('ERROR:'))
      .join('\n');
    throw new Error(
      `${output.stdout ?? ''}\n${output.stderr ?? ''}\nOwned PostgreSQL diagnostic: ${diagnostic}`
        .replaceAll(url, '[owned database]')
        .replaceAll(new URL(url).password, '[redacted]'),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export async function baseline(
  pool: Pool,
  kind: 'web' | 'api',
  untrackedPrefix?: number,
) {
  const directory = mkdtempSync('/tmp/opencode/norte-baseline-');
  try {
    if (kind === 'api')
      cpSync(resolve('migration-history/pre-takeover'), directory, {
        recursive: true,
      });
    else {
      cpSync(resolve('drizzle'), directory, { recursive: true });
      writeFileSync(
        join(directory, 'meta/_journal.json'),
        readFileSync(resolve('migration-history/web-provenance/_journal.json')),
      );
    }
    if (untrackedPrefix !== undefined) {
      for (const migration of readMigrationFiles({
        migrationsFolder: directory,
      }).slice(0, untrackedPrefix)) {
        for (const statement of migration.sql) await pool.query(statement);
      }
    } else await migrate(drizzle(pool), { migrationsFolder: directory });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export async function createApi(
  pool: Pool,
  table: 'users' | 'whatsapp_auth_state',
) {
  const file =
    table === 'users'
      ? '0000_chemical_silhouette.sql'
      : '0001_nasty_black_cat.sql';
  await pool.query(
    readFileSync(resolve('migration-history/pre-takeover', file), 'utf8'),
  );
}

export async function capture(pool: Pool) {
  const relations = (
    await pool.query<{ schema: string; name: string }>(`
    select n.nspname as schema,c.relname as name from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
      and not (n.nspname='drizzle' and c.relname='__drizzle_migrations')
    order by n.nspname,c.relname`)
  ).rows;
  const rows: Record<string, string[]> = {};
  for (const relation of relations) {
    rows[`${relation.schema}.${relation.name}`] = (
      await pool.query<{ row: string }>(
        `select to_jsonb(t)::text as row from ${quote(relation.schema)}.${quote(relation.name)} t`,
      )
    ).rows
      .map((x) => x.row)
      .sort();
  }
  const catalog = (
    await pool.query(`
    select n.nspname as schema,c.relname as name,c.relkind,c.relpersistence,c.relrowsecurity,c.relforcerowsecurity,
      c.reloptions,c.relispartition,
      case when c.relkind in ('v','m') then pg_get_viewdef(c.oid) end as view_definition,
      (select jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,
        pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated,cn.nspname,co.collname) order by a.attnum)
       from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
       left join pg_collation co on co.oid=a.attcollation
       left join pg_namespace cn on cn.oid=co.collnamespace
       where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as columns,
      (select jsonb_agg(jsonb_build_array(k.conname,k.contype,pg_get_constraintdef(k.oid),k.convalidated,
        k.condeferrable,k.condeferred,k.confupdtype,k.confdeltype) order by k.conname)
       from pg_constraint k where k.conrelid=c.oid) as constraints,
      (select jsonb_agg(jsonb_build_array(ic.relname,pg_get_indexdef(i.indexrelid),i.indisvalid,i.indisready,
        i.indisunique,i.indisprimary) order by ic.relname)
       from pg_index i join pg_class ic on ic.oid=i.indexrelid where i.indrelid=c.oid) as indexes,
      (select jsonb_agg(jsonb_build_array(t.tgname,pg_get_triggerdef(t.oid),t.tgenabled,t.tgisinternal) order by t.tgname)
       from pg_trigger t where t.tgrelid=c.oid) as triggers,
      (select jsonb_agg(jsonb_build_array(p.polname,p.polcmd,p.polpermissive,
        pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid),
        (select array_agg(r.rolname order by r.rolname) from pg_roles r where r.oid=any(p.polroles))) order by p.polname)
       from pg_policy p where p.polrelid=c.oid) as policies,
      (select jsonb_agg(jsonb_build_array(pn.nspname,pc.relname) order by pn.nspname,pc.relname)
       from pg_inherits h join pg_class pc on pc.oid=h.inhparent join pg_namespace pn on pn.oid=pc.relnamespace
       where h.inhrelid=c.oid) as parents
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p','v','m','f') and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
      and not (n.nspname='drizzle' and c.relname='__drizzle_migrations')
    order by n.nspname,c.relname`)
  ).rows;
  const hasJournal = (
    await pool.query(
      "select to_regclass('drizzle.__drizzle_migrations') as relation",
    )
  ).rows[0]?.relation;
  const journal: unknown[] = hasJournal
    ? (
        await pool.query(
          'select id, hash, created_at::text from drizzle.__drizzle_migrations order by id',
        )
      ).rows
    : [];
  return { rows, catalog, journal };
}
