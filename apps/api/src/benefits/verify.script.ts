import 'dotenv/config';
import { resolve } from 'node:path';
import { userInfo } from 'node:os';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { todayInArgentina } from '../argentina-time';
import { schema } from '../database/schema';
import {
  createBenefitsExtractorAgent,
  extractWith,
} from '../mastra/agents/benefits-extractor-agent';
import { CATALOG } from './catalog';
import type { CommitSummary, SourceResult } from './benefits.types';
import {
  assertCommitAllowed,
  formatSourceReport,
  parseVerifyArgs,
  selectSources,
} from './cli';
import { runHarvest } from './harvest';
import { commitSourceRun, expireBenefits, loadSourcePolicies } from './store';

type VerifyArgs = ReturnType<typeof parseVerifyArgs>;
type Database = Parameters<typeof loadSourcePolicies>[0];

// fallow-ignore-next-line complexity -- CLI glue over tested runHarvest/store; CRAP is estimated (no unit coverage for process entry points)
async function harvest(args: VerifyArgs, db: Database | null) {
  const selection = selectSources(CATALOG, args.target);
  const policies = db ? await loadSourcePolicies(db) : new Map();
  const fixtureDir = resolve(__dirname, '../../test/fixtures/benefits');
  const results = await runHarvest({
    ...selection,
    includeDisabled: true,
    policies,
    now: args.now,
    extract: args['no-llm']
      ? null
      : extractWith(createBenefitsExtractorAgent(process.env)),
    fixtureDir: args.fixture ? fixtureDir : undefined,
    saveFixtureDir: args['save-fixture'] ? fixtureDir : undefined,
  });
  return results;
}

function printResults(args: VerifyArgs, results: SourceResult[]) {
  console.log(
    args.json
      ? JSON.stringify(results, null, 2)
      : results.map(formatSourceReport).join('\n\n'),
  );
}

// fallow-ignore-next-line complexity -- CLI glue over tested runHarvest/store; CRAP is estimated (no unit coverage for process entry points)
async function commitResults(
  args: VerifyArgs,
  db: Database,
  results: SourceResult[],
) {
  const summaries: CommitSummary[] = [];
  for (const result of results) {
    if (result.outcome !== 'ok' && result.outcome !== 'partial') continue;
    const source = CATALOG.flatMap((p) => p.sources).find(
      (s) => s.id === result.sourceId,
    )!;
    summaries.push(
      await commitSourceRun(db, result, source, {
        now: args.now,
        actor: process.env.BENEFITS_ACTOR || userInfo().username,
      }),
    );
  }
  const expired = await expireBenefits(db, todayInArgentina(args.now).today);
  const report = JSON.stringify({ commits: summaries, expired }, null, 2);
  if (args.json) console.error(report);
  else console.log(report);
}

// fallow-ignore-next-line complexity -- CLI glue over tested runHarvest/store; CRAP is estimated (no unit coverage for process entry points)
async function main() {
  const args = parseVerifyArgs(process.argv.slice(2));
  selectSources(CATALOG, args.target);
  if (args.commit)
    assertCommitAllowed(process.env, args.fixture, args['no-llm']);
  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;
  try {
    const db = pool ? drizzle(pool, { schema }) : null;
    const results = await harvest(args, db);
    printResults(args, results);
    if (args.commit && db) await commitResults(args, db, results);
    if (results.some((r) => r.outcome === 'failed' || r.outcome === 'blocked'))
      process.exitCode = 1;
  } finally {
    await pool?.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
