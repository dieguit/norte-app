import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { CampaignTerms, PurchaseCondition } from '@repo/shared-types';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { benefitUserPreferences } from '../src/benefits/benefits.schema';
import {
  benefitBanks,
  benefitCampaigns,
  benefitCampaignBanks,
  benefitIngestRuns,
} from '../src/benefits/ingest/schema';
import { BenefitsService } from '../src/benefits/benefits.service';
import { schema } from '../src/database/schema';
import { NotificationsService } from '../src/notifications/notifications.service';

const url = process.env.DATABASE_URL;
if (url && new URL(url).pathname !== '/norte_test')
  throw new Error('Only norte_test permitted');
(url ? describe : describe.skip)(
  'customer purchase conditions on persisted bank terms',
  () => {
    const pool = new Pool({ connectionString: url });
    const db = drizzle(pool, { schema });
    const service = new BenefitsService(
      db,
      new NotificationsService(db),
      new ConfigService({}),
    );
    const user = `benefits_test_${randomUUID()}`;
    const bank = `test-${randomUUID()}`;
    const otherBank = `test-${randomUUID()}`;
    const run = randomUUID();
    const ids = [randomUUID(), randomUUID()];
    const title = `Consumer test ${randomUUID()}`;
    const now = new Date('2026-10-22T02:00:00Z');
    const coupon: PurchaseCondition = {
      kind: 'coupon',
      code: 'AHORRO',
      instruction: 'Ingresá AHORRO',
      evidence: 'Cupón AHORRO',
    };
    const terms: CampaignTerms = {
      offers: [{ kind: 'percent', percentageBps: 2000, mode: 'cashback' }],
      eligibility: { card: { types: ['credit'], network: 'visa' } },
      eligibilityCompleteness: 'complete',
      unresolved: [],
      purchaseConditions: [],
      capState: 'none',
      caps: [],
      minimumSpendMinor: 0,
      validity: { from: null, to: '2026-10-31', weekdays: null },
      channels: [],
      where: null,
      legalText: null,
      warnings: [],
    };
    beforeAll(async () => {
      await db.insert(benefitBanks).values([
        { slug: bank, name: 'Test bank', ownCatalog: true },
        { slug: otherBank, name: 'Other test bank', ownCatalog: true },
      ]);
      await db.insert(benefitIngestRuns).values({
        id: run,
        source: 'playdigital',
        bankSlug: bank,
        startedAt: now,
        completedAt: now,
        outcome: 'ok',
        complete: true,
        rawRowCount: 2,
        observedCount: 2,
      });
      await db.insert(benefitUserPreferences).values({
        userId: user,
        banks: [bank, otherBank].map((slug) => ({
          slug,
          tier: null,
          cards: [{ type: 'credit' as const, network: 'visa' as const }],
        })),
        usesModo: false,
        categories: ['supermercados'],
      });
      const legacy = { ...terms };
      delete (legacy as Partial<CampaignTerms>).purchaseConditions;
      for (const [index, id] of ids.entries()) {
        await db.insert(benefitCampaigns).values({
          id,
          source: 'playdigital',
          externalId: id,
          title,
          categories: ['supermercados'],
          terms: {
            ...terms,
            eligibilityCompleteness: 'incomplete',
            unresolved: ['Unknown representative requirement'],
            validity: { from: null, to: '2026-01-01', weekdays: null },
          },
          verifyUrl: 'https://example.com',
          raw: { listing: {}, detail: null },
          listingHash: id,
          firstSeenAt: now,
          lastSeenAt: now,
        });
        await db.insert(benefitCampaignBanks).values({
          campaignId: id,
          bankSlug: index === 0 ? bank : otherBank,
          terms:
            index === 0 ? legacy : { ...terms, purchaseConditions: [coupon] },
          snapshot: {} as never,
          lastSeenAt: now,
          lastSeenRunId: run,
        });
      }
    });
    afterAll(async () => {
      await db
        .delete(benefitCampaigns)
        .where(inArray(benefitCampaigns.id, ids));
      await db.delete(benefitIngestRuns).where(eq(benefitIngestRuns.id, run));
      await db
        .delete(benefitUserPreferences)
        .where(eq(benefitUserPreferences.userId, user));
      await db
        .delete(benefitBanks)
        .where(inArray(benefitBanks.slug, [bank, otherBank]));
      await pool.end();
    });
    it('searches/details complete bank terms independently of representative completeness and dates', async () => {
      const query = { day: 'today' as const, page: 1, pageSize: 20 };
      const result = await service.search(user, query, now);
      expect(result.items).toMatchObject([
        {
          id: ids[0],
          match: 'eligible',
          purchaseConditions: [],
          variants: [
            { id: ids[1], match: 'conditional', purchaseConditions: [coupon] },
          ],
        },
      ]);
      expect(result.items[0]!.usableWith.map((card) => card.bankSlug)).toEqual([
        bank,
      ]);
      const detail = await service.detail(user, ids[1]!, now);
      expect(detail).toMatchObject({
        match: 'conditional',
        purchaseConditions: [coupon],
        nextDate: '2026-10-21',
        variants: [{ id: ids[0], match: 'eligible', purchaseConditions: [] }],
      });
      expect(
        (await service.search(user, { ...query, bank: otherBank }, now))
          .items[0]?.match,
      ).toBe('conditional');
      await db
        .update(benefitCampaignBanks)
        .set({
          terms: {
            ...terms,
            purchaseConditions: [coupon],
            validity: { from: '2026-10-22', to: '2026-10-22', weekdays: null },
          },
        })
        .where(eq(benefitCampaignBanks.campaignId, ids[1]!));
      expect(
        (await service.search(user, { ...query, bank: otherBank }, now)).total,
      ).toBe(0);
      expect(
        (
          await service.search(
            user,
            { ...query, bank: otherBank, day: 'tomorrow' },
            now,
          )
        ).items[0],
      ).toMatchObject({ match: 'conditional', nextDate: '2026-10-22' });
      await db
        .update(benefitCampaignBanks)
        .set({
          terms: {
            ...terms,
            eligibilityCompleteness: 'incomplete',
            unresolved: ['Old unresolved requirement'],
          },
        })
        .where(eq(benefitCampaignBanks.campaignId, ids[1]!));
      expect(
        (await service.search(user, { ...query, bank: otherBank }, now)).total,
      ).toBe(0);
      await expect(service.detail(user, ids[1]!, now)).rejects.toThrow(
        'Beneficio no disponible',
      );
    });
  },
);
