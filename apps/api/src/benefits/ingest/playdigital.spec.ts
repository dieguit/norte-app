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
const jetsmart = fixture('jetsmart-detail');
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
function detailFor(card: Card) {
  return {
    promotion: {
      title: card.title,
      slug: card.slug,
      payment_flow: card.payment_flow,
      start_date: card.start_date,
      stop_date: card.stop_date,
      days_of_week: card.days_of_week,
    },
    trigger_params: {
      pct_promo_value: 30,
      promo_value_type: 'percent',
      credit_list: ['visa'],
      debit_list: ['master'],
      cap_amount: 20000,
      cap_period: 'month',
      cap_type: 'card',
      min_amount: 1000,
      installments: [3, 6],
    },
  };
}

describe('PlayDigital adapter', () => {
  it.each(['refresh', 'budget', 'failure'])(
    'reassesses a later bank hash: %s',
    async (scenario) => {
      const changed = { ...cards[0], title: 'Changed offer' };
      const ctx = context((url) => {
        if (url.includes('/landing/')) {
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
          .mock.calls.filter(([url]) => String(url).includes('/landing/')),
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
      url.includes('/landing/')
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
        .mock.calls.filter(([url]) => String(url).includes('/landing/')),
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
  it('maps verified source network aliases before assessing completeness', async () => {
    const card = {
      ...cards[3],
      title: 'Manso',
      slug: 'manso',
      search_tags: '',
    };
    const detail = detailFor(card);
    detail.trigger_params.credit_list = [
      'american_express',
      'master',
      'visa',
      'cabal',
    ];
    detail.trigger_params.debit_list = ['master', 'visa'];
    const ctx = context(() => page([card]));
    ctx.knownDetails.set(card.promo_id!, known(card, detail));
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    const terms = run.listings[0].terms!;
    expect(terms.eligibilityCompleteness).toBe('complete');
    expect(terms.unresolved).toEqual([]);
    expect(terms.eligibility).toMatchObject({
      allOf: [
        {
          anyOf: [
            {
              card: {
                issuerProviderSlugs: ['macro'],
                network: 'amex',
                types: ['credit'],
              },
            },
            {
              card: {
                issuerProviderSlugs: ['macro'],
                network: 'mastercard',
                types: ['credit'],
              },
            },
            {
              card: {
                issuerProviderSlugs: ['macro'],
                network: 'visa',
                types: ['credit'],
              },
            },
            {
              card: {
                issuerProviderSlugs: ['macro'],
                network: 'cabal',
                types: ['credit'],
              },
            },
            {
              card: {
                issuerProviderSlugs: ['macro'],
                network: 'mastercard',
                types: ['debit'],
              },
            },
            {
              card: {
                issuerProviderSlugs: ['macro'],
                network: 'visa',
                types: ['debit'],
              },
            },
          ],
        },
      ],
    });
  });

  it.each(['dinners_club', 'maestro', 'confiable'])(
    'retains genuinely unsupported network %s as unresolved',
    async (network) => {
      const card = {
        ...cards[3],
        title: 'Manso',
        slug: 'manso',
        search_tags: '',
      };
      const detail = detailFor(card);
      detail.trigger_params.credit_list = [
        'american_express',
        'master',
        network,
      ];
      const ctx = context(() => page([card]));
      ctx.knownDetails.set(card.promo_id!, known(card, detail));
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      const terms = run.listings[0].terms!;
      expect(terms.eligibilityCompleteness).toBe('incomplete');
      expect(terms.unresolved).toEqual([
        `unsupported credit network: ${network}`,
      ]);
      expect(CampaignTermsSchema.safeParse(terms).success).toBe(true);
    },
  );

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
      if (url.includes('/landing/')) return jetsmart;
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
        .mock.calls.filter(([url]) => String(url).includes('/landing/')),
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
        url.includes('/landing/') ? jetsmart : page([cards[0]]),
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
      url.includes('/landing/') ? jetsmart : page([cards[0], cards[1]]),
    );
    ctx.maxDetailFetches = 1;
    const runs = await playdigitalAdapter.run(ctx, banks);
    expect(
      vi
        .mocked(ctx.fetchImpl)
        .mock.calls.filter(([url]) => String(url).includes('/landing/')),
    ).toHaveLength(1);
    expect(
      runs.every(
        (r) => r.listings[0].terms && !r.listings[1].terms && !r.complete,
      ),
    ).toBe(true);
  });

  it('keeps never-fetched details pending after a failed first fetch', async () => {
    const ctx = context((url) => {
      if (url.includes('/landing/')) throw new Error('offline');
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
      if (url.includes('/landing/')) throw new Error('offline');
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

  it('maps Selecta Nivel 2, all Selecta levels, macroplatinum and unknown segment conservatively', async () => {
    const ctx = context(() => page(cards.slice(1, 5)));
    for (const card of cards.slice(1, 5))
      ctx.knownDetails.set(card.promo_id!, known(card, detailFor(card)));
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    expect(run.listings.map((l) => l.tiers?.codes ?? null)).toEqual([
      ['selecta-2'],
      ['selecta-1', 'selecta-2', 'selecta-3', 'selecta-4'],
      ['platinum'],
      null,
    ]);
    expect(run.listings[3].terms?.eligibilityCompleteness).toBe('incomplete');
    expect(run.listings[3].terms?.unresolved).toContain('unknown tier signal');
    expect(run.anomalies).toContainEqual(
      expect.objectContaining({ kind: 'unknown_tier_signal' }),
    );
    expect(run.listings[0].terms?.eligibility).toEqual({
      allOf: [
        {
          anyOf: [
            {
              card: {
                issuerProviderSlugs: ['macro'],
                network: 'visa',
                types: ['credit'],
              },
            },
            {
              card: {
                issuerProviderSlugs: ['macro'],
                network: 'mastercard',
                types: ['debit'],
              },
            },
          ],
        },
        {
          providerFact: {
            providerSlug: 'macro',
            key: 'tier',
            values: ['selecta-2'],
          },
        },
      ],
    });
    expect(run.listings[0].terms?.caps).toEqual([
      { amountMinor: 2000000, period: 'month', scope: 'card' },
    ]);
    expect(run.listings[0].terms?.offers).toContainEqual({
      kind: 'installments',
      count: 6,
      upTo: true,
    });
  });

  it.each([
    ['macroprivatebankblack', ['private-black'], 'complete'],
    ['Private Bank Infinite', ['private-infinite'], 'complete'],
    ['signature', null, 'incomplete'],
    ['infinite', null, 'incomplete'],
    [
      'Selecta Nivel 9',
      ['selecta-1', 'selecta-2', 'selecta-3', 'selecta-4'],
      'incomplete',
    ],
    [
      'Selecta Signature',
      ['selecta-1', 'selecta-2', 'selecta-3', 'selecta-4'],
      'incomplete',
    ],
  ])(
    'requires contextual Macro tiers: %s',
    async (signal, codes, completeness) => {
      const card: Card = {
        ...cards[3],
        slug: String(signal),
        title: String(signal),
        search_tags: '',
      };
      const ctx = context(() => page([card]));
      ctx.knownDetails.set(card.promo_id!, known(card, detailFor(card)));
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(run.listings[0].tiers?.codes ?? null).toEqual(codes);
      expect(run.listings[0].terms?.eligibilityCompleteness).toBe(completeness);
    },
  );

  it('refuses complete status for mismatched pagination totals or page numbers', async () => {
    for (const data of [page([cards[0]], 1, 1, 2), page([], 2, 2, 0)]) {
      const ctx = context(() => data);
      ctx.knownDetails.set(cards[0].promo_id!, known());
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(run.complete).toBe(false);
      expect(run.error).not.toBeNull();
    }
  });

  it('validates three real details; zero cap/minimum stay unknown and MODO needs payment evidence', async () => {
    const selected = [cards[0], cards[5], cards[6]];
    const ctx = context(() => page(selected));
    for (const [i, name] of ['jetsmart', 'anonima', 'third'].entries())
      ctx.knownDetails.set(
        selected[i].promo_id!,
        known(selected[i], fixture(`${name}-detail`)),
      );
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    for (const listing of run.listings) {
      expect(CampaignTermsSchema.safeParse(listing.terms).success).toBe(true);
      expect(JSON.stringify(listing.terms?.eligibility)).toContain(
        '"instrumentSlug":"modo"',
      );
    }
    const first = run.listings[0];
    expect(first.terms?.capState).toBe('unknown');
    expect(first.terms?.caps).toEqual([]);
    expect(first.terms?.warnings[0]).toContain('unconfirmed');
    expect(first.terms?.minimumSpendMinor).toBeNull();
    expect(first.terms?.offers[0]).toEqual({
      kind: 'percent',
      percentageBps: 2500,
      mode: 'cashback',
    });
    expect(first.terms?.validity.to).toBe('2026-11-06');
    expect(first.rawCategories).toEqual(['pd:14/7', 'pd:14/31', 'pd:14']);
    expect(first.brandName).toBe('JetsMART');
    expect(run.listings[1].terms?.channels).not.toContain('online');
  });

  it.each(['cashback', 'discount', 'unspecified'] as const)(
    'maps %s evidence without assuming MODO',
    async (mode) => {
      const card = {
        ...cards[3],
        content: {
          row: [
            { text: '20% en Manso' },
            {
              text:
                mode === 'cashback'
                  ? 'reintegro'
                  : mode === 'discount'
                    ? 'descuento'
                    : 'ahorro',
            },
          ],
        },
      };
      const detail = detailFor(card);
      const ctx = context(() => page([card]));
      ctx.knownDetails.set(card.promo_id!, known(card, detail));
      const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
      expect(run.listings[0].terms?.offers[0]).toEqual({
        kind: 'percent',
        percentageBps: 3000,
        mode,
      });
      expect(JSON.stringify(run.listings[0].terms?.eligibility)).not.toContain(
        'membership',
      );
      expect(run.listings[0].brandName).toBe('Manso');
    },
  );

  it('isolates invalid terms and does not lose observed ids', async () => {
    const detail = detailFor(cards[0]);
    detail.trigger_params.pct_promo_value = 999;
    const ctx = context(() => page([cards[0]]));
    ctx.knownDetails.set(cards[0].promo_id!, known(cards[0], detail));
    const [run] = await playdigitalAdapter.run(ctx, [banks[0]]);
    expect(run.listings[0].terms).toBeNull();
    expect(run.listings[0].unpublishableReason).toContain('invalid terms');
    expect(run.observedExternalIds).toEqual([cards[0].promo_id]);
    expect(run.outcome).toBe('partial');
  });
});
