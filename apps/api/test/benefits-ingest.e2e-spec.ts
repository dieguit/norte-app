import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { schema } from '../src/database/schema';
import { CampaignTermsSchema, type CampaignTerms } from '@repo/shared-types';
import { evaluateEligibility } from '../src/benefits/rules/eligibility';
import { BenefitsService } from '../src/benefits/benefits.service';
import { playdigitalAdapter } from '../src/benefits/ingest/playdigital';
import { ALLOWED_BANKS } from '../src/benefits/ingest/tiers';
import {
  benefitCampaigns as campaigns,
  benefitCampaignBanks as presence,
  benefitIngestRuns as runs,
  benefitBrands as brands,
  benefitDetailCache as details,
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
      purchaseConditions: [],
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
    raw: { listing: { calculated_status: 'RUNNING' }, detail: { value: 1 } },
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

  it('prunes rejected bank presence while keeping cached detail and other banks', async () => {
    const a = listing();
    await commit(run([a]));
    await commit(run([a], 0, 'galicia'));
    await saveDetail(db, 'playdigital', a.externalId, {
      listingHash: 'hash',
      fetchedAt: start,
      detail: { status: 'draft' },
    });
    await commit(
      run([], 1, 'macro', {
        rawRowCount: 1,
        totalReported: 1,
        observedExternalIds: [a.externalId],
        rejectedExternalIds: [a.externalId],
      }),
    );
    expect((await db.select().from(presence)).map((p) => p.bankSlug)).toEqual([
      'galicia',
    ]);
    await commit(
      run([], 1, 'galicia', {
        rawRowCount: 1,
        totalReported: 1,
        observedExternalIds: [a.externalId],
        rejectedExternalIds: [a.externalId],
      }),
    );
    expect(await db.select().from(campaigns)).toHaveLength(0);
    expect(await db.select().from(details)).toHaveLength(1);
  });

  it('prunes orphan brands without aliases but retains referenced and curated brands', async () => {
    const a = listing();
    await commit(run([a]));
    await db.insert(brands).values([
      { name: 'Orphan', normalized: 'orphan' },
      { name: 'Curated', normalized: 'curated', aliases: ['Alias'] },
    ]);
    await commit(run([a], 1));
    expect(
      (await db.select().from(brands)).map((b) => b.normalized).sort(),
    ).toEqual(['cafe', 'curated']);
  });

  it('materializes old stored defaults without upgrading incomplete bank terms', async () => {
    const a = listing();
    await commit(run([a]));
    await db.execute(
      sql`update ${campaigns} set terms = terms - 'purchaseConditions'`,
    );
    await db.execute(
      sql`update ${presence} set terms = terms - 'purchaseConditions'`,
    );
    expect(
      (await listPublishableCampaigns(db, { today: '2026-10-01' }))[0].terms
        ?.purchaseConditions,
    ).toEqual([]);
    const incomplete = {
      ...a,
      terms: {
        ...a.terms!,
        eligibilityCompleteness: 'incomplete' as const,
        unresolved: ['unknown conditions'],
      },
    };
    await commit(run([incomplete], 0, 'galicia'));
    const [row] = await db.select().from(campaigns);
    expect(row.terms?.purchaseConditions).toEqual([]);
    expect(row.terms?.eligibilityCompleteness).toBe('incomplete');
    expect(
      await listPublishableCampaigns(db, {
        today: '2026-10-01',
        bankSlugs: ['macro'],
      }),
    ).toHaveLength(1);
    expect(
      await listPublishableCampaigns(db, {
        today: '2026-10-01',
        bankSlugs: ['galicia'],
      }),
    ).toHaveLength(0);
  });

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

  it('retains representative terms and authoritative bank snapshots through withdrawal and reappearance', async () => {
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
    expect(qualifies(terms, 'macro', 'selecta-1', 'masivo')).toBe('no');
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
      'no',
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
    expect(p.terms).toEqual(CampaignTermsSchema.parse(macro.terms));
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

  it('keeps many-bank campaigns publishable without building an oversized eligibility union', async () => {
    const a = listing();
    let result;
    for (const bank of ALLOWED_BANKS) {
      result = await commit(run([bankListing(a, bank, 'base')], 0, bank));
    }
    const [row] = await db.select().from(campaigns);
    expect(row.terms).toEqual(
      CampaignTermsSchema.parse(bankListing(a, 'banco-nacion', 'base').terms),
    );
    expect(CampaignTermsSchema.safeParse(row.terms).success).toBe(true);
    expect(row.unpublishableReason).toBeNull();
    expect(
      await listPublishableCampaigns(db, { today: '2026-10-01' }),
    ).toHaveLength(1);
    expect(await db.select().from(presence)).toHaveLength(ALLOWED_BANKS.length);
    const [record] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, result!.runId));
    expect(record.anomalies).not.toContainEqual(
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

  it('deletes each bank presence after two misses 24h apart', async () => {
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
    expect(restored).toBeUndefined();
  });

  it('withdraws absent listings and stays fresh when listed details fail', async () => {
    const absent = listing();
    const keeper = listing();
    await upsertBanks(db, [
      { slug: 'macro', name: 'Macro', playdigitalId: 'macro-id' },
    ]);
    await commit(run([absent, keeper]));
    const fetchImpl: typeof fetch = async (input) =>
      String(input).includes('/benefit/')
        ? new Response(null, { status: 404 })
        : Response.json({
            data: {
              cards: [
                { promo_id: keeper.externalId, calculated_status: 'RUNNING' },
              ],
            },
            metadata: {
              pagination: { page: 1, total_pages: 1, total_results: 1 },
            },
          });
    const ctx = {
      now: date(1),
      fetchImpl,
      knownDetails: new Map([
        [
          keeper.externalId,
          { listingHash: 'old', fetchedAt: start, detail: {} },
        ],
      ]),
      pacing: { minIntervalMs: 0, timeoutMs: 1000, retries: 0 },
    };
    const bank = { slug: 'macro', name: 'Macro', playdigitalId: 'macro-id' };
    const [first] = await playdigitalAdapter.run(ctx, [bank]);
    expect(first).toMatchObject({
      outcome: 'ok',
      complete: true,
      observedExternalIds: [keeper.externalId],
    });
    expect(first.anomalies).toContainEqual(
      expect.objectContaining({ kind: 'detail_failed' }),
    );
    expect(first.listings[0].unpublishableReason).toBe('detail outdated');
    first.completedAt = date(1);
    first.startedAt = date(1);
    await commit(first);
    const [second] = await playdigitalAdapter.run(ctx, [bank]);
    second.completedAt = date(2);
    second.startedAt = date(2);
    expect((await commit(second)).withdrawnBanks).toBe(1);
    const service = new BenefitsService(db, null as never, null as never);
    expect(
      (await service.banks(date(2))).banks.find((b) => b.slug === 'macro')
        ?.stale,
    ).toBe(false);
    const [row] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.externalId, keeper.externalId));
    expect(row.terms).toBeNull();
  });

  it('deletes a finished listing only after two complete absences 24 hours apart', async () => {
    const ended = listing(),
      keeper = listing();
    await commit(run([ended, keeper]));
    const bank = { slug: 'macro', name: 'Macro', playdigitalId: 'macro-id' };
    const fetchImpl: typeof fetch = async () =>
      Response.json({
        data: {
          cards: [
            { promo_id: ended.externalId, calculated_status: 'FINISHED' },
            { promo_id: keeper.externalId, calculated_status: 'RUNNING' },
          ],
        },
        metadata: { pagination: { page: 1, total_pages: 1, total_results: 2 } },
      });
    for (const day of [1, 2]) {
      const [result] = await playdigitalAdapter.run(
        {
          now: date(day),
          fetchImpl,
          knownDetails: new Map(),
          maxDetailFetches: 0,
          pacing: { minIntervalMs: 0, timeoutMs: 1000, retries: 0 },
        },
        [bank],
      );
      expect(result).toMatchObject({
        outcome: 'ok',
        complete: true,
        rawRowCount: 2,
        observedExternalIds: [keeper.externalId],
      });
      result.startedAt = result.completedAt = date(day);
      expect((await commit(result)).withdrawnBanks).toBe(day === 1 ? 0 : 1);
      expect(
        await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.externalId, ended.externalId)),
      ).toHaveLength(day === 1 ? 1 : 0);
    }
  });

  it('immediately prunes non-running legacy listings and rejected details, retaining pending details', async () => {
    const placeholder = listing(),
      past = listing(),
      finished = listing(),
      finishedProduct = listing(),
      upcoming = listing(),
      awaiting = listing(),
      unknown = listing(),
      rejected = listing(),
      pending = listing(),
      outdated = listing(),
      keeper = listing();
    const galicia = {
      ...listing(),
      source: 'galicia' as const,
      raw: { listing: { calculated_status: 'AWAITING' }, detail: null },
      terms: null,
      unpublishableReason: 'Error: invalid detail',
    };
    await commit(
      run([
        placeholder,
        past,
        finished,
        finishedProduct,
        upcoming,
        awaiting,
        unknown,
        rejected,
        pending,
        outdated,
        keeper,
      ]),
    );
    await commit(run([galicia], 0, 'galicia', { source: 'galicia' }));
    const rows = await db.select().from(campaigns);
    const byId = (id: string) => rows.find((row) => row.externalId === id)!;
    await db
      .update(presence)
      .set({ snapshot: { ...placeholder, unpublishableReason: 'finished' } })
      .where(eq(presence.campaignId, byId(placeholder.externalId).id));
    for (const [item, reason] of [
      [rejected, 'Error: invalid v2 detail'],
      [pending, 'detail pending'],
      [outdated, 'detail outdated'],
    ] as const)
      await db
        .update(presence)
        .set({
          snapshot: { ...item, terms: null, unpublishableReason: reason },
          terms: null,
        })
        .where(eq(presence.campaignId, byId(item.externalId).id));
    for (const [item, raw] of [
      [past, { calculated_status: 'RUNNING', stop_date: '2026-09-30' }],
      [finished, { calculated_status: 'FINISHED' }],
      [finishedProduct, { calculated_status: 'FINISHED_FOR_PRODUCT' }],
      [
        upcoming,
        { calculated_status: 'NEXT_FOR_PRODUCT', stop_date: '2026-09-30' },
      ],
      [awaiting, { calculated_status: 'AWAITING', stop_date: '2026-09-30' }],
      [unknown, { calculated_status: 'UNKNOWN', stop_date: '2026-09-30' }],
    ] as const) {
      await db
        .update(campaigns)
        .set({ raw: { listing: raw, detail: null } })
        .where(eq(campaigns.id, byId(item.externalId).id));
    }
    for (const item of [placeholder, past, finished, finishedProduct, upcoming])
      await saveDetail(db, 'playdigital', item.externalId, {
        listingHash: 'hash',
        fetchedAt: start,
        detail: {},
      });
    await commit(run([keeper], 1));
    const survivors = (await db.select().from(campaigns)).map(
      (row) => row.externalId,
    );
    for (const item of [
      placeholder,
      past,
      finished,
      finishedProduct,
      upcoming,
      awaiting,
      unknown,
      rejected,
    ]) {
      expect(survivors).not.toContain(item.externalId);
      expect(
        await db
          .select()
          .from(presence)
          .where(eq(presence.campaignId, byId(item.externalId).id)),
      ).toHaveLength(0);
    }
    for (const item of [pending, outdated, keeper, galicia])
      expect(survivors).toContain(item.externalId);
    expect(
      await db
        .select()
        .from(details)
        .where(eq(details.externalId, upcoming.externalId)),
    ).toHaveLength(1);
  });

  it('prunes expired campaigns, disallowed presences and orphan details while retaining admin data and runs', async () => {
    const expired = listing(),
      keeper = {
        ...listing(),
        terms: {
          ...listing().terms!,
          validity: { from: null, to: null, weekdays: null },
        },
      };
    const first = await commit(run([expired, keeper]));
    const [expiredRow] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.externalId, expired.externalId));
    const [keeperRow] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.externalId, keeper.externalId));
    await db
      .insert(schema.benefitBanks)
      .values({ slug: 'unwanted-test', name: 'Unwanted' })
      .onConflictDoNothing();
    const [basePresence] = await db
      .select()
      .from(presence)
      .where(eq(presence.campaignId, keeperRow.id));
    await db
      .insert(presence)
      .values({ ...basePresence, bankSlug: 'unwanted-test' });
    const key = `pd:prune-${randomUUID()}`;
    await setCategoryMapping(db, key, 'otros', 'test');
    for (const id of [expired.externalId, keeper.externalId, 'orphan-test'])
      await saveDetail(db, 'playdigital', id, {
        listingHash: 'hash',
        fetchedAt: start,
        detail: {},
      });
    for (const [id, fetchedAt] of [
      ['fresh-orphan', date(30)],
      ['ttl-boundary', date(24)],
    ] as const)
      await saveDetail(db, 'playdigital', id, {
        listingHash: 'hash',
        fetchedAt,
        detail: {},
      });
    try {
      const second = await commit(run([keeper], 31));
      expect(
        await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, expiredRow.id)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(presence)
          .where(eq(presence.bankSlug, 'unwanted-test')),
      ).toHaveLength(0);
      expect(
        (await db.select().from(details)).map((row) => row.externalId).sort(),
      ).toEqual([keeper.externalId, 'fresh-orphan', 'ttl-boundary'].sort());
      expect(
        await db.select().from(brands).where(eq(brands.id, keeperRow.brandId!)),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(schema.benefitCategoryMappings)
          .where(eq(schema.benefitCategoryMappings.sourceKey, key)),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(runs)
          .where(sql`${runs.id} in (${first.runId}, ${second.runId})`),
      ).toHaveLength(2);
    } finally {
      await db
        .delete(schema.benefitCategoryMappings)
        .where(eq(schema.benefitCategoryMappings.sourceKey, key));
      await db
        .delete(schema.benefitBanks)
        .where(eq(schema.benefitBanks.slug, 'unwanted-test'));
    }
  });

  it('never stores non-allowlisted banks', async () => {
    const slug = `unwanted-${randomUUID()}`;
    await upsertBanks(db, [
      { slug, name: 'Unwanted', playdigitalId: 'unwanted' },
    ]);
    expect(
      await db
        .select()
        .from(schema.benefitBanks)
        .where(eq(schema.benefitBanks.slug, slug)),
    ).toHaveLength(0);
    await expect(commit(run([listing()], 0, slug))).rejects.toThrow(
      'Invalid bank',
    );
    expect(
      await db
        .select()
        .from(schema.benefitBanks)
        .where(eq(schema.benefitBanks.slug, slug)),
    ).toHaveLength(0);
  });

  it('blocks withdrawal when a later listing page fails', async () => {
    const absent = listing(),
      keeper = listing();
    await commit(run([absent, keeper]));
    await commit(run([keeper], 1));
    const fetchImpl: typeof fetch = async (input) =>
      new URL(String(input)).searchParams.get('page') === '1'
        ? Response.json({
            data: {
              cards: [
                { promo_id: keeper.externalId, calculated_status: 'RUNNING' },
              ],
            },
            metadata: {
              pagination: { page: 1, total_pages: 2, total_results: 2 },
            },
          })
        : new Response(null, { status: 500 });
    const [partial] = await playdigitalAdapter.run(
      {
        now: date(2),
        fetchImpl,
        knownDetails: new Map(),
        maxDetailFetches: 0,
        pacing: { minIntervalMs: 0, timeoutMs: 1000, retries: 0 },
      },
      [{ slug: 'macro', name: 'Macro', playdigitalId: 'macro-id' }],
    );
    expect(partial).toMatchObject({ outcome: 'partial', complete: false });
    partial.startedAt = partial.completedAt = date(2);
    const result = await commit(partial);
    expect(result.withdrawnBanks).toBe(0);
    expect(
      await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.externalId, absent.externalId)),
    ).toHaveLength(1);
    const [record] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, result.runId));
    expect(record.anomalies).toContainEqual({
      kind: 'absence_skipped',
      detail: 'outcome_not_ok',
    });
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
        raw: {
          listing: { id: a.externalId, calculated_status: 'RUNNING' },
          detail: null,
        },
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
      if (mode === 'observed-only') {
        expect(row).toBeUndefined();
        return;
      }
      expect(row.withdrawnAt).toBeNull();
      expect(row.terms).toBeNull();
      expect(row.unpublishableReason).toBe('malformed_record');
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
      'Solo el hub de PlayDigital; las secciones Selecta separadas no están confirmadas',
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
