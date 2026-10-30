import { describe, expect, it } from 'vitest';
import {
  absenceBlockReason,
  canonicalCategories,
  resolveCategories,
} from './store';
import type { AdapterRun } from './types';

describe('category lookup', () => {
  it('uses the same active canonical bank and mapping precedence for admin and ingest', () => {
    const rows: Parameters<typeof canonicalCategories>[0] = [
      {
        bankSlug: 'z',
        withdrawnAt: null,
        terms: {} as never,
        snapshot: { rawCategories: ['pd:2'] },
      },
      {
        bankSlug: 'a',
        withdrawnAt: null,
        terms: null,
        snapshot: { rawCategories: ['pd:1'] },
      },
      {
        bankSlug: 'b',
        withdrawnAt: null,
        terms: {} as never,
        snapshot: { rawCategories: ['pd:14', 'pd:14/31'] },
      },
    ];
    expect(
      canonicalCategories(
        rows,
        new Map([
          ['pd:14', 'otros'],
          ['pd:14/31', 'viajes'],
          ['pd:2', 'gastronomia'],
        ]),
      ),
    ).toEqual(['viajes']);
    expect(
      canonicalCategories(
        rows.map((row) => ({ ...row, terms: null })),
        new Map([['pd:1', 'salud-belleza']]),
      ),
    ).toEqual(['salud-belleza']);
    expect(canonicalCategories([], new Map())).toEqual(['otros']);
    expect(
      canonicalCategories(
        rows.map((row) => ({ ...row, withdrawnAt: new Date() })),
        new Map([['pd:14/31', 'viajes']]),
      ),
    ).toEqual(['viajes']);
  });
  it('prefers a mapped child to its parent and preserves independent categories', () => {
    expect(
      resolveCategories(
        ['pd:14', 'pd:14/31', 'pd:2'],
        new Map([
          ['pd:14', 'otros'],
          ['pd:14/31', 'viajes'],
          ['pd:2', 'gastronomia'],
        ]),
      ),
    ).toEqual(['viajes', 'gastronomia']);
    expect(resolveCategories(['new'], new Map())).toBeNull();
    expect(
      resolveCategories(['pd:14/99', 'pd:14'], new Map([['pd:14', 'otros']])),
    ).toEqual(['otros']);
  });
});
describe('absence guards', () => {
  const run: AdapterRun = {
    source: 'galicia',
    bankSlug: null,
    startedAt: new Date(),
    completedAt: new Date(),
    outcome: 'ok',
    complete: true,
    totalReported: 1,
    rawRowCount: 1,
    observedExternalIds: ['a'],
    listings: [],
    anomalies: [],
    error: null,
  };
  it('accepts exactly half and unknown totals', () => {
    expect(absenceBlockReason(run, 2)).toBeNull();
    expect(
      absenceBlockReason({ ...run, totalReported: null }, null),
    ).toBeNull();
  });
  it.each([
    [{ outcome: 'partial' }, 'outcome_not_ok'],
    [{ outcome: 'failed' }, 'outcome_not_ok'],
    [{ complete: false }, 'incomplete'],
    [{ rawRowCount: 0 }, 'count_mismatch'],
  ] as const)('blocks unsafe runs %j', (change, reason) =>
    expect(absenceBlockReason({ ...run, ...change }, null)).toBe(reason),
  );
  it('blocks low counts using distinct observed ids', () =>
    expect(
      absenceBlockReason({ ...run, observedExternalIds: ['a', 'a'] }, 3),
    ).toBe('low_count'));
});
