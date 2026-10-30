import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ExplorerQuerySchema } from '@repo/shared-types';
import { schema } from '../src/database/schema';
import { DATABASE_CONNECTION } from '../src/database/database.constants';
import { ClerkAuthGuard } from '../src/profile/clerk-auth.guard';
import {
  BENEFITS_ADMIN_CLERK,
  BenefitsAdminGuard,
} from '../src/benefits/benefits-admin.guard';
import { BenefitsExplorerController } from '../src/benefits/ingest/explorer.controller';
import { BenefitsExplorerService } from '../src/benefits/ingest/explorer.service';
import {
  benefitBrands as brands,
  benefitCampaigns as campaigns,
  benefitCampaignBanks as presence,
  benefitBanks as banks,
  benefitIngestRuns as runs,
  benefitCategoryMappings as mappings,
} from '../src/benefits/ingest/schema';
import { commitRun } from '../src/benefits/ingest/store';
import { normalizeBrand } from '../src/benefits/ingest/brands';
import type {
  AdapterRun,
  NormalizedListing,
} from '../src/benefits/ingest/types';

const url = process.env.DATABASE_URL;
if (url && new URL(url).pathname !== '/norte_test')
  throw new Error('Only norte_test permitted');
describe.skipIf(!url)('benefits explorer HTTP', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const prefix = `explorer-${randomUUID()}`;
  const bank = prefix;
  const key = `galicia:${prefix}`;
  const brandIds = [randomUUID(), randomUUID()];
  const campaignIds = Array.from({ length: 5 }, () => randomUUID());
  const runIds: string[] = [randomUUID()];
  let admin = true;
  let app: INestApplication;
  const now = new Date();
  const listing = (externalId: string): NormalizedListing => ({
    source: 'playdigital',
    externalId,
    bankSlugs: [bank],
    title: `${prefix} Offer`,
    brandName: `${prefix} Old`,
    sourceBrandId: prefix,
    rawCategories: [key],
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
      validity: { from: null, to: null, weekdays: null },
      channels: [],
      where: null,
      legalText: null,
      warnings: [],
    },
    unpublishableReason: null,
    verify: { url: 'https://example.test/verify', hint: null },
    listingHash: 'hash',
    raw: { listing: { ref: externalId }, detail: { legal: 'raw detail' } },
    detailFetchedAt: now,
    detailStale: false,
  });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BenefitsExplorerController],
      providers: [
        BenefitsExplorerService,
        BenefitsAdminGuard,
        { provide: DATABASE_CONNECTION, useValue: db },
        {
          provide: BENEFITS_ADMIN_CLERK,
          useValue: {
            users: {
              getUser: async () => ({
                publicMetadata: { role: admin ? 'admin' : 'member' },
              }),
            },
          },
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user: { id: string } } };
        }) => {
          context.switchToHttp().getRequest().user = { id: 'explorer-admin' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
    await db
      .insert(banks)
      .values([
        { slug: bank, name: bank },
        { slug: 'macro', name: 'Macro' },
        { slug: 'galicia', name: 'Galicia' },
      ])
      .onConflictDoNothing();
    await db.insert(brands).values(
      brandIds.map((id, i): typeof brands.$inferInsert => ({
        id,
        name: `${prefix} ${i ? 'New' : 'Old'}`,
        normalized: normalizeBrand(`${prefix} ${i ? 'New' : 'Old'}`),
        sourceIds: i ? {} : { playdigital: [prefix] },
      })),
    );
    await db.insert(runs).values({
      id: runIds[0],
      source: 'playdigital',
      bankSlug: bank,
      startedAt: now,
      completedAt: now,
      outcome: 'ok',
      complete: true,
      totalReported: 5,
      rawRowCount: 5,
      observedCount: 5,
    });
    await db.insert(campaigns).values(
      campaignIds.map((id, i) => {
        const l = listing(id);
        return {
          id,
          source: l.source,
          externalId: id,
          brandId: brandIds[0],
          title: `${prefix} ${i}`,
          categories: ['otros' as const],
          terms:
            i === 1
              ? null
              : i === 4
                ? {
                    ...l.terms!,
                    validity: { from: null, to: '2000-01-01', weekdays: null },
                  }
                : l.terms,
          unpublishableReason: i === 1 ? 'missing_detail' : null,
          verifyUrl: l.verify.url,
          hidden: i === 2,
          withdrawnAt: i === 3 ? now : null,
          raw: l.raw,
          listingHash: l.listingHash,
          firstSeenAt: now,
          lastSeenAt: now,
        };
      }),
    );
    await db.insert(presence).values(
      campaignIds.flatMap((id, i) =>
        ['macro', 'galicia'].map((bankSlug) => ({
          campaignId: id,
          bankSlug,
          terms:
            i === 1
              ? null
              : i === 4
                ? {
                    ...listing(id).terms!,
                    validity: { from: null, to: '2000-01-01', weekdays: null },
                  }
                : listing(id).terms,
          tiers: {
            bankSlug,
            codes: bankSlug === 'macro' ? ['platinum'] : ['eminent'],
          },
          snapshot: {
            ...listing(id),
            bankSlugs: [bankSlug],
            tiers: {
              bankSlug,
              codes: bankSlug === 'macro' ? ['platinum'] : ['eminent'],
            },
          },
          lastSeenAt: now,
          lastSeenRunId: runIds[0],
        })),
      ),
    );
  });
  afterAll(async () => {
    await db
      .delete(campaigns)
      .where(
        inArray(campaigns.externalId, [...campaignIds, `${prefix}-merge`]),
      );
    await db.delete(runs).where(inArray(runs.id, runIds));
    await db.delete(brands).where(inArray(brands.id, brandIds));
    await db.delete(mappings).where(eq(mappings.sourceKey, key));
    await db.delete(banks).where(eq(banks.slug, bank));
    await app?.close();
    await pool.end();
  });

  it('denies every route after live role revocation', async () => {
    admin = false;
    try {
      const routes = [
        ['get', '/campaigns'],
        ['get', `/campaigns/${campaignIds[0]}`],
        ['patch', `/campaigns/${campaignIds[0]}`],
        ['get', '/overview'],
        ['get', '/brands'],
        ['patch', `/brands/${brandIds[0]}`],
        ['post', '/brands/merge'],
        ['get', '/mappings'],
        ['patch', '/mappings'],
      ] as const;
      for (const [method, path] of routes)
        await request(app.getHttpServer())
          [method](`/admin/benefits/explorer${path}`)
          .send({})
          .expect(403);
    } finally {
      admin = true;
    }
  });

  it('paginates distinct campaigns, searches aliases and combines bank+tier on one row', async () => {
    const get = (query: Record<string, string | number>) =>
      request(app.getHttpServer())
        .get('/admin/benefits/explorer/campaigns')
        .query({ q: prefix, ...query })
        .expect(200);
    const page = await get({ pageSize: 2 });
    expect(page.body).toMatchObject({ total: 5, page: 1, pageSize: 2 });
    expect(page.body.items).toHaveLength(2);
    expect(page.body.items[0].raw).toBeUndefined();
    const second = await get({ pageSize: 2, page: 2 });
    expect(second.body.items[0].id).not.toBe(page.body.items[0].id);
    expect((await get({ bank: 'macro', tier: 'eminent' })).body.total).toBe(0);
    expect((await get({ bank: 'macro', tier: 'platinum' })).body.total).toBe(5);
    expect((await get({ tier: 'unknown' })).body.total).toBe(0);
    for (const status of [
      'available',
      'incomplete',
      'hidden',
      'withdrawn',
      'expired',
    ])
      expect((await get({ status })).body.total).toBe(1);
    const emptyPage = await get({ page: 1000 });
    expect(emptyPage.body).toMatchObject({ total: 5, items: [] });
    await request(app.getHttpServer())
      .get('/admin/benefits/explorer/campaigns?pageSize=101')
      .expect(400);
    expect(ExplorerQuerySchema.parse({}).pageSize).toBe(30);
    const association = and(
      eq(presence.campaignId, campaignIds[4]),
      eq(presence.bankSlug, 'macro'),
    );
    await db.update(presence).set({ tiers: null }).where(association);
    expect((await get({ bank: 'macro', tier: 'platinum' })).body.total).toBe(5);
    await db
      .update(presence)
      .set({
        terms: {
          ...listing(campaignIds[4]).terms!,
          eligibilityCompleteness: 'incomplete',
          unresolved: ['unknown tier signal'],
        },
      })
      .where(association);
    expect((await get({ bank: 'macro', tier: 'platinum' })).body.total).toBe(4);
    await db
      .update(presence)
      .set({
        tiers: { bankSlug: 'macro', codes: ['platinum'] },
        terms: listing(campaignIds[4]).terms,
      })
      .where(association);
  });

  it('uses complete unexpired terms on the same filtered bank, not the representative', async () => {
    const id = campaignIds[1];
    const get = (query: Record<string, string>) =>
      request(app.getHttpServer())
        .get('/admin/benefits/explorer/campaigns')
        .query({ q: prefix, ...query })
        .expect(200);
    const association = (bankSlug: string) =>
      and(eq(presence.campaignId, id), eq(presence.bankSlug, bankSlug));
    const incomplete = {
      ...listing(id).terms!,
      eligibilityCompleteness: 'incomplete' as const,
      unresolved: ['unknown bank conditions'],
    };
    await db
      .update(campaigns)
      .set({ terms: incomplete })
      .where(eq(campaigns.id, id));
    await db
      .update(presence)
      .set({ terms: incomplete })
      .where(association('galicia'));
    await db
      .update(presence)
      .set({ terms: listing(id).terms })
      .where(association('macro'));
    const has = (response: { body: { items: { id: string }[] } }) =>
      response.body.items.some((item) => item.id === id);
    expect(has(await get({ status: 'available' }))).toBe(true);
    expect(has(await get({ status: 'incomplete' }))).toBe(false);
    expect(has(await get({ status: 'incomplete', bank: 'galicia' }))).toBe(
      true,
    );
    expect(has(await get({ status: 'incomplete', bank: 'macro' }))).toBe(false);
    expect(
      has(
        await get({ status: 'incomplete', bank: 'galicia', tier: 'eminent' }),
      ),
    ).toBe(true);
    expect(
      has(
        await get({ status: 'incomplete', bank: 'galicia', tier: 'platinum' }),
      ),
    ).toBe(false);
    expect(has(await get({ status: 'incomplete', tier: 'eminent' }))).toBe(
      true,
    );
    expect(has(await get({ status: 'incomplete', tier: 'platinum' }))).toBe(
      false,
    );
    expect(has(await get({ status: 'incomplete', bank: 'absent-bank' }))).toBe(
      false,
    );
    expect(has(await get({ status: 'available', bank: 'galicia' }))).toBe(
      false,
    );
    expect(
      has(await get({ status: 'available', bank: 'macro', tier: 'platinum' })),
    ).toBe(true);
    expect(
      has(await get({ status: 'available', bank: 'macro', tier: 'eminent' })),
    ).toBe(false);
    await db
      .update(presence)
      .set({
        terms: {
          ...listing(id).terms!,
          validity: { from: null, to: '2000-01-01', weekdays: null },
        },
      })
      .where(association('macro'));
    expect(has(await get({ status: 'available' }))).toBe(false);
    expect(has(await get({ status: 'incomplete' }))).toBe(false);
    await db
      .update(presence)
      .set({ terms: listing(id).terms })
      .where(association('galicia'));
    expect(has(await get({ status: 'available', bank: 'galicia' }))).toBe(true);
    expect(has(await get({ status: 'available', bank: 'macro' }))).toBe(false);
    const detail = await request(app.getHttpServer())
      .get(`/admin/benefits/explorer/campaigns/${id}`)
      .expect(200);
    expect(detail.body.terms.eligibilityCompleteness).toBe('incomplete');
    expect(
      detail.body.banks.find((b: { slug: string }) => b.slug === 'galicia')
        .terms.eligibilityCompleteness,
    ).toBe('complete');
    await db.update(campaigns).set({ terms: null }).where(eq(campaigns.id, id));
    await db
      .update(presence)
      .set({ terms: null })
      .where(eq(presence.campaignId, id));
  });

  it('returns detail raw and bank tier codes, hides with actor, and rejects absent IDs', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/admin/benefits/explorer/campaigns/${campaignIds[0]}`)
      .expect(200);
    expect(detail.body.raw).toEqual(listing(campaignIds[0]).raw);
    expect(
      detail.body.banks.find((b: { slug: string }) => b.slug === 'macro')
        .tierCodes,
    ).toEqual(['platinum']);
    await request(app.getHttpServer())
      .patch(`/admin/benefits/explorer/campaigns/${campaignIds[0]}`)
      .send({ hidden: true })
      .expect(200);
    expect(
      (
        await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignIds[0]))
      )[0],
    ).toMatchObject({ hidden: true, hiddenBy: 'clerk:explorer-admin' });
    await request(app.getHttpServer())
      .patch(`/admin/benefits/explorer/campaigns/${randomUUID()}`)
      .send({ hidden: true })
      .expect(404);
    await request(app.getHttpServer())
      .get('/admin/benefits/explorer/campaigns/not-a-uuid')
      .expect(400);
    await request(app.getHttpServer())
      .get(`/admin/benefits/explorer/campaigns/${randomUUID()}`)
      .expect(404);
    const overview = await request(app.getHttpServer())
      .get('/admin/benefits/explorer/overview')
      .expect(200);
    expect(overview.body.runs.length).toBeLessThanOrEqual(50);
    expect(
      overview.body.tiers.macro.some(
        (t: { code: string }) => t.code === 'platinum',
      ),
    ).toBe(true);
  });

  it('rejects ambiguous aliases and merges durably through subsequent ingestion', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/benefits/explorer/brands/${randomUUID()}`)
      .send({ aliases: [] })
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/admin/benefits/explorer/brands/${brandIds[0]}`)
      .send({ aliases: ['!'] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/admin/benefits/explorer/brands/merge')
      .send({ fromId: brandIds[0], intoId: brandIds[0] })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/admin/benefits/explorer/brands/${brandIds[1]}`)
      .send({ aliases: [`${prefix} Old`] })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/admin/benefits/explorer/brands/${brandIds[0]}`)
      .send({ aliases: [`${prefix} Alias`] })
      .expect(200);
    const search = await request(app.getHttpServer())
      .get('/admin/benefits/explorer/campaigns')
      .query({ q: `${prefix} Alias` })
      .expect(200);
    expect(search.body.total).toBe(5);
    await request(app.getHttpServer())
      .post('/admin/benefits/explorer/brands/merge')
      .send({ fromId: brandIds[0], intoId: brandIds[1] })
      .expect(201);
    await request(app.getHttpServer())
      .post('/admin/benefits/explorer/brands/merge')
      .send({ fromId: brandIds[0], intoId: brandIds[1] })
      .expect(404);
    const l = listing(`${prefix}-merge`);
    l.sourceBrandId = null;
    await ingest(l);
    expect(
      (
        await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.externalId, l.externalId))
      )[0].brandId,
    ).toBe(brandIds[1]);
    const result = await request(app.getHttpServer())
      .get('/admin/benefits/explorer/brands')
      .query({ q: `${prefix} Old` })
      .expect(200);
    expect(result.body).toMatchObject({ total: 1 });
    expect(result.body.items[0].campaignCount).toBe(6);
  });

  it('counts observed mapping keys distinctly, records actor and preserves mapping on reingest', async () => {
    const before = await request(app.getHttpServer())
      .get('/admin/benefits/explorer/mappings')
      .expect(200);
    expect(
      before.body.items.find((m: { sourceKey: string }) => m.sourceKey === key),
    ).toMatchObject({ category: null, affectedCampaigns: 6 });
    await request(app.getHttpServer())
      .patch('/admin/benefits/explorer/mappings')
      .send({ sourceKey: key, category: 'gastronomia' })
      .expect(200);
    const [mapping] = await db
      .select()
      .from(mappings)
      .where(eq(mappings.sourceKey, key));
    expect(mapping.updatedBy).toBe('clerk:explorer-admin');
    expect(
      (
        await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignIds[0]))
      )[0].categories,
    ).toEqual(['gastronomia']);
    const l = listing(`${prefix}-merge`);
    await ingest(l);
    expect(
      (
        await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.externalId, l.externalId))
      )[0].categories,
    ).toEqual(['gastronomia']);
    await request(app.getHttpServer())
      .patch('/admin/benefits/explorer/mappings')
      .send({ sourceKey: 'pd:wrong', category: 'otros' })
      .expect(400);
  });
  it('lists and updates mappings with observed-only invalidation and null category payloads', async () => {
    const id = campaignIds[0];
    const invalidBank = and(
      eq(presence.campaignId, id),
      eq(presence.bankSlug, 'galicia'),
    );
    const validBank = and(
      eq(presence.campaignId, id),
      eq(presence.bankSlug, 'macro'),
    );
    const run: AdapterRun = {
      source: 'playdigital',
      bankSlug: 'galicia',
      startedAt: now,
      completedAt: now,
      outcome: 'partial',
      complete: false,
      totalReported: null,
      rawRowCount: 1,
      observedExternalIds: [id],
      listings: [],
      anomalies: [],
      error: null,
    };
    runIds.push((await commitRun(db, run, now)).runId);
    expect(
      (await db.select().from(presence).where(invalidBank))[0],
    ).toMatchObject({ terms: null, snapshot: { rawCategories: [] } });

    const verify = async (expected: string) => {
      const result = await request(app.getHttpServer())
        .get('/admin/benefits/explorer/mappings')
        .expect(200);
      expect(
        result.body.items.find(
          (m: { sourceKey: string }) => m.sourceKey === key,
        ).affectedCampaigns,
      ).toBe(6);
      await request(app.getHttpServer())
        .patch('/admin/benefits/explorer/mappings')
        .send({ sourceKey: key, category: 'viajes' })
        .expect(200);
      expect(
        (await db.select().from(campaigns).where(eq(campaigns.id, id)))[0]
          .categories,
      ).toEqual([expected]);
    };
    await verify('viajes');
    for (const snapshot of [null, {}, { rawCategories: null }]) {
      await db
        .update(presence)
        .set({ snapshot: sql`${JSON.stringify(snapshot)}::jsonb` })
        .where(invalidBank);
      await verify('viajes');
    }
    await db.update(presence).set({ withdrawnAt: now }).where(validBank);
    await verify('otros');
    await db.update(presence).set({ withdrawnAt: now }).where(invalidBank);
    await verify('viajes');
  });

  async function ingest(listing: NormalizedListing) {
    const run: AdapterRun = {
      source: 'playdigital',
      bankSlug: bank,
      startedAt: now,
      completedAt: now,
      outcome: 'ok',
      complete: true,
      totalReported: 1,
      rawRowCount: 1,
      observedExternalIds: [listing.externalId],
      listings: [listing],
      anomalies: [],
      error: null,
    };
    runIds.push((await commitRun(db, run, now)).runId);
  }
});
