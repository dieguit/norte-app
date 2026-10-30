import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { benefits } from '../src/benefits/benefits.schema';
import type { Provider } from '../src/benefits/catalog';
import { runHarvest } from '../src/benefits/harvest';
import { schema } from '../src/database/schema';

const databaseUrl = process.env.DATABASE_URL;
const safe =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safe)
  throw new Error('Benefits harvest test only permits norte_test');
const describeWhenSafe = safe ? describe : describe.skip;

describeWhenSafe('runHarvest', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  afterAll(async () => pool.end());

  const providerWith = (slug: string, urls: string[]): Provider => ({
    slug,
    name: slug,
    kind: 'bank',
    instruments: [
      {
        slug: `${slug}-visa-credito`,
        label: 'Visa crédito',
        network: 'visa',
        type: 'credit',
        evidenceUrl: 'https://example.test',
      },
    ],
    sources: urls.map((url, n) => ({
      id: `${slug}-${n}`,
      enabled: true,
      autoPublish: false,
      status: 'active' as const,
      coverage: 'partial' as const,
      url,
      strategy: 'fetch' as const,
      instructions: 'x',
    })),
  });
  const fakeFetch = (url: string) =>
    Promise.resolve(
      url.includes('broken')
        ? new Response('nope', { status: 503 })
        : new Response('<p>20% en Coto &amp; $&amp; promo</p>'),
    );

  it('inserts once, bumps last_seen on rerun, dedupes across sources, isolates failures', async () => {
    const slug = `p${randomUUID().slice(0, 8)}`;
    const provider = providerWith(slug, [
      'https://a.test/1',
      'https://a.test/2',
      'https://broken.test',
    ]);
    let currentValidFrom: string | null = '2026-10-10';
    const extract = (prompt: string) => {
      expect(prompt).toContain('20% en Coto & $& promo');
      return Promise.resolve({
        benefits: [
          {
            title: '20% en Coto',
            merchant: 'Coto',
            category: 'supermercado',
            kind: 'discount',
            value: 20,
            maxAmount: null,
            maxAmountPeriod: null,
            weekdays: [3],
            validFrom: currentValidFrom,
            validTo: null,
            instrumentSlugs: [`${slug}-visa-credito`],
            conditions: null,
          },
        ],
      });
    };

    const first = await runHarvest(
      db,
      extract,
      [provider],
      new Date('2026-10-21T06:00:00Z'),
      { fetchImpl: fakeFetch },
    );
    expect(first.map((r) => [r.status, r.inserted])).toEqual([
      ['ok', 1],
      ['ok', 0],
      ['failed', 0],
    ]);

    currentValidFrom = '2026-10-20';
    const second = await runHarvest(
      db,
      extract,
      [provider],
      new Date('2026-10-22T06:00:00Z'),
      { fetchImpl: fakeFetch },
    );
    expect(second[0].inserted).toBe(0);

    const rows = await db
      .select()
      .from(benefits)
      .where(eq(benefits.providerSlug, slug));
    expect(rows).toHaveLength(1);
    expect(rows[0].lastSeenAt.toISOString()).toBe('2026-10-22T06:00:00.000Z');
    expect(rows[0].firstSeenAt.toISOString()).toBe('2026-10-21T06:00:00.000Z');
    expect(rows[0].validFrom).toBe('2026-10-20');
  });

  it('dry run writes nothing', async () => {
    const slug = `p${randomUUID().slice(0, 8)}`;
    const extract = () =>
      Promise.resolve({
        benefits: [
          {
            title: '20% en Coto',
            merchant: 'Coto',
            category: 'supermercado',
            kind: 'discount',
            value: 20,
            maxAmount: null,
            maxAmountPeriod: null,
            weekdays: [3],
            validFrom: null,
            validTo: null,
            instrumentSlugs: [`${slug}-visa-credito`],
            conditions: null,
          },
        ],
      });
    const results = await runHarvest(
      db,
      extract,
      [providerWith(slug, ['https://a.test/1'])],
      new Date(),
      { fetchImpl: fakeFetch, dryRun: true },
    );
    expect(results[0]).toMatchObject({
      status: 'ok',
      extracted: 1,
      inserted: 0,
    });

    const rows = await db
      .select()
      .from(benefits)
      .where(eq(benefits.providerSlug, slug));
    expect(rows).toHaveLength(0);
  });
});
