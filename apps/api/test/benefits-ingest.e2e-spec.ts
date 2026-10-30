import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { schema } from '../src/database/schema';
import { CampaignTermsSchema, type CampaignTerms } from '@repo/shared-types';
import { evaluateEligibility } from '../src/benefits/rules/eligibility';
import {
  benefitCampaigns as campaigns,
  benefitCampaignBanks as presence,
  benefitIngestRuns as runs,
  benefitBrands as brands,
} from '../src/benefits/ingest/schema';
import {
  commitRun,
  listPublishableCampaigns,
  loadKnownDetails,
  saveDetail,
  setCampaignHidden,
  setCategoryMapping,
  upsertBanks,
} from '../src/benefits/ingest/store';
import type {
  AdapterRun,
  NormalizedListing,
} from '../src/benefits/ingest/types';

const url = process.env.DATABASE_URL;
if (url && new URL(url).pathname !== '/norte_test')
  throw new Error('Only norte_test permitted');
describe.skipIf(!url)('v3 ingest persistence', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const start = new Date('2026-10-01T06:00:00Z');
  const date = (day: number) => new Date(start.getTime() + day * 86_400_000);
  const listing = (externalId = randomUUID()): NormalizedListing => ({
    source: 'playdigital',
    externalId,
    bankSlugs: ['macro'],
    title: 'Café',
    brandName: 'Café',
    sourceBrandId: '42',
    rawCategories: ['pd:2'],
    tiers: null,
    rawTierSignal: null,
    terms: {
      offers: [{ kind: 'percent', percentageBps: 1000, mode: 'discount' }],
      eligibility: { membership: { instrumentSlug: 'modo' } },
      eligibilityCompleteness: 'complete',
      unresolved: [],
      capState: 'unknown',
      caps: [],
      minimumSpendMinor: null,
      validity: { from: null, to: '2026-10-31', weekdays: null },
      channels: [],
      where: null,
      legalText: null,
      warnings: [],
    },
    unpublishableReason: null,
    verify: { url: 'https://www.modo.com.ar/promos/cafe', hint: null },
    listingHash: 'hash',
    raw: { listing: {}, detail: { value: 1 } },
    detailFetchedAt: start,
    detailStale: false,
  });
  const run = (
    listings: NormalizedListing[],
    day = 0,
    bankSlug = 'macro',
    change: Partial<AdapterRun> = {},
  ): AdapterRun => ({
    source: 'playdigital',
    bankSlug,
    startedAt: date(day),
    completedAt: date(day),
    outcome: 'ok',
    complete: true,
    totalReported: listings.length,
    rawRowCount: listings.length,
    observedExternalIds: listings.map((l) => l.externalId),
    listings,
    anomalies: [],
    error: null,
    ...change,
  });
  const commit = (r: AdapterRun) => commitRun(db, r, r.completedAt);
  beforeEach(async () => {
    await db.execute(
      sql`truncate benefit_campaign_banks, benefit_campaigns, benefit_ingest_runs, benefit_brands, benefit_detail_cache cascade`,
    );
    await upsertBanks(db, [
      { slug: 'macro', name: 'Macro', playdigitalId: null },
      { slug: 'galicia', name: 'Galicia', playdigitalId: null },
    ]);
  });
  afterAll(() => pool.end());

  it('creates, updates, matches source brand ids first and caches detail incrementally', async () => {
    const a = listing();
    expect(await commit(run([a]))).toMatchObject({ created: 1, upserted: 1 });
    expect(
      await commit(
        run([{ ...a, title: 'Updated', brandName: 'Different spelling' }], 1),
      ),
    ).toMatchObject({ created: 0, upserted: 1 });
    expect(await db.select().from(brands)).toHaveLength(1);
    await saveDetail(db, 'playdigital', a.externalId, {
      listingHash: 'new',
      fetchedAt: date(2),
      detail: { value: 2 },
    });
    expect(
      (await loadKnownDetails(db, 'playdigital')).get(a.externalId)?.detail,
    ).toEqual({ value: 2 });
    await saveDetail(db, 'playdigital', 'absent', {
      listingHash: 'x',
      fetchedAt: start,
      detail: {},
    });
    expect(await db.select().from(campaigns)).toHaveLength(1);
    expect((await loadKnownDetails(db, 'playdigital')).get('absent')).toEqual({
      listingHash: 'x',
      fetchedAt: start,
      detail: {},
    });
  });

  it('persists first-load detail before any campaign/run exists and ignores older writes', async () => {
    const id = randomUUID();
    await saveDetail(db, 'playdigital', id, {
      listingHash: 'new',
      fetchedAt: date(2),
      detail: { complete: true },
    });
    await saveDetail(db, 'playdigital', id, {
      listingHash: 'old',
      fetchedAt: date(1),
      detail: { complete: false },
    });
    expect(await db.select().from(campaigns)).toHaveLength(0);
    expect(await db.select().from(runs)).toHaveLength(0);
    const reconnected = drizzle(pool, { schema });
    expect(
      (await loadKnownDetails(reconnected, 'playdigital')).get(id),
    ).toEqual({
      listingHash: 'new',
      fetchedAt: date(2),
      detail: { complete: true },
    });
  });

  const bankListing = (
    base: NormalizedListing,
    bank: string,
    tier: string,
  ): NormalizedListing => ({
    ...base,
    bankSlugs: [bank],
    tiers: { bankSlug: bank, codes: [tier] },
    terms: {
      ...base.terms!,
      eligibility: {
        allOf: [
          { card: { issuerProviderSlugs: [bank] } },
          { providerFact: { providerSlug: bank, key: 'tier', values: [tier] } },
        ],
      },
    },
  });
  const qualifies = (
    terms: CampaignTerms,
    bank: string,
    macroTier: string,
    galiciaTier: string,
  ) =>
    evaluateEligibility(
      terms.eligibility,
      {
        instruments: [
          {
            slug: `${bank}-card`,
            providerSlug: bank,
            type: 'credit',
            label: bank,
            evidenceUrl: 'https://example.test',
          },
        ],
        instrumentFacts: {},
        providerFacts: {
          macro: { tier: macroTier },
          galicia: { tier: galiciaTier },
        },
      },
      '2026-10-01',
    ).result;

  it('retains bank-bound tier branches through withdrawal and reappearance', async () => {
    const a = listing(),
      keeper = listing();
    const macro = bankListing(a, 'macro', 'selecta-1');
    const galicia = bankListing(a, 'galicia', 'eminent');
    await commit(run([macro, keeper]));
    await commit(run([galicia, keeper], 0, 'galicia'));
    const current = async () =>
      (
        await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.externalId, a.externalId))
      )[0].terms!;
    const terms = await current();
    expect(CampaignTermsSchema.safeParse(terms).success).toBe(true);
    expect(qualifies(terms, 'macro', 'selecta-1', 'masivo')).toBe('yes');
    expect(qualifies(terms, 'galicia', 'platinum', 'eminent')).toBe('yes');
    expect(qualifies(terms, 'macro', 'platinum', 'eminent')).toBe('no');
    expect(qualifies(terms, 'galicia', 'selecta-1', 'masivo')).toBe('no');
    await commit(run([keeper], 1));
    await commit(run([keeper], 2));
    expect(qualifies(await current(), 'macro', 'selecta-1', 'masivo')).toBe(
      'no',
    );
    expect(qualifies(await current(), 'galicia', 'platinum', 'eminent')).toBe(
      'yes',
    );
    await commit(run([macro, keeper], 3));
    expect(qualifies(await current(), 'macro', 'selecta-1', 'masivo')).toBe(
      'yes',
    );
    expect(qualifies(await current(), 'galicia', 'platinum', 'eminent')).toBe(
      'yes',
    );
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.externalId, a.externalId));
    const [p] = await db
      .select()
      .from(presence)
      .where(
        and(
          eq(presence.bankSlug, 'macro'),
          eq(presence.campaignId, campaign.id),
        ),
      );
    expect(p.terms).toEqual(macro.terms);
    expect(p.tiers).toEqual(macro.tiers);
  });

  it.each([
    ['macro', 'galicia'],
    ['galicia', 'macro'],
  ])(
    'chooses the same shared snapshot regardless of arrival order %s/%s',
    async (first, second) => {
      const a = listing();
      const macro = bankListing(
        { ...a, title: 'Macro snapshot' },
        'macro',
        'selecta-1',
      );
      const galicia = bankListing(
        {
          ...a,
          title: 'Galicia snapshot',
          terms: {
            ...a.terms!,
            offers: [
              { kind: 'percent', percentageBps: 2000, mode: 'discount' },
            ],
          },
        },
        'galicia',
        'eminent',
      );
      const snapshots: Record<string, NormalizedListing> = { macro, galicia };
      await commit(run([snapshots[first]], 0, first));
      const result = await commit(run([snapshots[second]], 0, second));
      const [row] = await db.select().from(campaigns);
      expect(row.title).toBe('Galicia snapshot');
      expect(row.terms?.offers).toEqual(galicia.terms?.offers);
      expect(qualifies(row.terms!, 'macro', 'selecta-1', 'masivo')).toBe('no');
      const [record] = await db
        .select()
        .from(runs)
        .where(eq(runs.id, result.runId));
      expect(record.anomalies).toContainEqual(
        expect.objectContaining({
          kind: 'conflicting_terms',
          externalId: a.externalId,
        }),
      );
    },
  );

  it('retains bank data but rejects merged eligibility exceeding the existing schema limit', async () => {
    const a = listing();
    let result;
    for (let i = 0; i < 18; i++) {
      const bank = `test-bank-${i}`;
      result = await commit(run([bankListing(a, bank, 'base')], 0, bank));
    }
    const [row] = await db.select().from(campaigns);
    expect(row.terms).toBeNull();
    expect(row.unpublishableReason).toBe('invalid_combined_terms');
    expect(await db.select().from(presence)).toHaveLength(18);
    const [record] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, result!.runId));
    expect(record.anomalies).toContainEqual(
      expect.objectContaining({ kind: 'invalid_combined_terms' }),
    );
  });

  it('remaps a campaign with an admin override and prefers its specific category key', async () => {
    const a = listing();
    const parent = `pd:test-${randomUUID()}`;
    const child = `${parent}/31`;
    const mapped = { ...a, rawCategories: [child, parent] };
    try {
      await setCategoryMapping(db, parent, 'hogar', 'test-admin');
      await commit(run([mapped]));
      const current = async () =>
        (
          await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.externalId, a.externalId))
        )[0];
      expect((await current()).categories).toEqual(['hogar']);
      await setCategoryMapping(db, child, 'viajes', 'test-admin');
      expect((await commit(run([mapped], 1))).created).toBe(0);
      expect((await current()).categories).toEqual(['viajes']);
      await setCategoryMapping(db, child, 'entretenimiento', 'another-admin');
      await commit(run([mapped], 2));
      expect((await current()).categories).toEqual(['entretenimiento']);
      const [mapping] = await db
        .select()
        .from(schema.benefitCategoryMappings)
        .where(eq(schema.benefitCategoryMappings.sourceKey, child));
      expect(mapping.updatedBy).toBe('another-admin');
    } finally {
      await db
        .delete(schema.benefitCategoryMappings)
        .where(
          sql`${schema.benefitCategoryMappings.sourceKey} in (${parent}, ${child})`,
        );
    }
  });

  it('records unmapped categories and rejects invalid terms', async () => {
    const a = listing();
    const result = await commit(
      run([
        {
          ...a,
          rawCategories: ['unknown'],
          terms: { ...a.terms!, offers: [] },
        },
      ]),
    );
    expect(result).toMatchObject({ unmappedCategories: 1, unpublishable: 1 });
    const [row] = await db.select().from(campaigns);
    expect(row.categories).toEqual(['otros']);
    expect(row.terms).toBeNull();
    expect(row.unpublishableReason).toBeTruthy();
    const [record] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, result.runId));
    expect(record.anomalies).toContainEqual(
      expect.objectContaining({ kind: 'unmapped_category' }),
    );
  });

  it('withdraws per bank only after two misses 24h apart; observed unmapped ids restore presence', async () => {
    const a = listing(),
      keeper = listing();
    await commit(run([a, keeper]));
    await commit(run([a, keeper], 0, 'galicia'));
    expect((await commit(run([keeper], 1))).withdrawnBanks).toBe(0);
    expect((await commit(run([keeper], 1.5))).withdrawnBanks).toBe(0);
    expect(await commit(run([keeper], 2))).toMatchObject({
      withdrawnBanks: 1,
      withdrawnCampaigns: 0,
    });
    await commit(run([keeper], 3, 'galicia'));
    expect(await commit(run([keeper], 4, 'galicia'))).toMatchObject({
      withdrawnBanks: 1,
      withdrawnCampaigns: 1,
    });
    await commit(
      run([], 5, 'macro', {
        observedExternalIds: [a.externalId],
        totalReported: 1,
        rawRowCount: 1,
      }),
    );
    const [restored] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.externalId, a.externalId));
    expect(restored.withdrawnAt).toBeNull();
    const [p] = await db
      .select()
      .from(presence)
      .where(eq(presence.campaignId, restored.id));
    expect(p).toBeDefined();
  });

  it.each([
    { outcome: 'partial' as const },
    { outcome: 'failed' as const },
    { complete: false },
    { totalReported: 9 },
    { observedExternalIds: [], totalReported: 0, rawRowCount: 0 },
  ])('never withdraws unsafe runs %j', async (change) => {
    const a = listing(),
      keeper = listing();
    await commit(run([a, keeper]));
    await commit(run([keeper], 1));
    const result = await commit(run([keeper], 3, 'macro', change));
    expect(result.withdrawnBanks).toBe(0);
    const [r] = await db.select().from(runs).where(eq(runs.id, result.runId));
    expect(r.anomalies).toContainEqual(
      expect.objectContaining({ kind: 'absence_skipped' }),
    );
  });

  it.each([false, true])(
    'never rebases repeated low-count runs (first count mismatch: %s)',
    async (mismatch) => {
      const all = Array.from({ length: 100 }, () => listing());
      await commit(run(all));
      for (let day = 1; day <= 4; day++) {
        const result = await commit(
          run(
            all.slice(0, 10),
            day,
            'macro',
            mismatch && day === 1 ? { totalReported: 11 } : {},
          ),
        );
        expect(result.withdrawnBanks).toBe(0);
        const [record] = await db
          .select()
          .from(runs)
          .where(eq(runs.id, result.runId));
        expect(record.anomalies).toContainEqual({
          kind: 'absence_skipped',
          detail: mismatch && day === 1 ? 'count_mismatch' : 'low_count',
        });
      }
      const bankRows = await db.select().from(presence);
      expect(bankRows).toHaveLength(100);
      expect(
        bankRows.every(
          (p) => p.withdrawnAt === null && p.missingSinceRunId === null,
        ),
      ).toBe(true);
    },
  );

  it.each(['placeholder', 'observed-only'] as const)(
    'invalidates a formerly usable bank branch when malformed (%s)',
    async (mode) => {
      const a = bankListing(listing(), 'macro', 'selecta-1');
      await commit(run([a]));
      const malformed = {
        ...a,
        terms: null,
        tiers: null,
        unpublishableReason: 'malformed_record',
        raw: { listing: { id: a.externalId }, detail: null },
      };
      await commit(
        run(mode === 'placeholder' ? [malformed] : [], 1, 'macro', {
          observedExternalIds: [a.externalId],
          rawRowCount: 1,
          totalReported: 1,
        }),
      );
      const [row] = await db.select().from(campaigns);
      expect(row.terms).toBeNull();
      expect(row.withdrawnAt).toBeNull();
      expect(
        await listPublishableCampaigns(db, { today: '2026-10-02' }),
      ).toHaveLength(0);
      const [p] = await db.select().from(presence);
      expect(p.terms).toBeNull();
      expect(p.snapshot.terms).toBeNull();
      expect(p.tiers).toBeNull();
    },
  );

  it.each(['placeholder', 'observed-only'] as const)(
    'does not resurrect withdrawn eligibility from malformed reappearance (%s)',
    async (mode) => {
      const a = bankListing(listing(), 'macro', 'selecta-1'),
        keeper = listing();
      await commit(run([a, keeper]));
      await commit(run([keeper], 1));
      await commit(run([keeper], 2));
      const malformed = {
        ...a,
        terms: null,
        tiers: null,
        unpublishableReason: 'malformed_record',
      };
      await commit(
        run(
          mode === 'placeholder' ? [malformed, keeper] : [keeper],
          3,
          'macro',
          {
            observedExternalIds: [a.externalId, keeper.externalId],
            rawRowCount: 2,
            totalReported: 2,
          },
        ),
      );
      const [row] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.externalId, a.externalId));
      expect(row.withdrawnAt).toBeNull();
      expect(row.terms).toBeNull();
      expect(row.unpublishableReason).toBe(
        mode === 'placeholder'
          ? 'malformed_record'
          : 'observed_without_listing',
      );
    },
  );

  it.each(['placeholder', 'observed-only'] as const)(
    'keeps other banks valid when a bank is malformed (%s) and persists new malformed placeholders',
    async (mode) => {
      const base = listing();
      const macro = bankListing(base, 'macro', 'selecta-1');
      const galicia = bankListing(base, 'galicia', 'eminent');
      await commit(run([macro]));
      await commit(run([galicia], 0, 'galicia'));
      await commit(
        run(
          mode === 'placeholder'
            ? [
                {
                  ...macro,
                  terms: null,
                  unpublishableReason: 'malformed_record',
                },
              ]
            : [],
          1,
          'macro',
          {
            observedExternalIds: [macro.externalId],
            rawRowCount: 1,
            totalReported: 1,
          },
        ),
      );
      const [row] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.externalId, base.externalId));
      expect(qualifies(row.terms!, 'galicia', 'platinum', 'eminent')).toBe(
        'yes',
      );
      expect(qualifies(row.terms!, 'macro', 'selecta-1', 'masivo')).toBe('no');
      const malformed = {
        ...listing(),
        terms: null,
        unpublishableReason: 'malformed_record',
      };
      expect(await commit(run([malformed], 2))).toMatchObject({
        created: 1,
        unpublishable: 1,
      });
      const [created] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.externalId, malformed.externalId));
      expect(created.terms).toBeNull();
      expect(created.unpublishableReason).toBe('malformed_record');
    },
  );

  it('limits Macro coverage metadata to the audited hub', async () => {
    const [macro] = await db
      .select()
      .from(schema.benefitBanks)
      .where(eq(schema.benefitBanks.slug, 'macro'));
    expect(macro.ownCatalogScope).toBe(
      'PlayDigital hub only; separate Selecta sections are not confirmed',
    );
  });

  it('filters inclusive expiry, hidden and bank/category queries', async () => {
    const a = listing();
    await commit(run([a]));
    expect(
      await listPublishableCampaigns(db, {
        today: '2026-10-31',
        bankSlugs: ['macro'],
        categories: ['gastronomia'],
      }),
    ).toHaveLength(1);
    expect(
      await listPublishableCampaigns(db, { today: '2026-11-01' }),
    ).toHaveLength(0);
    const [row] = await db.select().from(campaigns);
    await setCampaignHidden(db, row.id, true, 'test');
    expect(
      await listPublishableCampaigns(db, { today: '2026-10-31' }),
    ).toHaveLength(0);
  });
});
