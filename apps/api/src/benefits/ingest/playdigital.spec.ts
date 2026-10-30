import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CampaignTermsSchema } from '@repo/shared-types';
import {
  playdigitalAdapter,
  playdigitalBankSlug,
  playdigitalListingHash,
} from './playdigital';
import type { AdapterContext, BankRef, KnownDetail } from './types';

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      resolve('test/fixtures/benefits-v3/playdigital', `${name}.json`),
      'utf8',
    ),
  );
}
type Card = Parameters<typeof playdigitalListingHash>[0];
const cards: Card[] = fixture('cards');
const jetsmart = fixture('v2-jetsmart');
jetsmart.offers[0].requirements.banks.list = ['macro-id', 'galicia-id'];
const banks: BankRef[] = [
  { slug: 'macro', name: 'Macro', playdigitalId: 'macro-id' },
  { slug: 'galicia', name: 'Galicia', playdigitalId: 'galicia-id' },
];
const now = new Date('2026-10-31T12:00:00Z');
function page(rows: unknown[], n = 1, pages = 1, total = rows.length) {
  return {
    data: { cards: rows },
    metadata: {
      pagination: { page: n, total_pages: pages, total_results: total },
    },
  };
}
function context(
  handler: (url: string) => unknown | Promise<unknown>,
): AdapterContext {
  return {
    now,
    knownDetails: new Map(),
    pacing: { minIntervalMs: 0, timeoutMs: 1000, retries: 0 },
    fetchImpl: vi.fn(async (url) => Response.json(await handler(String(url)))),
  };
}
function known(
  card = cards[0],
  detail: unknown = jetsmart,
  age = 0,
): KnownDetail {
  return {
    detail,
    listingHash: playdigitalListingHash(card),
    fetchedAt: new Date(now.getTime() - age),
  };
}

