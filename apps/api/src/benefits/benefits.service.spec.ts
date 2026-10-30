import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BenefitRules } from '@repo/shared-types';
import { BenefitsService } from './benefits.service';
import { DAY_MS } from '../argentina-time';
import {
  loadMatchableBenefits,
  loadSourcePolicies,
  commitSourceRun,
  expireBenefits,
} from './store';
import { runHarvest } from './harvest';
import { CATALOG } from './catalog';
import type { SourceResult } from './benefits.types';

vi.mock('./store', () => ({
  loadMatchableBenefits: vi.fn(),
  loadSourcePolicies: vi.fn(),
  commitSourceRun: vi.fn(),
  expireBenefits: vi.fn(),
}));
vi.mock('./harvest', () => ({ runHarvest: vi.fn() }));
const NOW = new Date('2026-10-21T15:00:00Z');
const rules: BenefitRules = {
  eligibility: { membership: { instrumentSlug: 'modo' } },
  eligibilityCompleteness: 'complete',
  unresolved: [],
  offer: { type: 'discount', percentageBps: 2000 },
  currency: 'ARS',
  minimumSpendMinor: 0,
  capState: 'none',
  caps: [],
  validity: {
    from: '2026-10-01',
    to: '2026-10-31',
    weekdays: null,
    monthDays: null,
  },
  channels: { allowed: [], excluded: [] },
  requiredActions: [],
  stackable: 'unknown',
  recurrence: 'campaign',
};
const stored = (over = {}) => ({
  id: 'b',
  publisherProviderSlug: 'modo',
  identityKey: 'b',
  origin: 'harvest' as const,
  lifecycle: 'published' as const,
  category: 'cine' as const,
  snapshot: {
    title: 'Promo',
    merchant: 'Cine',
    rules,
    evidence: {
      sourceUrl: 'https://example.com',
      detailUrl: null,
      termsUrl: null,
      quotes: [],
      fetchedContentHash: 'hash',
    },
  },
  protectedFields: [],
  version: 1,
  lastVerifiedAt: NOW,
  ...over,
});

