import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};
type Manifest = {
  web: { files: Record<string, string>; entries: JournalEntry[] };
  api: { files: Record<string, string>; entries: JournalEntry[] };
};

const hash = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
const tables = [
  'allocation_plan_entries',
  'allocation_plan_snapshots',
  'expense_sources',
  'expenses',
  'financial_goals',
  'financial_profiles',
  'goal_completion_withdrawals',
  'goal_investment_positions',
  'goal_savings_positions',
  'income_sources',
  'incomes',
  'investment_contribution_allocations',
  'investment_contributions',
  'onboarding_drafts',
  'saving_contribution_allocations',
  'saving_contributions',
  'savings_place_transfers',
  'savings_places',
  'users',
  'whatsapp_auth_state',
].sort();

function filesUnder(directory: string, root = directory): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? filesUnder(path, root)
        : [relative(root, path)];
    })
    .sort();
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.ts$/.test(path) && !/\.(spec|e2e-spec)\.ts$/.test(path)
        ? [path]
        : [];
  });
}

describe('operator rollout ownership', () => {
  const apiCommand = 'pnpm --filter @repo/api db:migrate';
  const read = (path: string) => readFileSync(resolve(path), 'utf8');
  const docs = () => ({
    rollout: read('../../docs/database-ownership-rollout.md'),
    api: read('README.md'),
    e2e: read('../e2e/README.md'),
  });

  it('documents only the API migration command and never the retired web one', () => {
    const { rollout, api, e2e } = docs();
    for (const [name, text] of Object.entries({ rollout, api, e2e })) {
      expect(text, name).toContain(apiCommand);
      expect(text, name).not.toMatch(
        /@repo\/web (?:run )?db:|pnpm (?:--filter web|-C apps\/web) /,
      );
      expect(text, name).not.toMatch(
        /web[^\n]*(?:owns|runs|executes)[^\n]*migrat/i,
      );
    }
    expect(rollout).toContain('1792368000000');
    expect(rollout).toMatch(/ignores stored hashes/i);
    expect(rollout).toMatch(/latest (?:tracking )?timestamp/i);
    const invocations = [
      ...rollout.matchAll(/^.*pnpm --filter @repo\/api db:migrate.*$/gm),
    ].map((match) => match[0]);
    const rehearsal = invocations.filter((line) =>
      line.includes('DATABASE_URL="$REHEARSAL_URL"'),
    );
    expect(invocations).toHaveLength(2);
    expect(rehearsal).toHaveLength(1);
    const targetLine = invocations.find((line) => !rehearsal.includes(line))!;
    const target = rollout.indexOf(targetLine);
    expect(targetLine).not.toContain('REHEARSAL');
    expect(rollout.indexOf(rehearsal[0])).toBeLessThan(target);
    expect(
      rollout.slice(rollout.indexOf('8. **Execute once.**'), target),
    ).toContain('only target invocation');
  });

  it('documents isolated restore, CLI rehearsal and environment prechecks', () => {
    const { rollout } = docs();
    for (const required of [
      'pg_restore --no-owner --no-acl',
      '"$REHEARSAL_URL"',
      ': "${DATABASE_URL:?',
      'test ! -e apps/api/.env',
      'dotenv/config',
      'show server_version_num',
      '150000',
      '189999',
    ]) {
      expect(rollout, required).toContain(required);
    }
  });

  it('has numbered checklist steps and every preflight tool command', () => {
    const { rollout } = docs();
    expect(
      [...rollout.matchAll(/^(\d+)\. /gm)].map((match) => Number(match[1])),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const required of [
      'pg_dump "$DATABASE_URL" -Fc',
      'pg_restore --list',
      'drizzle.__drizzle_migrations',
      '--schema-only',
      'to_jsonb',
      'restore rehearsal',
    ])
      expect(rollout).toContain(required);
    for (const fk of [
      'savings_places_user_id_fk',
      'savings_place_transfers_user_id_fk',
      'savings_place_transfers_from_place_id_fk',
      'savings_place_transfers_to_place_id_fk',
      'saving_contributions_place_id_fk',
      'goal_completion_withdrawals_goal_id_fk',
      'goal_completion_withdrawals_place_id_fk',
    ])
      expect(rollout).toContain(fk);
  });

  it('has a rejection row for every unsupported history case tested by the matrix', () => {
    const { rollout } = docs();
    const rows = rollout
      .split('\n')
      .filter((line) => /^\|.*\|\s*Reject/i.test(line));
    for (const kind of [
      'hole',
      'duplicate',
      'hash mismatch',
      'unknown or newer timestamp',
      'populated partial web history',
      'populated tables without tracking',
      'incompatible users',
      'incompatible whatsapp_auth_state',
    ]) {
      expect(
        rows.some((row) => row.toLowerCase().includes(kind.toLowerCase())),
        kind,
      ).toBe(true);
    }
    for (const accepted of [
      'fresh',
      'full web',
      'API-only',
      'combined',
      'compatible API tables',
      'rerun',
    ]) {
      expect(
        rollout
          .split('\n')
          .some(
            (line) =>
              /^\|/.test(line) &&
              !/Reject/i.test(line) &&
              line.toLowerCase().includes(accepted.toLowerCase()),
          ),
        accepted,
      ).toBe(true);
    }
  });

  it('never runs migrations from API bootstrap, runtime source or start scripts', () => {
    const pkg = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
    };
    for (const script of [
      'build',
      'start',
      'dev',
      'start:dev',
      'start:debug',
      'start:prod',
    ]) {
      expect(pkg.scripts[script], script).not.toMatch(/migrat/i);
    }
    for (const file of sourceFiles(resolve('src'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /migrate\s*\(|\/migrator|drizzle-kit|db:migrate/,
      );
    }
    expect(read('README.md')).not.toMatch(
      /start(?::\w+)?\s*(?:&&|;)[^\n]*db:migrate/,
    );
  });
});

describe('migration history adoption', () => {
  it('preserves the archived API history and transfers web history byte-for-byte', () => {
    const manifest = JSON.parse(
      readFileSync(resolve('migration-history/manifest.json'), 'utf8'),
    ) as Manifest;
    const archived = resolve('migration-history/pre-takeover');
    for (const [path, expected] of Object.entries(manifest.api.files)) {
      expect(hash(readFileSync(join(archived, path)))).toBe(expected);
    }
    expect(filesUnder(archived)).toEqual(
      Object.keys(manifest.api.files).sort(),
    );

    const provenance = readFileSync(
      resolve('migration-history/web-provenance/_journal.json'),
    );
    expect(hash(provenance)).toBe(manifest.web.files['meta/_journal.json']);
    for (const [path, expected] of Object.entries(manifest.web.files)) {
      if (path === 'meta/_journal.json') continue;
      const activeFile = readFileSync(resolve('drizzle', path));
      expect(hash(activeFile)).toBe(expected);
    }
    const active = JSON.parse(
      readFileSync(resolve('drizzle/meta/_journal.json'), 'utf8'),
    ) as { entries: JournalEntry[] };
    expect(active.entries.slice(0, 21)).toEqual(manifest.web.entries);
    expect(active.entries).toHaveLength(22);
    expect(active.entries[21]).toEqual({
      idx: 21,
      version: '7',
      when: 1792368000000,
      tag: '0021_api_database_ownership',
      breakpoints: true,
    });
    expect(active.entries[21].when).toBeGreaterThan(
      Math.max(
        ...[...manifest.web.entries, ...manifest.api.entries].map(
          (entry) => entry.when,
        ),
      ),
    );
    expect(existsSync(resolve('drizzle/meta/0017_snapshot.json'))).toBe(false);
    expect(existsSync(resolve('drizzle/meta/0018_snapshot.json'))).toBe(false);
  });

  type SnapshotTable = {
    name: string;
    foreignKeys: Record<string, { name: string }>;
    [key: string]: unknown;
  };
  type Snapshot = {
    id: string;
    prevId: string;
    tables: Record<string, SnapshotTable>;
  };

  it('links the complete new snapshot and has no generation churn on two isolated runs', () => {
    const snapshot = JSON.parse(
      readFileSync(resolve('drizzle/meta/0021_snapshot.json'), 'utf8'),
    ) as Snapshot;
    expect(snapshot.prevId).toBe('ed6ec25a-e6ae-486f-948a-a065274f50fc');
    expect(snapshot.id).not.toBe(snapshot.prevId);
    expect(
      Object.keys(snapshot.tables)
        .map((name) => name.replace(/^public\./, ''))
        .sort(),
    ).toEqual(tables);
    const old = JSON.parse(
      readFileSync(resolve('drizzle/meta/0020_snapshot.json'), 'utf8'),
    ) as Snapshot;
    for (const [name, table] of Object.entries(old.tables)) {
      const { foreignKeys: _historicalNames, ...semantics } = table;
      const { foreignKeys: _canonicalNames, ...actual } = snapshot.tables[name];
      expect(actual, name).toEqual(semantics);
      const fkSemantics = (keys: Record<string, { name: string }>) =>
        Object.values(keys)
          .map(({ name, ...fk }) => {
            void name;
            return JSON.stringify(fk);
          })
          .sort();
      expect(fkSemantics(_canonicalNames), name).toEqual(
        fkSemantics(_historicalNames),
      );
    }
    for (const [table, names] of [
      ['savings_places', ['savings_places_user_id_fk']],
      [
        'savings_place_transfers',
        [
          'savings_place_transfers_user_id_fk',
          'savings_place_transfers_from_place_id_fk',
          'savings_place_transfers_to_place_id_fk',
        ],
      ],
      ['saving_contributions', ['saving_contributions_place_id_fk']],
      [
        'goal_completion_withdrawals',
        [
          'goal_completion_withdrawals_goal_id_fk',
          'goal_completion_withdrawals_place_id_fk',
        ],
      ],
    ] as const) {
      for (const name of names)
        expect(snapshot.tables[`public.${table}`].foreignKeys[name]?.name).toBe(
          name,
        );
    }
    const directory = mkdtempSync('/tmp/opencode/norte-no-churn-');
    try {
      const output = join(directory, 'drizzle');
      cpSync(resolve('drizzle'), output, { recursive: true });
      const config = join(directory, 'drizzle.config.ts');
      const empty = join(directory, 'empty.env');
      writeFileSync(empty, '');
      writeFileSync(
        join(directory, '.env'),
        'NORTE_KIT_DOTENV_SENTINEL=must-not-load\n',
      );
      writeFileSync(
        config,
        `if (process.env.NORTE_KIT_DOTENV_SENTINEL || process.env.DATABASE_URL) throw new Error('Unexpected dotenv/database environment');\nexport default ${JSON.stringify(
          {
            dialect: 'postgresql',
            schema: resolve('src/database/schema.ts'),
            out: './drizzle',
          },
        )}`,
      );
      const hashes = () =>
        Object.fromEntries(
          filesUnder(output).map((path) => [
            path,
            hash(readFileSync(join(output, path))),
          ]),
        );
      const before = hashes();
      for (let run = 0; run < 2; run++) {
        const result = execFileSync(
          resolve('node_modules/.bin/drizzle-kit'),
          ['generate', '--config', config],
          {
            cwd: directory,
            env: {
              PATH: process.env.PATH ?? '',
              HOME: directory,
              DOTENV_CONFIG_PATH: empty,
            },
            encoding: 'utf8',
          },
        );
        expect(result).toContain('No schema changes');
        expect(hashes()).toEqual(before);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 60_000);

  it('discovers exactly the canonical tables in scratch output without database credentials', () => {
    const directory = mkdtempSync('/tmp/opencode/norte-schema-');
    try {
      const output = join(directory, 'drizzle');
      const config = join(directory, 'drizzle.config.ts');
      const sentinel = 'NORTE_KIT_DOTENV_SENTINEL';
      writeFileSync(
        join(directory, '.env'),
        `${sentinel}=loaded-from-scratch\n`,
      );
      const dotenvOverride = join(directory, 'empty.env');
      writeFileSync(dotenvOverride, '');
      writeFileSync(
        config,
        `if (process.env.${sentinel} || process.env.DATABASE_URL) throw new Error('Unexpected dotenv/database environment');\nexport default ${JSON.stringify(
          {
            dialect: 'postgresql',
            schema: resolve('src/database/schema.ts'),
            out: output,
          },
        )}`,
      );
      const env = {
        PATH: process.env.PATH ?? '',
        HOME: directory,
        DOTENV_CONFIG_PATH: dotenvOverride,
      };
      execFileSync(
        resolve('node_modules/.bin/drizzle-kit'),
        ['generate', '--config', config],
        {
          cwd: directory,
          env,
          stdio: 'pipe',
        },
      );
      const snapshotPath = join(output, 'meta', '0000_snapshot.json');
      const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as {
        tables: Record<string, unknown>;
      };
      expect(
        Object.keys(snapshot.tables)
          .map((name) => name.replace(/^public\./, ''))
          .sort(),
      ).toEqual(tables);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
