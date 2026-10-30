import { describe, expect, it } from 'vitest';
import {
  assertCommitAllowed,
  effectivePolicies,
  formatSourceReport,
  manualContentHash,
  parseVerifyArgs,
  selectSources,
  verdict,
} from './cli';
import { CATALOG } from './catalog';
import type { SourceResult } from './benefits.types';

const result: SourceResult = {
  sourceId: 'test',
  providerSlug: 'test',
  provenance: 'live',
  llm: true,
  outcome: 'ok',
  complete: true,
  truncated: false,
  coverage: 'full',
  http: { status: 200, mime: 'text/html', bytes: 42 },
  diagnostics: [],
  candidates: [],
  rejected: [],
  startedAt: new Date(),
  completedAt: new Date(),
};
describe('benefits CLI', () => {
  it('reports reachable instead of degraded for --no-llm runs', () => {
    expect(
      verdict({ ...result, outcome: 'ok', llm: false, candidates: [] }),
    ).toBe('reachable');
  });
  it('applies DB policy overrides over catalog defaults', () => {
    const rows = effectivePolicies(
      CATALOG,
      new Map([['galicia-promociones', { enabled: false }]]),
    );
    const galicia = rows.find((r) => r.source === 'galicia-promociones')!;
    expect(galicia.enabled).toBe(false);
    expect(galicia.autoPublish).toBe(false);
  });

  it('parses flags without consuming the provider and validates the clock', () => {
    expect(
      parseVerifyArgs(['--no-llm', 'galicia', '--now=2026-10-30']),
    ).toMatchObject({
      target: 'galicia',
      'no-llm': true,
      now: new Date('2026-10-30T15:00:00Z'),
    });
    expect(() => parseVerifyArgs(['--now=2026-02-30'])).toThrow();
    expect(() => parseVerifyArgs(['--typo'])).toThrow();
    expect(() => parseVerifyArgs(['a', 'b'])).toThrow();
  });
  it('selects sources and reports unknown targets', () => {
    const provider = CATALOG.find((p) => p.sources.length)!;
    expect(selectSources(CATALOG, provider.slug).providers).toEqual([provider]);
    expect(selectSources(CATALOG, provider.sources[0].id).sourceIds).toEqual([
      provider.sources[0].id,
    ]);
    expect(() => selectSources(CATALOG, 'unknown')).toThrow('Known:');
  });
  it('guards writes, including explicit override restrictions', () => {
    for (const host of ['localhost', '127.0.0.1', 'postgres'])
      expect(() =>
        assertCommitAllowed({ DATABASE_URL: `postgres://user@${host}/db` }),
      ).not.toThrow();
    expect(() =>
      assertCommitAllowed({ DATABASE_URL: 'postgres://remote.example/db' }),
    ).toThrow();
    expect(() =>
      assertCommitAllowed({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://localhost/db',
      }),
    ).toThrow();
    const override = {
      BENEFITS_ALLOW_COMMIT: '1',
      DATABASE_URL: 'postgres://remote.example/db',
    };
    expect(() => assertCommitAllowed(override)).not.toThrow();
    expect(() => assertCommitAllowed(override, true)).toThrow();
    expect(() => assertCommitAllowed(override, false, true)).toThrow();
    expect(() => assertCommitAllowed({})).toThrow();
  });
  it('suggests verdicts and formats diagnostics/counts', () => {
    expect(verdict(result)).toBe('degraded');
    expect(verdict({ ...result, outcome: 'failed' })).toBe('blocked');
    const candidate = {
      snapshot: {
        title: 'Sample',
        rules: {
          offer: { type: 'other' },
          eligibility: { type: 'all' },
          eligibilityCompleteness: 'complete',
        },
      },
    } as unknown as SourceResult['candidates'][number];
    expect(verdict({ ...result, candidates: [candidate] })).toBe('active');
    expect(
      verdict({ ...result, candidates: [candidate], truncated: true }),
    ).toBe('degraded');
    const report = formatSourceReport({
      ...result,
      candidates: [candidate],
      rejected: [{ reason: 'invalid rules', item: null }],
      diagnostics: ['test diagnostic'],
    });
    for (const text of [
      'HTTP 200',
      'text/html',
      '42 bytes',
      'coverage: full',
      'detected: 2',
      'invalid rules (1)',
      'test diagnostic',
      'Sample',
      'completeness: complete',
    ])
      expect(report).toContain(text);
  });
  it('hashes stable JSON independent of key ordering', () => {
    expect(manualContentHash({ b: 2, a: { d: 4, c: 3 } })).toBe(
      manualContentHash({ a: { c: 3, d: 4 }, b: 2 }),
    );
  });
});