describe('BenefitsService', () => {
  const prefs = {
    instrumentSlugs: ['modo', 'old-slug'],
    categories: ['cine'],
    instrumentFacts: {},
    providerFacts: {},
    declaredAt: { modo: NOW.toISOString() },
  };
  const where = vi.fn();
  const upsert = vi.fn();
  const values = vi.fn(() => ({ onConflictDoUpdate: upsert }));
  const db = {
    select: () => ({ from: () => ({ where }) }),
    insert: () => ({ values }),
    transaction: vi.fn(),
  };
  const notifications = { listSettings: vi.fn(), updateSetting: vi.fn() };
  const service = new BenefitsService(db as never, notifications as never);
  beforeEach(() => {
    vi.clearAllMocks();
    where.mockResolvedValue([prefs]);
    notifications.listSettings.mockResolvedValue([]);
    db.transaction.mockImplementation(async (callback) => callback(db));
    vi.mocked(loadMatchableBenefits).mockResolvedValue([stored()]);
  });

  it('returns empty defaults without stored preferences or settings', async () => {
    where.mockResolvedValue([]);
    expect(await service.getPreferences('u')).toEqual({
      instrumentSlugs: [],
      categories: [],
      instrumentFacts: {},
      providerFacts: {},
      enabled: false,
    });
  });

  it('returns stored facts and the digest setting without leaking persistence fields', async () => {
    const facts = { macro: { salaryAccount: true } };
    where.mockResolvedValue([{ ...prefs, providerFacts: facts }]);
    notifications.listSettings.mockResolvedValue([
      { type: 'other', enabled: false },
      { type: 'savings_digest', enabled: true },
    ]);
    expect(await service.getPreferences('u')).toEqual({
      instrumentSlugs: prefs.instrumentSlugs,
      categories: prefs.categories,
      instrumentFacts: {},
      providerFacts: facts,
      enabled: true,
    });
  });

  it('evaluates published rules, ignoring historical unknown instrument slugs', async () => {
    const matches = await service.findMatching('u', NOW, {
      purchase: { amountMinor: 10000 },
    });
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      match: { eligibility: 'eligible', estimatedSavingMinor: 2000 },
      instrumentLabels: ['MODO'],
    });
    expect(loadMatchableBenefits).toHaveBeenCalledWith(db, ['cine']);
  });

  it('uses a 90-day exclusion for manual rows but 7 days for harvest', async () => {
    vi.mocked(loadMatchableBenefits).mockResolvedValue([
      stored({
        origin: 'manual',
        lastVerifiedAt: new Date(NOW.getTime() - 8 * DAY_MS),
      }),
    ]);
    expect(await service.findMatching('u', NOW)).toHaveLength(1);
    expect(await service.buildDigest('u', NOW)).toBeNull();
    vi.mocked(loadMatchableBenefits).mockResolvedValue([
      stored({ lastVerifiedAt: new Date(NOW.getTime() - 8 * DAY_MS) }),
    ]);
    expect(await service.findMatching('u', NOW)).toEqual([]);
  });

  it('only digests ongoing benefits in the first 24h after declaration', async () => {
    vi.mocked(loadMatchableBenefits).mockResolvedValue([
      stored({
        snapshot: {
          ...stored().snapshot,
          rules: { ...rules, recurrence: 'ongoing' },
        },
      }),
    ]);
    expect(await service.buildDigest('u', NOW)).toContain('20%');
    where.mockResolvedValue([
      {
        ...prefs,
        declaredAt: { modo: new Date(NOW.getTime() - DAY_MS).toISOString() },
      },
    ]);
    expect(await service.buildDigest('u', NOW)).toBeNull();
  });

  it('rejects unknown instruments and facts for unheld instruments or unknown providers', async () => {
    await expect(
      service.savePreferences('u', {
        instrumentSlugs: ['unknown'],
        categories: ['cine'],
      }),
    ).rejects.toThrow('unknown');
    await expect(
      service.savePreferences('u', {
        instrumentSlugs: ['modo'],
        categories: ['cine'],
        instrumentFacts: { 'galicia-visa-credito': {} },
      }),
    ).rejects.toThrow('declarados');
    await expect(
      service.savePreferences('u', {
        instrumentSlugs: ['modo'],
        categories: ['cine'],
        providerFacts: { unknown: {} },
      }),
    ).rejects.toThrow('catálogo');
    expect(values).not.toHaveBeenCalled();
  });

  it('preserves declaration timestamps, drops removed facts and opts in atomically', async () => {
    await service.savePreferences('u', {
      instrumentSlugs: ['modo', 'modo'],
      categories: ['cine'],
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        instrumentSlugs: ['modo'],
        declaredAt: { modo: NOW.toISOString() },
      }),
    );
    expect(notifications.updateSetting).toHaveBeenCalledWith(
      'u',
      'savings_digest',
      { enabled: true },
      db,
    );
  });

  it('WhatsApp updates do not opt in and preserve existing facts', async () => {
    where.mockResolvedValue([
      {
        ...prefs,
        instrumentSlugs: ['modo'],
        providerFacts: { macro: { plan: 'selecta' } },
      },
    ]);
    await service.updateProfile('u', {
      removeInstrumentSlugs: ['modo'],
      addInstrumentSlugs: ['uber-one'],
      providerFacts: { macro: { salaryAccount: true } },
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        instrumentSlugs: ['uber-one'],
        providerFacts: { macro: { plan: 'selecta', salaryAccount: true } },
      }),
    );
    expect(notifications.updateSetting).not.toHaveBeenCalled();
  });

  it('expires even when nothing was harvested', async () => {
    vi.mocked(loadSourcePolicies).mockResolvedValue(new Map());
    vi.mocked(runHarvest).mockResolvedValue([]);
    vi.mocked(expireBenefits).mockResolvedValue(3);
    expect(await service.harvestNightly(async () => ({}), NOW)).toEqual({
      results: [],
      summaries: [],
      expired: 3,
    });
    expect(commitSourceRun).not.toHaveBeenCalled();
  });

  it('skips fixture/no-LLM runs and records each source commit failure without skipping expiry', async () => {
    const source = CATALOG.flatMap((p) => p.sources)[0];
    const result: SourceResult = {
      sourceId: source.id,
      providerSlug: 'galicia',
      provenance: 'live',
      llm: true,
      outcome: 'ok',
      complete: true,
      truncated: false,
      coverage: source.coverage,
      http: null,
      diagnostics: [],
      candidates: [],
      rejected: [],
      startedAt: NOW,
      completedAt: NOW,
    };
    vi.mocked(loadSourcePolicies).mockResolvedValue(new Map());
    vi.mocked(runHarvest).mockResolvedValue([
      result,
      { ...result, provenance: 'fixture' },
      { ...result, llm: false },
    ]);
    vi.mocked(commitSourceRun).mockRejectedValue(new Error('write failed'));
    vi.mocked(expireBenefits).mockResolvedValue(2);
    expect(await service.harvestNightly(async () => ({}), NOW)).toMatchObject({
      summaries: [{ sourceId: source.id, error: 'write failed' }],
      expired: 2,
    });
    expect(commitSourceRun).toHaveBeenCalledTimes(1);
  });
});
