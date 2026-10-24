import { randomUUID } from 'node:crypto';
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
const describeWhenSafe = safe ? describe : describe.skip;

describeWhenSafe('BenefitsService matching', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  const notifications = new NotificationsService(db);
  const service = new BenefitsService(db, notifications);

  afterAll(async () => pool.end());

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
    const slug = `i-${randomUUID()}`;
    const u = `user_${randomUUID()}`;
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
      row(`other-${randomUUID()}`, { merchant: 'OtherInstrument' }),
      row(slug, { merchant: 'Expired', validTo: '2026-10-20' }),
      row(slug, { merchant: 'NotYet', validFrom: '2026-10-22' }),
      row(slug, {
        merchant: 'Stale',
        lastSeenAt: new Date('2026-10-18T00:00:00Z'),
      }),
    ]);
    const matched = await service.findMatching(u, NOW);
    expect(matched.map((m) => m.merchant)).toEqual(['Everyday', 'Wednesday']);
    expect(matched[0].instrumentLabel).toBe(slug); // not in catalog → falls back to slug
  });

  it('returns nothing without preferences and buildDigest returns null', async () => {
    await expect(
      service.findMatching(`user_${randomUUID()}`, NOW),
    ).resolves.toEqual([]);
    await expect(
      service.buildDigest(`user_${randomUUID()}`, NOW),
    ).resolves.toBeNull();
  });
});
