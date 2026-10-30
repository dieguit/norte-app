import type { Database } from '../../database/database.types';
import { galiciaAdapter } from './galicia';
import { playdigitalAdapter } from './playdigital';
import { commitRun, loadKnownDetails, saveDetail, upsertBanks } from './store';
import { ALLOWED_BANKS } from './tiers';
import type {
  Adapter,
  AdapterContext,
  AdapterRun,
  IngestSource,
} from './types';

export type IngestOptions = {
  source: IngestSource | 'all';
  bankSlugs?: string[];
  dryRun?: boolean;
  maxDetails?: number;
  now?: Date;
  fetchImpl?: typeof fetch;
};

function summarizeRun(run: AdapterRun) {
  return {
    source: run.source,
    bankSlug: run.bankSlug,
    outcome: run.outcome,
    complete: run.complete,
    rawRowCount: run.rawRowCount,
    totalReported: run.totalReported,
    observed: new Set(run.observedExternalIds).size,
    mapped: run.listings.length,
    unpublishable: run.listings.filter((listing) => !listing.terms).length,
    detailsMissing:
      run.source === 'playdigital'
        ? run.listings.filter((listing) => !listing.terms).length
        : 0,
    anomalies: run.anomalies.length,
    error: run.error,
  };
}

type IngestResult = {
  dryRun: boolean;
  runs: ReturnType<typeof summarizeRun>[];
  commits: Awaited<ReturnType<typeof commitRun>>[];
  errors: { source: IngestSource; error: string }[];
};

async function prepareContext(
  db: Database,
  source: IngestSource,
  options: IngestOptions,
): Promise<AdapterContext> {
  const ctx: AdapterContext = {
    now: options.now ?? new Date(),
    fetchImpl: options.fetchImpl ?? fetch,
    knownDetails: await loadKnownDetails(db, source),
    bankSlugs: options.bankSlugs,
    maxDetailFetches: options.maxDetails ?? 200,
  };
  if (options.dryRun === false)
    ctx.saveDetail = (id, detail) => saveDetail(db, source, id, detail);
  return ctx;
}

async function commitResult(
  db: Database,
  run: AdapterRun,
  now: Date,
  result: IngestResult,
) {
  if (result.dryRun) return;
  try {
    result.commits.push(await commitRun(db, run, now));
  } catch (error) {
    result.errors.push({ source: run.source, error: String(error) });
  }
}

function failedRun(
  source: IngestSource,
  now: Date,
  error: unknown,
): AdapterRun {
  return {
    source,
    bankSlug: source === 'galicia' ? 'galicia' : null,
    startedAt: now,
    completedAt: new Date(),
    outcome: 'failed',
    complete: false,
    rawRowCount: 0,
    totalReported: null,
    observedExternalIds: [],
    listings: [],
    anomalies: [],
    error: String(error),
  };
}

async function executeSource(
  db: Database,
  adapter: Adapter,
  options: IngestOptions & { now: Date },
  result: IngestResult,
) {
  const now = options.now;
  try {
    const ctx = await prepareContext(db, adapter.source, options);
    const banks = (
      adapter.listBanks
        ? await adapter.listBanks(ctx)
        : [{ slug: 'galicia', name: 'Galicia', playdigitalId: null }]
    ).filter(
      (bank) => !options.bankSlugs || options.bankSlugs.includes(bank.slug),
    );
    if (!result.dryRun) await upsertBanks(db, banks);
    for (const run of await adapter.run(ctx, banks)) {
      result.runs.push(summarizeRun(run));
      await commitResult(db, run, now, result);
    }
  } catch (error) {
    result.errors.push({ source: adapter.source, error: String(error) });
    const failed = failedRun(adapter.source, now, error);
    result.runs.push(summarizeRun(failed));
    if (failed.bankSlug) await commitResult(db, failed, now, result);
  }
}

function sourceSelected(adapter: Adapter, options: IngestOptions) {
  if (options.source !== 'all' && options.source !== adapter.source)
    return false;
  return (
    adapter.source !== 'galicia' ||
    !options.bankSlugs ||
    options.bankSlugs.includes('galicia')
  );
}

export async function runIngest(db: Database, options: IngestOptions) {
  if (options.bankSlugs?.some((slug) => !ALLOWED_BANKS.includes(slug)))
    throw new Error('Invalid bank');
  const maxDetails = options.maxDetails ?? 200;
  if (!Number.isSafeInteger(maxDetails) || maxDetails < 0)
    throw new Error('maxDetails must be a nonnegative integer');
  const resolved = {
    ...options,
    now: options.now ?? new Date(),
    dryRun: options.dryRun ?? true,
  };
  const result: IngestResult = {
    dryRun: resolved.dryRun,
    runs: [],
    commits: [],
    errors: [],
  };
  for (const adapter of [galiciaAdapter, playdigitalAdapter].filter((adapter) =>
    sourceSelected(adapter, resolved),
  )) {
    await executeSource(db, adapter, resolved, result);
  }
  return result;
}