describe('PlayDigital adapter', () => {
  it.each(['FINISHED', 'FINISHED_FOR_PRODUCT'])(
    'observes %s listings without fetching or reusing detail',
    async (status) => {
      const card = { ...cards[0], calculated_status: status };
      const ctx = context(() => page([card]));
      ctx.knownDetails.set(card.promo_id!, known(card));
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(ctx.fetchImpl).toHaveBeenCalledTimes(1);
      expect(run.observedExternalIds).toContain(card.promo_id);
      expect(run.listings[0]).toMatchObject({
        terms: null,
        unpublishableReason: 'finished',
        raw: { detail: null },
        detailFetchedAt: null,
      });
      expect(run.complete).toBe(true);
      expect(run.outcome).toBe('ok');
    },
  );

  it.each(['2026-10-30', '2026-10-31T02:59:59Z'])(
    'skips a running listing with past Argentina stop date %s',
    async (stop_date) => {
      const card = { ...cards[0], calculated_status: 'RUNNING', stop_date };
      const ctx = context(() => page([card]));
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(ctx.fetchImpl).toHaveBeenCalledTimes(1);
      expect(run.listings[0].unpublishableReason).toBe('finished');
      expect(run.complete).toBe(true);
    },
  );

  it.each(['NEXT_FOR_PRODUCT', 'AWAITING', 'UNKNOWN', 'unexpected', null])(
    'fetches status %s and does not spend budget on finished rows',
    async (status) => {
      const finished = {
        ...cards[0],
        promo_id: 'finished',
        calculated_status: 'FINISHED',
      };
      const active = {
        ...cards[0],
        calculated_status: status,
        stop_date: '2026-10-31',
      };
      const ctx = context((url) =>
        url.includes('/benefit/') ? jetsmart : page([finished, active]),
      );
      ctx.maxDetailFetches = 1;
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(ctx.fetchImpl).toHaveBeenCalledTimes(2);
      expect(run.listings[0].unpublishableReason).toBe('finished');
      expect(run.listings[1].terms).not.toBeNull();
      expect(run.observedExternalIds).toEqual(['finished', active.promo_id]);
      expect(run.complete).toBe(true);
    },
  );

  it.each([null, 'not-a-date', '2026-02-30', 42])(
    'fetches when stop_date is missing or malformed: %s',
    async (stop_date) => {
      const card = { ...cards[0], stop_date, calculated_status: 42 };
      const ctx = context((url) =>
        url.includes('/benefit/') ? jetsmart : page([card]),
      );
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(ctx.fetchImpl).toHaveBeenCalledTimes(2);
      expect(run.listings[0].terms).not.toBeNull();
    },
  );
  it.each([0, 1])(
    'never reuses a wrong-ID same-hash cache; refresh budget %s',
    async (budget) => {
      const ctx = context((url) =>
        url.includes('/benefit/') ? jetsmart : page([cards[0]]),
      );
      ctx.knownDetails.set(
        cards[0].promo_id!,
        known(cards[0], { ...jetsmart, id: 'wrong' }),
      );
      ctx.maxDetailFetches = budget;
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(run.listings[0].terms === null).toBe(budget === 0);
      expect(run.listings[0].detailStale).toBe(budget === 0);
      if (!budget)
        expect(run.listings[0].unpublishableReason).toContain('id mismatch');
    },
  );

  it.each(['fetched', 'cached'])(
    'keeps inactive %s details visible but unpublishable',
    async (source) => {
      const detail = { ...jetsmart, real_status: 'FINISHED' };
      const ctx = context((url) =>
        url.includes('/benefit/') ? detail : page([cards[0]]),
      );
      if (source === 'cached')
        ctx.knownDetails.set(cards[0].promo_id!, known(cards[0], detail));
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(run.listings).toHaveLength(1);
      expect(run.listings[0].terms).toBeNull();
      expect(run.listings[0].unpublishableReason).toContain(
        'not running: FINISHED',
      );
      expect(run.complete).toBe(false);
    },
  );
  it.each([
    ['Selecta Nivel 2', ['selecta-2']],
    ['YPF Selecta', ['selecta-1', 'selecta-2', 'selecta-3', 'selecta-4']],
    ['macroplatinum', ['platinum']],
    ['Private Bank Black', ['private-black']],
    ['Private Bank Infinite', ['private-infinite']],
    ['signature', null],
  ])(
    'preserves listing tier restrictions with v2 detail: %s',
    async (signal, codes) => {
      const card = {
        ...cards[0],
        title: String(signal),
        slug: String(signal),
        search_tags: '',
      };
      const ctx = context(() => page([card]));
      ctx.knownDetails.set(card.promo_id!, known(card, jetsmart));
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(run.listings[0].tiers?.codes ?? null).toEqual(codes);
      if (codes)
        expect(JSON.stringify(run.listings[0].terms?.eligibility)).toContain(
          'providerFact',
        );
      else
        expect(run.listings[0].terms?.unresolved).toContain(
          'unknown tier signal',
        );
    },
  );

  it('never treats an unavailable HTTP 400 detail as successful', async () => {
    const ctx = context(() => page([cards[0]]));
    ctx.fetchImpl = vi.fn(async (url) =>
      String(url).includes('/benefit/')
        ? Response.json(
            { message: 'promotion unavailable', status: 'undefined' },
            { status: 400 },
          )
        : Response.json(page([cards[0]])),
    );
    ctx.saveDetail = vi.fn(async () => {});
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    expect(run.complete).toBe(false);
    expect(run.listings[0].terms).toBeNull();
    expect(ctx.saveDetail).not.toHaveBeenCalled();
    expect(run.anomalies[0].detail).toContain('HTTP 400');
  });
  it('invalidates same-hash legacy cache within budget and persists only v2', async () => {
    for (const budget of [0, 1]) {
      const ctx = context((url) =>
        url.includes('/benefit/') ? jetsmart : page([cards[0]]),
      );
      ctx.knownDetails.set(
        cards[0].promo_id!,
        known(cards[0], fixture('jetsmart-detail')),
      );
      ctx.maxDetailFetches = budget;
      ctx.saveDetail = vi.fn(async () => {});
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(ctx.saveDetail).toHaveBeenCalledTimes(budget);
      expect(run.listings[0].detailStale).toBe(budget === 0);
      expect(run.listings[0].terms === null).toBe(budget === 0);
    }
  });

  it('rejects wrong v2 detail identity and reports concise schema paths', async () => {
    for (const detail of [
      { ...jetsmart, id: 'wrong' },
      {
        ...jetsmart,
        conditions: {
          ...jetsmart.conditions,
          schedule: { ...jetsmart.conditions.schedule, days_of_week: 42 },
        },
      },
    ]) {
      const ctx = context((url) =>
        url.includes('/benefit/') ? detail : page([cards[0]]),
      );
      ctx.saveDetail = vi.fn(async () => {});
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(ctx.saveDetail).not.toHaveBeenCalled();
      expect(run.listings[0].terms).toBeNull();
      expect(run.anomalies[0].detail).toMatch(
        /id mismatch|conditions.schedule.days_of_week/,
      );
    }
  });
  it.each(['refresh', 'budget', 'failure'])(
    'reassesses a later bank hash: %s',
    async (scenario) => {
      const changed = { ...cards[0], title: 'Changed offer' };
      const ctx = context((url) => {
        if (url.includes('/benefit/')) {
          if (scenario === 'failure') throw new Error('offline');
          return jetsmart;
        }
        return page([url.includes('galicia-id') ? changed : cards[0]]);
      });
      const cached = known(cards[0], jetsmart, 86400_000);
      ctx.knownDetails.set(cards[0].promo_id!, cached);
      ctx.maxDetailFetches = scenario === 'budget' ? 0 : 1;
      ctx.saveDetail = vi.fn(async () => {});
      const runs = await playdigitalAdapter.run(ctx, banks);
      expect(runs[0].listings[0].detailStale).toBe(false);
      expect(runs[1].listings[0].detailStale).toBe(scenario !== 'refresh');
      expect(runs[1].listings[0].detailFetchedAt).toEqual(
        scenario === 'refresh' ? now : cached.fetchedAt,
      );
      expect(runs[1].listings[0].terms).not.toBeNull();
      expect(runs[1].complete).toBe(scenario === 'refresh');
      expect(
        vi
          .mocked(ctx.fetchImpl)
          .mock.calls.filter(([url]) => String(url).includes('/benefit/')),
      ).toHaveLength(scenario === 'budget' ? 0 : 1);
      if (scenario === 'refresh')
        expect(ctx.saveDetail).toHaveBeenCalledWith(
          cards[0].promo_id,
          expect.objectContaining({
            listingHash: playdigitalListingHash(changed),
          }),
        );
      if (scenario === 'failure')
        expect(runs[1].anomalies).toContainEqual(
          expect.objectContaining({ kind: 'detail_failed' }),
        );
    },
  );

  it('bounds later hash refreshes by the shared budget', async () => {
    const ctx = context((url) =>
      url.includes('/benefit/')
        ? jetsmart
        : page([
            { ...cards[0], title: url.includes('galicia-id') ? 'H2' : 'H1' },
          ]),
    );
    ctx.maxDetailFetches = 1;
    const runs = await playdigitalAdapter.run(ctx, banks);
    expect(runs[0].listings[0].detailStale).toBe(false);
    expect(runs[1].listings[0].detailStale).toBe(true);
    expect(runs[1].listings[0].detailFetchedAt).toEqual(now);
    expect(
      vi
        .mocked(ctx.fetchImpl)
        .mock.calls.filter(([url]) => String(url).includes('/benefit/')),
    ).toHaveLength(1);
  });

  it('emits raw placeholders for malformed stable IDs, never invented IDs', async () => {
    const rows = [
      { promo_id: 'broken', title: 42 },
      { id: 'fallback', credit_list: 42 },
      { promo_id: '', title: 42 },
      { title: 42 },
    ];
    const ctx = context(() => page(rows));
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    expect(run.observedExternalIds).toEqual(['broken', 'fallback']);
    expect(run.listings).toHaveLength(2);
    expect(run.listings.map((l) => l.raw.listing)).toEqual(rows.slice(0, 2));
    expect(
      run.listings.every(
        (l) => !l.terms && l.unpublishableReason && l.bankSlugs[0] === 'macro',
      ),
    ).toBe(true);
    expect(run.outcome).toBe('partial');
    expect(run.complete).toBe(false);
    expect(ctx.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    'totals drift',
    'pages drift',
    'empty',
    'repeated',
    'wrong page',
    'limit',
  ])('stops unsafe pagination: %s', async (scenario) => {
    const ctx = context((url) => {
      const n = Number(new URL(url).searchParams.get('page'));
      if (n === 1)
        return page([cards[0]], 1, scenario === 'limit' ? 1001 : 3, 3);
      if (scenario === 'totals drift') return page([cards[1]], 2, 3, 4);
      if (scenario === 'pages drift') return page([cards[1]], 2, 4, 3);
      if (scenario === 'empty') return page([], 2, 3, 3);
      if (scenario === 'wrong page') return page([cards[1]], 1, 3, 3);
      return page([cards[0]], 2, 3, 3);
    });
    ctx.maxDetailFetches = 0;
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    expect(ctx.fetchImpl).toHaveBeenCalledTimes(scenario === 'limit' ? 1 : 2);
    expect(run.totalReported).toBe(3);
    expect(run.outcome).toBe('partial');
    expect(run.complete).toBe(false);
    expect(run.error).toMatch(/pagination/);
  });

  it('accepts only genuinely empty catalogs', async () => {
    for (const total of [0, 1]) {
      const ctx = context(() => page([], 1, 1, total));
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(run.complete).toBe(total === 0);
      expect(run.outcome).toBe(total === 0 ? 'ok' : 'partial');
      expect(ctx.fetchImpl).toHaveBeenCalledTimes(1);
    }
  });
  it('lists real bank names with deterministic slugs and explicit overrides', async () => {
    const ctx = context(() => fixture('banks'));
    const result = await playdigitalAdapter.listBanks!(ctx);
    expect(result.find((b) => b.slug === 'macro')?.playdigitalId).toBe(
      '6a089c91-a7d3-4199-a578-2132a3733f69',
    );
    expect(result.find((b) => b.slug === 'galicia')?.playdigitalId).toBe(
      '88d8705e-2dda-46f9-8411-bb4916af858e',
    );
    expect(playdigitalBankSlug('Banco Galicia')).toBe('galicia');
    expect(playdigitalBankSlug('Banco Macro')).toBe('macro');
    expect(playdigitalBankSlug(' Banco Nación ')).toBe('banco-nacion');
  });

  it('paginates, counts before dedupe, observes malformed ids and shares detail across banks', async () => {
    const ctx = context((url) => {
      if (url.includes('/benefit/'))
        return {
          ...jetsmart,
          id: decodeURIComponent(new URL(url).pathname.split('/').at(-1)!),
        };
      const query = new URL(url).searchParams;
      if (query.get('banks') === 'galicia-id') return page([cards[0]]);
      return query.get('page') === '1'
        ? page([cards[0], cards[0]], 1, 2, 3)
        : page([{ id: 'unmapped', title: 42 }], 2, 2, 3);
    });
    ctx.saveDetail = vi.fn(async () => {});
    const runs = await playdigitalAdapter.run(ctx, banks);
    expect(runs[0].rawRowCount).toBe(3);
    expect(runs[0].totalReported).toBe(3);
    expect(runs[0].observedExternalIds).toEqual([
      cards[0].promo_id,
      'unmapped',
    ]);
    expect(runs[0].listings).toHaveLength(2);
    expect(runs[0].complete).toBe(false);
    expect(runs[1].listings[0].bankSlugs).toEqual(['galicia']);
    expect(JSON.stringify(runs[1].listings[0].terms?.eligibility)).toContain(
      'galicia',
    );
    expect(
      JSON.stringify(runs[1].listings[0].terms?.eligibility),
    ).not.toContain('macro');
    expect(
      vi
        .mocked(ctx.fetchImpl)
        .mock.calls.filter(([url]) => String(url).includes('/benefit/')),
    ).toHaveLength(1);
    expect(ctx.saveDetail).toHaveBeenCalledTimes(1);
  });

  it('hash ignores bank membership and volatile presentation, retains meaningful card changes', () => {
    const original = cards[0];
    const changed: Card = {
      ...original,
      banks: ['another-bank'],
      status: 'other',
      id: 'other',
      content: {
        row: original.content!.row.map((r, i) =>
          i === 5 ? { text: 'Galicia' } : r,
        ),
      },
    };
    expect(playdigitalListingHash(changed)).toBe(
      playdigitalListingHash(original),
    );
    expect(
      playdigitalListingHash({ ...original, title: 'different' }),
    ).not.toBe(playdigitalListingHash(original));
  });

  it('skips fresh cache and narrows banks', async () => {
    const ctx = context(() => page([cards[0]]));
    ctx.knownDetails.set(cards[0].promo_id!, known());
    ctx.bankSlugs = ['macro'];
    const runs = await playdigitalAdapter.run(ctx, banks);
    expect(runs).toHaveLength(1);
    expect(ctx.fetchImpl).toHaveBeenCalledTimes(1);
    expect(runs[0].listings[0].detailStale).toBe(false);
    expect(runs[0].complete).toBe(true);
  });

  it.each(['age', 'hash'])(
    'refreshes detail on %s and saves incrementally',
    async (reason) => {
      const ctx = context((url) =>
        url.includes('/benefit/') ? jetsmart : page([cards[0]]),
      );
      const cached = known(
        cards[0],
        jetsmart,
        reason === 'age' ? 8 * 86400_000 : 0,
      );
      if (reason === 'hash') cached.listingHash = 'old';
      ctx.knownDetails.set(cards[0].promo_id!, cached);
      ctx.saveDetail = vi.fn(async () => {});
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(ctx.fetchImpl).toHaveBeenCalledTimes(2);
      expect(ctx.saveDetail).toHaveBeenCalledTimes(1);
      expect(run.listings[0].detailFetchedAt).toEqual(now);
      expect(run.listings[0].detailStale).toBe(false);
    },
  );

  it('uses a run-wide budget, retaining stale cache or pending listings', async () => {
    const ctx = context(() => page([cards[0], cards[1]]));
    ctx.maxDetailFetches = 0;
    const cached = known(cards[0], jetsmart, 8 * 86400_000);
    ctx.knownDetails.set(cards[0].promo_id!, cached);
    const runs = await playdigitalAdapter.run(ctx, banks);
    expect(ctx.fetchImpl).toHaveBeenCalledTimes(2);
    expect(runs[0].listings[0].terms).not.toBeNull();
    expect(runs[0].listings[0].detailStale).toBe(true);
    expect(runs[0].listings[0].detailFetchedAt).toEqual(cached.fetchedAt);
    expect(runs[0].listings[1].terms).toBeNull();
    expect(runs[0].listings[1].unpublishableReason).toBe('detail pending');
    expect(runs.every((r) => r.outcome === 'partial' && !r.complete)).toBe(
      true,
    );
  });

  it('shares a positive detail budget across banks, not once per bank', async () => {
    const ctx = context((url) =>
      url.includes('/benefit/') ? jetsmart : page([cards[0], cards[1]]),
    );
    ctx.maxDetailFetches = 1;
    const runs = await playdigitalAdapter.run(ctx, banks);
    expect(
      vi
        .mocked(ctx.fetchImpl)
        .mock.calls.filter(([url]) => String(url).includes('/benefit/')),
    ).toHaveLength(1);
    expect(
      runs.every(
        (r) => r.listings[0].terms && !r.listings[1].terms && !r.complete,
      ),
    ).toBe(true);
  });

  it('keeps never-fetched details pending after a failed first fetch', async () => {
    const ctx = context((url) => {
      if (url.includes('/benefit/')) throw new Error('offline');
      return page([cards[0]]);
    });
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    expect(run.listings[0].terms).toBeNull();
    expect(run.listings[0].detailFetchedAt).toBeNull();
    expect(run.outcome).toBe('partial');
    expect(run.complete).toBe(false);
    expect(run.anomalies[0].kind).toBe('detail_failed');
  });

  it('retains previous detail and successful timestamp on failed refresh', async () => {
    const ctx = context((url) => {
      if (url.includes('/benefit/')) throw new Error('offline');
      return page([cards[0]]);
    });
    const cached = known(cards[0], jetsmart, 8 * 86400_000);
    ctx.knownDetails.set(cards[0].promo_id!, cached);
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    expect(run.listings[0].terms).not.toBeNull();
    expect(run.listings[0].raw.detail).toEqual(jetsmart);
    expect(run.listings[0].detailFetchedAt).toEqual(cached.fetchedAt);
    expect(run.listings[0].detailStale).toBe(true);
    expect(run.anomalies).toContainEqual(
      expect.objectContaining({ kind: 'detail_failed' }),
    );
  });

  it('refuses complete status for mismatched pagination totals or page numbers', async () => {
    for (const data of [page([cards[0]], 1, 1, 2), page([], 2, 2, 0)]) {
      const ctx = context(() => data);
      ctx.knownDetails.set(cards[0].promo_id!, known());
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(run.complete).toBe(false);
      expect(run.error).not.toBeNull();
    }
  });
});
