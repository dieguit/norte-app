import { randomUUID } from 'node:crypto';
import { arrayOverlaps, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
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
const describeWhenSafe = safe ? describe : describe.skip;

describeWhenSafe('BenefitsService matching', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  const notifications = new NotificationsService(db);
  const service = new BenefitsService(db, notifications);

  const TEST_SLUGS = ['galicia-visa-credito', 'modo'];
  let testUserIds: string[] = [];

  const cleanup = async () => {
    await db
      .delete(benefits)
      .where(arrayOverlaps(benefits.instrumentSlugs, TEST_SLUGS));
    if (testUserIds.length > 0) {
      await db
        .delete(benefitUserPreferences)
        .where(inArray(benefitUserPreferences.userId, testUserIds));
      testUserIds = [];
    }
  };

  beforeEach(cleanup);

  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  const NOW = new Date('2026-10-22T02:00:00Z'); // 2026-10-21 23:00 in AR, a Wednesday (3); UTC date is already Thursday
  const row = (
    slug: string,
    over: Partial<typeof benefits.$inferInsert> = {},
  ) => ({
    providerSlug: 'test',
    sourceUrl: 'https://s.test',
    fingerprint: randomUUID(),
    title: 't',
    merchant: 'Coto',
    category: 'supermercado',
    kind: 'discount',
    value: 20,
    instrumentSlugs: [slug],
    firstSeenAt: NOW,
    lastSeenAt: NOW,
    ...over,
  });

  it('matches by instrument, category, AR weekday, validity and freshness', async () => {
    const slug = 'galicia-visa-credito';
    const u = `user_${randomUUID()}`;
    testUserIds.push(u);
    await db.insert(benefitUserPreferences).values({
      userId: u,
      instrumentSlugs: [slug, 'removed-from-catalog'],
      categories: ['supermercado', 'cine'],
    });
    await db.insert(benefits).values([
      row(slug, { merchant: 'Wednesday', weekdays: [3] }),
      row(slug, {
        merchant: 'Everyday',
        weekdays: null,
        kind: 'nxm',
        value: 2,
        category: 'cine',
      }),
      row(slug, { merchant: 'Thursday', weekdays: [4] }),
      row(slug, { merchant: 'OtherCategory', category: 'viajes' }),
      row('modo', { merchant: 'OtherInstrument' }),
      row(slug, { merchant: 'Expired', validTo: '2026-10-20' }),
      row(slug, { merchant: 'NotYet', validFrom: '2026-10-22' }),
      row(slug, {
        merchant: 'Stale',
        lastSeenAt: new Date('2026-10-18T00:00:00Z'),
      }),
    ]);
    const matched = await service.findMatching(u, NOW);
    expect(matched.map((m) => m.merchant)).toEqual(['Everyday', 'Wednesday']);
    expect(matched[0].instrumentLabel).toBe('Galicia Visa crédito');
  });

  it('does not match when user holds a removed slug (not in catalog) even if benefit is tagged with it', async () => {
    const removedSlug = 'removed-slug';
    const u = `user_${randomUUID()}`;
    testUserIds.push(u);
    await db.insert(benefitUserPreferences).values({
      userId: u,
      instrumentSlugs: [removedSlug],
      categories: ['supermercado'],
    });
    await db.insert(benefits).values([
      row(removedSlug, {
        merchant: 'RemovedInstrumentPromo',
        category: 'supermercado',
        weekdays: null,
      }),
    ]);
    const matched = await service.findMatching(u, NOW);
    expect(matched).toEqual([]);
    await db
      .delete(benefits)
      .where(arrayOverlaps(benefits.instrumentSlugs, [removedSlug]));
  });

  it('returns nothing without preferences and buildDigest returns null', async () => {
    const u = `user_${randomUUID()}`;
    testUserIds.push(u);
    await expect(service.findMatching(u, NOW)).resolves.toEqual([]);
    await expect(service.buildDigest(u, NOW)).resolves.toBeNull();
  });

  it('savePreferences stores and enables the digest atomically; rejects unknown slugs', async () => {
    const u = `user_${randomUUID()}`;
    testUserIds.push(u);
    await expect(
      service.savePreferences(u, {
        instrumentSlugs: ['nope'],
        categories: ['cine'],
      }),
    ).rejects.toThrow('nope');
    await expect(service.getPreferences(u)).resolves.toEqual({
      instrumentSlugs: [],
      categories: [],
      enabled: false,
    });
    await expect(
      service.savePreferences(u, {
        instrumentSlugs: ['modo', 'modo'],
        categories: ['cine'],
      }),
    ).resolves.toEqual({
      instrumentSlugs: ['modo'],
      categories: ['cine'],
      enabled: true,
    });
  });
});
