import { describe, expect, it, vi } from 'vitest';
vi.mock('./runner', () => ({ runIngest: vi.fn() }));
import {
  assertIngestCommitAllowed,
  formatIngestReport,
  parseIngestArgs,
} from './ingest.script';

describe('ingestion CLI', () => {
  it('defaults to dry-run and parses repeat/comma bank selection', () => {
    expect(parseIngestArgs([])).toMatchObject({
      dryRun: true,
      source: 'all',
      maxDetails: 200,
    });
    expect(
      parseIngestArgs(['--bank', 'macro,galicia', '--bank', 'bbva']).bankSlugs,
    ).toEqual(['macro', 'galicia', 'bbva']);
    for (const args of [
      ['--max-details', '-1'],
      ['--max-details', '1.5'],
      ['--source', 'other'],
      ['--commit', '--dry-run'],
    ])
      expect(() => parseIngestArgs(args)).toThrow();
  });
  it('never allows production and requires deliberate remote override', () => {
    const remote = { DATABASE_URL: 'postgres://user:pass@remote.example/db' };
    expect(() => assertIngestCommitAllowed(remote)).toThrow();
    expect(() =>
      assertIngestCommitAllowed({ ...remote, BENEFITS_ALLOW_COMMIT: '1' }),
    ).not.toThrow();
    expect(() =>
      assertIngestCommitAllowed({
        ...remote,
        BENEFITS_ALLOW_COMMIT: '1',
        NODE_ENV: 'production',
      }),
    ).toThrow();
    for (const host of ['localhost', '127.0.0.1', '[::1]'])
      expect(() =>
        assertIngestCommitAllowed({
          DATABASE_URL: `postgres://user:pass@${host}/db`,
        }),
      ).not.toThrow();
  });
  it('reports partial coverage without printing raw listings', () => {
    const report = formatIngestReport({
      dryRun: true,
      commits: [],
      errors: [],
      runs: [
        {
          source: 'playdigital',
          bankSlug: 'macro',
          outcome: 'partial',
          complete: false,
          rawRowCount: 20,
          totalReported: 100,
          observed: 19,
          mapped: 18,
          unpublishable: 5,
          detailsMissing: 5,
          anomalies: 2,
          error: null,
        },
      ],
    });
    expect(report).toContain(
      'raw=20 total=100 observed=19 mapped=18 unpublishable=5 anomalies=2 complete=false',
    );
    expect(report).toContain('WARNING: partial coverage');
    expect(report).toContain('details missing: 5');
  });
});
