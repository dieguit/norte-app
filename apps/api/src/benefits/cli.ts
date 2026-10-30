import { hash, stable } from './harvest';
import { parseArgs } from 'node:util';
import { argentinaInstant } from '../argentina-time';
import type {
  SourcePolicy,
  SourceResult,
  StoredBenefit,
  StoredRevision,
} from './benefits.types';
import type { Provider } from './catalog';

export function parseVerifyArgs(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      'no-llm': { type: 'boolean' },
      'save-fixture': { type: 'boolean' },
      fixture: { type: 'boolean' },
      commit: { type: 'boolean' },
      now: { type: 'string' },
      json: { type: 'boolean' },
    },
  });
  if (positionals.length > 1)
    throw new Error('Expected at most one provider or source');
  let now = new Date();
  if (values.now) {
    now = argentinaInstant(values.now, '12:00');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(values.now) ||
      !Number.isFinite(now.getTime()) ||
      now.toISOString().slice(0, 10) !== values.now
    )
      throw new Error('Expected --now=YYYY-MM-DD (valid calendar date)');
  }
  return { ...values, target: positionals[0], now };
}

export function selectSources(catalog: Provider[], target?: string) {
  if (!target) return { providers: catalog };
  const provider = catalog.find((p) => p.slug === target);
  if (provider) return { providers: [provider] };
  const owner = catalog.find((p) => p.sources.some((s) => s.id === target));
  if (owner) return { providers: [owner], sourceIds: [target] };
  throw new Error(
    `Unknown provider/source ${target}. Known: ${catalog.flatMap((p) => [p.slug, ...p.sources.map((s) => s.id)]).join(', ')}`,
  );
}

export function assertCommitAllowed(
  env: NodeJS.ProcessEnv,
  fixture = false,
  noLlm = false,
) {
  if (fixture || noLlm)
    throw new Error('--commit requires live fixtures-free LLM extraction');
  if (!env.DATABASE_URL)
    throw new Error('DATABASE_URL is required for --commit');
  if (env.BENEFITS_ALLOW_COMMIT === '1') return;
  const host = new URL(env.DATABASE_URL).hostname;
  // Docker service names are single-label DNS names, never arbitrary remote domains.
  const local =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^[a-z][a-z0-9_-]*$/i.test(host);
  if (env.NODE_ENV === 'production' || !local)
    throw new Error(
      'Commit requires a non-production local/Docker database or BENEFITS_ALLOW_COMMIT=1',
    );
}

export function verdict(result: SourceResult) {
  if (result.outcome === 'blocked' || result.outcome === 'failed')
    return 'blocked';
  // Without extraction we only know the page is reachable, not whether it yields benefits.
  if (!result.llm) return result.outcome === 'ok' ? 'reachable' : 'degraded';
  return result.outcome === 'ok' &&
    result.complete &&
    !result.truncated &&
    result.candidates.length > 0
    ? 'active'
    : 'degraded';
}

export function formatSourceReport(result: SourceResult): string {
  const reasons = new Map<string, number>();
  for (const rejection of result.rejected)
    reasons.set(rejection.reason, (reasons.get(rejection.reason) ?? 0) + 1);
  return [
    `${result.sourceId}: ${result.outcome} → ${verdict(result)}`,
    `HTTP ${result.http?.status ?? 'n/a'} | ${result.http?.mime ?? 'n/a'} | ${result.http?.bytes ?? 0} bytes`,
    `${result.truncated ? 'truncated' : 'not truncated'} | ${result.complete ? 'complete' : 'incomplete'} | coverage: ${result.coverage}`,
    `detected: ${result.candidates.length + result.rejected.length} | valid: ${result.candidates.length} | rejected: ${result.rejected.length}`,
    `diagnostics: ${result.diagnostics.join('; ') || 'none'}`,
    `top rejection reasons: ${
      [...reasons]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, n]) => `${reason} (${n})`)
        .join('; ') || 'none'
    }`,
    ...result.candidates
      .slice(0, 3)
      .map(
        ({ snapshot }) =>
          `${snapshot.title}\n  offer: ${JSON.stringify(snapshot.rules.offer)}\n  eligibility: ${JSON.stringify(snapshot.rules.eligibility)}\n  completeness: ${snapshot.rules.eligibilityCompleteness}`,
      ),
  ].join('\n');
}

export const manualContentHash = hash;

export function revisionDiff(
  benefit: StoredBenefit,
  pending: StoredRevision | null,
): string[] {
  if (!pending) return [];
  const before = { category: benefit.category, ...benefit.snapshot };
  const after = { category: pending.category, ...pending.snapshot };
  return Object.keys(before)
    .filter(
      (key) =>
        stable(before[key as keyof typeof before]) !==
        stable(after[key as keyof typeof after]),
    )
    .map((key) =>
      key === 'rules'
        ? `rules: ${Object.keys(before.rules)
            .filter(
              (field) =>
                stable(before.rules[field as keyof typeof before.rules]) !==
                stable(after.rules[field as keyof typeof after.rules]),
            )
            .join(', ')}`
        : key,
    );
}

export const effectivePolicies = (
  catalog: Provider[],
  overrides: Map<string, SourcePolicy>,
) =>
  catalog.flatMap((p) =>
    p.sources.map((s) => ({
      source: s.id,
      enabled: overrides.get(s.id)?.enabled ?? s.enabled,
      autoPublish: overrides.get(s.id)?.autoPublish ?? s.autoPublish,
      status: s.status,
      coverage: s.coverage,
      note: s.note ?? '',
    })),
  );
