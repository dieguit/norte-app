import { randomUUID } from 'node:crypto';
import type { BenefitRules } from '@repo/shared-types';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  benefits,
  benefitUserPreferences,
} from '../src/benefits/benefits.schema';
import { BenefitsService } from '../src/benefits/benefits.service';
import { schema } from '../src/database/schema';
import { NotificationsService } from '../src/notifications/notifications.service';

const databaseUrl = process.env.DATABASE_URL;
const safe =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safe)
  throw new Error('Benefits matching test only permits norte_test');

(safe ? describe : describe.skip)(
  'BenefitsService published-rule matching',
  () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool, { schema });
    const service = new BenefitsService(db, new NotificationsService(db));
    const users: string[] = [];
    const ids: string[] = [];
    const NOW = new Date('2026-10-22T02:00:00Z'); // Wednesday in Argentina.
    const rules: BenefitRules = {
      eligibility: {
        allOf: [
          { card: { instrumentSlugs: ['galicia-visa-credito'] } },
          { membership: { instrumentSlug: 'modo' } },
        ],
      },
      eligibilityCompleteness: 'complete',
      unresolved: [],
      offer: { type: 'cashback', percentageBps: 2000 },
      currency: 'ARS',
      minimumSpendMinor: 0,
      capState: 'none',
      caps: [],
      validity: {
        from: '2026-10-01',
        to: '2026-10-31',
        weekdays: [3],
        monthDays: null,
      },
      channels: { allowed: ['modo'], excluded: [] },
      requiredActions: [],
      stackable: 'unknown',
      recurrence: 'campaign',
    };

    afterAll(async () => {
      if (ids.length)
        await db.delete(benefits).where(inArray(benefits.id, ids));
      if (users.length)
        await db
          .delete(benefitUserPreferences)
          .where(inArray(benefitUserPreferences.userId, users));
      await pool.end();
    });

    async function seed(
      rulePatch: Partial<BenefitRules> = {},
      rowPatch: Partial<typeof benefits.$inferInsert> = {},
    ) {
      const id = randomUUID();
      ids.push(id);
      await db.insert(benefits).values({
        id,
        publisherProviderSlug: 'galicia',
        identityKey: `test:${id}`,
        origin: 'harvest',
        lifecycle: 'published',
        category: 'cine',
        snapshot: {
          title: 'Test combo',
          merchant: 'Test Cine',
          rules: { ...rules, ...rulePatch },
          evidence: {
            sourceUrl: 'https://example.com',
            detailUrl: null,
            termsUrl: null,
            quotes: [],
            fetchedContentHash: 'test',
          },
        },
        contentHash: id,
        firstSeenAt: NOW,
        lastSeenAt: NOW,
        lastVerifiedAt: NOW,
        ...rowPatch,
      });
      return id;
    }
    async function user(instrumentSlugs = ['galicia-visa-credito', 'modo']) {
      const userId = `benefits_test_${randomUUID()}`;
      users.push(userId);
      await db.insert(benefitUserPreferences).values({
        userId,
        instrumentSlugs,
        categories: ['cine'],
        declaredAt: Object.fromEntries(
          instrumentSlugs.map((slug) => [slug, NOW.toISOString()]),
        ),
      });
      return userId;
    }

    it('requires both instruments and published rules; digest uses the same evaluator', async () => {
      const id = await seed();
      const draft = await seed({}, { lifecycle: 'needs_review' });
      const full = await user(['galicia-visa-credito', 'modo', 'removed-slug']);
      const matches = await service.findMatching(full, NOW);
      expect(matches.find((m) => m.benefit.id === id)).toMatchObject({
        match: { eligibility: 'eligible', availability: 'available' },
        instrumentLabels: ['Galicia Visa crédito', 'MODO'],
      });
      expect(matches.some((m) => m.benefit.id === draft)).toBe(false);
      expect(await service.buildDigest(full, NOW)).toContain(
        'Galicia Visa crédito + MODO',
      );
      const cardOnly = await user(['galicia-visa-credito']);
      expect(
        (await service.findMatching(cardOnly, NOW)).some(
          (m) => m.benefit.id === id,
        ),
      ).toBe(false);
    });

    it('returns missing facts without guaranteeing the discount', async () => {
      const id = await seed({
        eligibility: {
          providerFact: {
            providerSlug: 'macro',
            key: 'salaryAccount',
            values: [true],
          },
        },
      });
      const u = await user();
      const match = (await service.findMatching(u, NOW)).find(
        (m) => m.benefit.id === id,
      );
      expect(match?.match.eligibility).toBe('needs_information');
      expect(match?.match.missingFacts.length).toBeGreaterThan(0);
    });

    it('filters ongoing benefits after their first day', async () => {
      const id = await seed({
        recurrence: 'ongoing',
        offer: { type: 'other', description: 'Test ongoing' },
      });
      const u = await user();
      expect(
        (await service.findMatching(u, NOW)).some((m) => m.benefit.id === id),
      ).toBe(true);
      expect(await service.buildDigest(u, NOW)).toContain('Test ongoing');
      await db
        .update(benefitUserPreferences)
        .set({
          declaredAt: {
            modo: '2026-10-20T00:00:00Z',
            'galicia-visa-credito': '2026-10-20T00:00:00Z',
          },
        })
        .where(eq(benefitUserPreferences.userId, u));
      expect((await service.buildDigest(u, NOW)) ?? '').not.toContain(
        'Test ongoing',
      );
    });

    it('returns nothing without preferences', async () => {
      expect(await service.findMatching(randomUUID(), NOW)).toEqual([]);
      expect(await service.buildDigest(randomUUID(), NOW)).toBeNull();
    });
  },
);
