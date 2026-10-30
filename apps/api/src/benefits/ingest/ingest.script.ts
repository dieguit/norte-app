import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { schema } from '../../database/schema';
import { runIngest } from './runner';
import type { IngestOptions } from './runner';

export function parseIngestArgs(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      source: { type: 'string', default: 'all' },
      bank: { type: 'string', multiple: true },
      'max-details': { type: 'string', default: '200' },
      commit: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  });
  if (!['galicia', 'playdigital', 'all'].includes(values.source))
    throw new Error('Invalid --source');
  if (values.commit && values['dry-run'])
    throw new Error('Choose --commit or --dry-run');
  if (
    !/^\d+$/.test(values['max-details']) ||
    !Number.isSafeInteger(Number(values['max-details']))
  )
    throw new Error('Invalid --max-details');
  const bankSlugs = values.bank?.flatMap((bank) =>
    bank.split(',').map((slug) => slug.trim()),
  );
  if (bankSlugs?.some((slug) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)))
    throw new Error('Invalid --bank');
  return {
    source: values.source as IngestOptions['source'],
    bankSlugs,
    dryRun: !values.commit,
    maxDetails: Number(values['max-details']),
    json: values.json,
  };
}

export function assertIngestCommitAllowed(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === 'production')
    throw new Error('Production commits forbidden');
  const url = new URL(env.DATABASE_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('PostgreSQL DATABASE_URL required');
  if (
    !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) &&
    env.BENEFITS_ALLOW_COMMIT !== '1'
  )
    throw new Error('Remote commits require BENEFITS_ALLOW_COMMIT=1');
}

export function formatIngestReport(
  result: Awaited<ReturnType<typeof runIngest>>,
) {
  return [
    result.dryRun ? 'DRY RUN — no database writes' : 'COMMIT',
    ...result.runs.map(
      (run) =>
        `${run.source}/${run.bankSlug ?? '*'}: ${run.outcome}; raw=${run.rawRowCount} total=${run.totalReported ?? 'unknown'} observed=${run.observed} mapped=${run.mapped} unpublishable=${run.unpublishable} anomalies=${run.anomalies} complete=${run.complete}${run.source === 'playdigital' ? `; details missing: ${run.detailsMissing}` : ''}${run.complete ? '' : ' — WARNING: partial coverage, not a full catalog'}${run.error ? `; ${run.error}` : ''}`,
    ),
    ...result.errors.map((error) => `${error.source}: ${error.error}`),
  ].join('\n');
}

async function main() {
  const options = parseIngestArgs(process.argv.slice(2));
  if (!options.dryRun) assertIngestCommitAllowed(process.env);
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL required (dry-run reads cached details)');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await runIngest(drizzle(pool, { schema }), options);
    console.log(
      options.json
        ? JSON.stringify(result, null, 2)
        : formatIngestReport(result),
    );
    if (
      result.errors.length ||
      result.runs.some((run) => run.outcome === 'failed')
    )
      process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  void main().catch((error: unknown) => {
    console.error(String(error));
    process.exitCode = 1;
  });
}
