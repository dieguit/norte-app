import { createHash } from 'node:crypto';
import { z } from 'zod';
import { todayInArgentina } from '../../argentina-time';
import { createPacedJsonFetch } from './http';
import { ALLOWED_BANKS } from './tiers';
import {
  playdigitalDetailSchema,
  mapPlaydigitalDetail,
  playdigitalAudiences,
  detailError,
} from './playdigital-detail';
import type {
  Adapter,
  AdapterContext,
  AdapterRun,
  BankRef,
  KnownDetail,
  NormalizedListing,
} from './types';

const root = 'https://rewards-handler.playdigital.com.ar';
const clients = new WeakMap<
  AdapterContext,
  ReturnType<typeof createPacedJsonFetch>
>();
function client(ctx: AdapterContext) {
  let fetchJson = clients.get(ctx);
  if (!fetchJson) {
    fetchJson = createPacedJsonFetch(ctx);
    clients.set(ctx, fetchJson);
  }
  return fetchJson;
}

const promotionSchema = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    search_tags: z.string().nullish(),
    payment_flow: z.string().nullish(),
    where: z.string().nullish(),
    start_date: z.string().optional(),
    stop_date: z.string().nullish().catch(undefined),
    calculated_status: z.string().nullish().catch(undefined),
    days_of_week: z.string().optional(),
    credit_list: z.array(z.string().nullable()).nullish(),
    debit_list: z.array(z.string().nullable()).nullish(),
  })
  .passthrough();
const cardSchema = promotionSchema.extend({
  id: z.string().trim().min(1).optional(),
  promo_id: z.string().trim().min(1).optional(),
  extra_params: z
    .object({ promo_id: z.string().trim().min(1).optional() })
    .nullish(),
  content: z
    .object({
      row: z.array(z.object({ text: z.string().nullable().optional() })),
    })
    .optional(),
  categories_whitelist: z
    .object({
      categories: z.array(
        z.object({
          map_category: z.union([z.number(), z.string()]),
          sub_categories: z.array(z.number()).optional(),
        }),
      ),
    })
    .nullish(),
});
type Card = z.infer<typeof cardSchema>;
export function playdigitalBankSlug(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return (
    (
      {
        'banco-galicia': 'galicia',
        galicia: 'galicia',
        'banco-macro': 'macro',
        macro: 'macro',
      } as Record<string, string>
    )[slug] ?? slug
  );
}

// Only semantic card content participates; presentation, membership and status change independently of terms.
export function playdigitalListingHash(card: Card): string {
  const keys = [
    'promo_id',
    'slug',
    'title',
    'search_tags',
    'payment_flow',
    'start_date',
    'stop_date',
    'days_of_week',
    'where',
    'credit_list',
    'debit_list',
    'categories_whitelist',
    'short_description',
  ];
  const content = Object.fromEntries(keys.map((key) => [key, card[key]]));
  content.rows = card.content?.row.slice(0, 5).map((row) => row.text);
  return createHash('sha256')
    .update(
      JSON.stringify(content, (_key, value: unknown) => {
        if (value && typeof value === 'object' && !Array.isArray(value))
          return Object.fromEntries(
            Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
          );
        return value;
      }),
    )
    .digest('hex');
}

function rawCategories(
  card: Card,
  run: AdapterRun,
  externalId: string,
): string[] {
  return [
    ...new Set(
      (card.categories_whitelist?.categories ?? []).flatMap((cat) => {
        if (
          typeof cat.map_category === 'string' &&
          !/^\d+$/.test(cat.map_category)
        ) {
          run.anomalies.push({
            kind: 'unmapped_category',
            externalId,
            detail: cat.map_category,
          });
          return [];
        }
        const category = Number(cat.map_category);
        return [
          ...(cat.sub_categories ?? []).map((sub) => `pd:${category}/${sub}`),
          `pd:${category}`,
        ];
      }),
    ),
  ];
}

function brandName(card: Card, title: string): string | null {
  const brand = (card.content?.row[0]?.text ?? title)
    .replace(/^(?:hasta\s+)?\d+%\s*(?:de\s+\w+\s+)?(?:en\s+)?/i, '')
    .trim();
  return !brand || /comercios adheridos|bancos adheridos/i.test(brand)
    ? null
    : brand;
}

function listingIdentity(card: Card) {
  const externalId = card.promo_id ?? card.extra_params?.promo_id ?? card.id!;
  const title = card.title ?? card.content?.row[0]?.text ?? externalId;
  return { externalId, title };
}

function mapListing(
  card: Card,
  bank: BankRef,
  known: KnownDetail | undefined,
  stale: boolean,
  run: AdapterRun,
): NormalizedListing {
  const { externalId, title } = listingIdentity(card);
  const { detail = null, fetchedAt = null } = known ?? {};
  const listing: NormalizedListing = {
    source: 'playdigital',
    externalId,
    bankSlugs: [bank.slug],
    title,
    brandName: brandName(card, title),
    sourceBrandId: null,
    rawCategories: rawCategories(card, run, externalId),
    tiers: null,
    rawTierSignal: null,
    terms: null,
    unpublishableReason: 'detail pending',
    verify: {
      url: `https://www.modo.com.ar/promos/${card.slug ?? externalId}`,
      hint: null,
    },
    listingHash: playdigitalListingHash(card),
    raw: { listing: card, detail },
    detailFetchedAt: fetchedAt,
    detailStale: stale,
  };
  if (!known) return listing;
  if (known.listingHash !== listing.listingHash) {
    listing.unpublishableReason = 'detail outdated';
    run.anomalies.push({
      kind: 'unparsed_offer',
      externalId,
      detail: listing.unpublishableReason,
    });
    return listing;
  }
  applyDetail(listing, known, bank, run);
  return listing;
}

function applyDetail(
  listing: NormalizedListing,
  known: KnownDetail,
  bank: BankRef,
  run: AdapterRun,
) {
  try {
    validateDetail(known.detail, listing.externalId);
    listing.terms = mapPlaydigitalDetail(known.detail, bank);
    const { codes, unknown } = playdigitalAudiences(known.detail, bank);
    listing.tiers = codes.length ? { bankSlug: bank.slug, codes } : null;
    listing.rawTierSignal = [...codes, ...unknown].join(', ') || null;
    if (unknown.length)
      run.anomalies.push({
        kind: 'unknown_audience',
        externalId: listing.externalId,
        detail: unknown.join(', '),
      });
    listing.unpublishableReason = null;
  } catch (error) {
    listing.unpublishableReason = String(error).slice(0, 1200);
    run.anomalies.push({
      kind: 'unparsed_offer',
      externalId: listing.externalId,
      detail: listing.unpublishableReason,
    });
  }
}

export const DETAIL_TTL_MS = 7 * 86400_000;

function detailNeedsRefresh(
  known: KnownDetail | undefined,
  listingHash: string,
  now: Date,
): boolean {
  return (
    !known ||
    known.listingHash !== listingHash ||
    now.getTime() - known.fetchedAt.getTime() > DETAIL_TTL_MS
  );
}

function validateDetail(detail: unknown, externalId: string) {
  const parsed = playdigitalDetailSchema.safeParse(detail);
  if (!parsed.success)
    throw new Error('invalid v2 detail: ' + detailError(parsed.error));
  if (parsed.data.id !== externalId) throw new Error('v2 detail id mismatch');
}

async function fetchDetail(
  ctx: AdapterContext,
  externalId: string,
  listingHash: string,
): Promise<KnownDetail> {
  const detail = await client(ctx)(
    `https://www.modo.com.ar/promos/api/rewards/v2/benefit/${encodeURIComponent(externalId)}`,
  );
  const refreshed = { listingHash, fetchedAt: ctx.now, detail };
  await ctx.saveDetail?.(externalId, refreshed);
  return refreshed;
}

function detailCache(ctx: AdapterContext) {
  const details = new Map<
    string,
    {
      known?: KnownDetail;
      stale: boolean;
      failed?: string;
      attemptedHash: string;
    }
  >();
  let fetched = 0;
  return async (externalId: string, card: Card) => {
    const existing = details.get(externalId);
    const listingHash = playdigitalListingHash(card);
    let known = ctx.knownDetails.get(externalId);
    if (existing) {
      if (existing.attemptedHash === listingHash) return existing;
      if (existing.known) known = existing.known;
    }
    let stale = detailNeedsRefresh(known, listingHash, ctx.now);
    let failed: string | undefined;
    if (stale && fetched < (ctx.maxDetailFetches ?? 2000)) {
      fetched++;
      try {
        known = await fetchDetail(ctx, externalId, listingHash);
        stale = false;
      } catch (error) {
        failed = String(error);
      }
    }
    const result = { known, stale, failed, attemptedHash: listingHash };
    details.set(externalId, result);
    return result;
  };
}

function observedId(raw: unknown): string | undefined {
  const id = z
    .object({
      promo_id: z.string().trim().min(1).nullish().catch(undefined),
      id: z.string().trim().min(1).nullish().catch(undefined),
      extra_params: z
        .object({
          promo_id: z.string().trim().min(1).nullish().catch(undefined),
        })
        .nullish()
        .catch(undefined),
    })
    .safeParse(raw);
  if (!id.success) return undefined;
  return (
    id.data.promo_id ??
    id.data.extra_params?.promo_id ??
    id.data.id ??
    undefined
  );
}

function parseObservedCard(
  raw: unknown,
  externalId: string | undefined,
  run: AdapterRun,
): Card | null {
  if (externalId) run.observedExternalIds.push(externalId);
  const parsed = cardSchema.safeParse(raw);
  if (parsed.success && externalId) return parsed.data;
  run.complete = false;
  run.outcome = 'partial';
  run.anomalies.push({
    kind: 'shape_changed',
    detail: parsed.success ? 'missing card id' : parsed.error.message,
    externalId,
  });
  return null;
}

function invalidListing(
  raw: unknown,
  externalId: string,
  bankSlug: string,
): NormalizedListing {
  return {
    source: 'playdigital',
    externalId,
    bankSlugs: [bankSlug],
    title: externalId,
    brandName: null,
    sourceBrandId: null,
    rawCategories: [],
    tiers: null,
    rawTierSignal: null,
    terms: null,
    unpublishableReason: 'invalid listing shape',
    verify: {
      url: `https://www.modo.com.ar/promos/${encodeURIComponent(externalId)}`,
      hint: null,
    },
    listingHash: createHash('sha256').update(JSON.stringify(raw)).digest('hex'),
    raw: { listing: raw, detail: null },
    detailFetchedAt: null,
    detailStale: true,
  };
}

async function appendPage(
  run: AdapterRun,
  bank: BankRef,
  rows: unknown[],
  seen: Set<string>,
  getDetail: ReturnType<typeof detailCache>,
  today: string,
) {
  run.rawRowCount += rows.length;
  for (const raw of rows) {
    const externalId = observedId(raw);
    const status = z
      .object({ calculated_status: z.string().nullish().catch(undefined) })
      .safeParse(raw);
    if (status.success && status.data.calculated_status !== 'RUNNING') continue;
    const parsed = cardSchema.safeParse(raw);
    if (parsed.success && listingFinished(parsed.data, today)) continue;
    const card = parseObservedCard(raw, externalId, run);
    if (!externalId) continue;
    if (!card) {
      run.listings.push(invalidListing(raw, externalId, bank.slug));
      continue;
    }
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    await appendCard(run, bank, raw, card, getDetail);
  }
}

async function appendCard(
  run: AdapterRun,
  bank: BankRef,
  raw: unknown,
  card: Card,
  getDetail: ReturnType<typeof detailCache>,
) {
  const externalId = listingIdentity(card).externalId;
  const result = await getDetail(externalId, card);
  if (result.failed)
    run.anomalies.push({
      kind: 'detail_failed',
      detail: result.failed,
      externalId,
    });
  const listing = mapCardSafely(card, bank, raw, result, run);
  listing.raw.listing = raw;
  if (
    !result.failed &&
    result.known &&
    result.known.listingHash === listing.listingHash &&
    !listing.terms
  ) {
    (run.rejectedExternalIds ??= []).push(externalId);
    return;
  }
  run.listings.push(listing);
  if (listing.unpublishableReason === 'detail pending' && !result.failed)
    run.anomalies.push({
      kind: 'detail_failed',
      externalId,
      detail: 'detail pending',
    });
}

function mapCardSafely(
  card: Card,
  bank: BankRef,
  raw: unknown,
  result: Awaited<ReturnType<ReturnType<typeof detailCache>>>,
  run: AdapterRun,
) {
  try {
    return mapListing(card, bank, result.known, result.stale, run);
  } catch (error) {
    const externalId = listingIdentity(card).externalId;
    const listing = invalidListing(raw, externalId, bank.slug);
    listing.unpublishableReason = `listing mapping failed: ${String(error)}`;
    run.complete = false;
    run.outcome = 'partial';
    run.anomalies.push({
      kind: 'shape_changed',
      detail: listing.unpublishableReason,
      externalId,
    });
    return listing;
  }
}

export function listingFinished(
  card: Pick<Card, 'calculated_status' | 'stop_date'>,
  today: string,
) {
  if (
    card.calculated_status === 'FINISHED' ||
    card.calculated_status === 'FINISHED_FOR_PRODUCT'
  )
    return true;
  const stop = card.stop_date;
  if (z.iso.date().safeParse(stop).success) return stop! < today;
  if (z.iso.datetime({ offset: true }).safeParse(stop).success)
    return todayInArgentina(new Date(stop!)).today < today;
  return false;
}

// shortcut: stop at 1,000 pages per bank; raise only after auditing a larger source catalog.
const MAX_BANK_PAGES = 1000;

async function readBankPages(
  ctx: AdapterContext,
  bank: BankRef,
  run: AdapterRun,
  getDetail: ReturnType<typeof detailCache>,
) {
  if (!bank.playdigitalId) throw new Error('missing PlayDigital bank id');
  const fetchJson = client(ctx);
  const seen = new Set<string>();
  const traversed = new Set<string>();
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const url = `${root}/slots/?slots=web-banco-hub-promos_corriendo&source=web_bank&banks=${encodeURIComponent(bank.playdigitalId)}&origin=web_bank&slot_info=false&limit=1000&page=${page}`;
    const response = z
      .object({
        data: z.object({ cards: z.array(z.unknown()) }),
        metadata: z.object({
          pagination: z.object({
            page: z.number().int().positive(),
            total_pages: z.number().int().nonnegative(),
            total_results: z.number().int().nonnegative(),
          }),
        }),
      })
      .parse(await fetchJson(url));
    const pagination = response.metadata.pagination;
    if (page === 1) {
      totalPages = pagination.total_pages;
      run.totalReported = pagination.total_results;
    }
    const ids = response.data.cards
      .map(observedId)
      .filter((id): id is string => !!id);
    const progressed = ids.some((id) => !traversed.has(id));
    ids.forEach((id) => traversed.add(id));
    await appendPage(
      run,
      bank,
      response.data.cards,
      seen,
      getDetail,
      todayInArgentina(ctx.now).today,
    );
    const problem = paginationProblem(
      page,
      totalPages,
      run.totalReported!,
      pagination,
      response.data.cards.length,
      progressed,
    );
    if (problem) {
      run.outcome = 'partial';
      throw new Error(problem);
    }
  }
}

function paginationProblem(
  page: number,
  pages: number,
  total: number,
  current: { page: number; total_pages: number; total_results: number },
  rowCount: number,
  progressed: boolean,
): string | null {
  if (current.page !== page) return 'pagination page mismatch';
  if (current.total_pages !== pages || current.total_results !== total)
    return 'pagination totals drift';
  if (pages > MAX_BANK_PAGES) return 'pagination page limit exceeded';
  if (!rowCount)
    return total === 0 && pages <= 1 ? null : 'empty pagination page';
  if (!progressed) return 'nonprogressing pagination page';
  return null;
}

export const playdigitalAdapter: Adapter = {
  source: 'playdigital',
  async listBanks(ctx) {
    const parsed = z
      .object({
        banks: z.array(
          z.object({ id: z.string().min(1), name: z.string().min(1) }),
        ),
      })
      .parse(
        await client(ctx)(
          'https://www.modo.com.ar/promos/api/rewards/v2/banks',
        ),
      );
    return parsed.banks
      .map((bank) => ({
        slug: playdigitalBankSlug(bank.name),
        name: bank.name,
        playdigitalId: bank.id,
      }))
      .filter((bank) => ALLOWED_BANKS.includes(bank.slug));
  },
  async run(ctx, banks) {
    const getDetail = detailCache(ctx);
    const runs: AdapterRun[] = [];
    for (const bank of banks.filter(
      (bank) =>
        ALLOWED_BANKS.includes(bank.slug) &&
        (!ctx.bankSlugs || ctx.bankSlugs.includes(bank.slug)),
    )) {
      const run: AdapterRun = {
        source: 'playdigital',
        bankSlug: bank.slug,
        startedAt: new Date(),
        completedAt: new Date(),
        outcome: 'ok',
        complete: true,
        totalReported: null,
        rawRowCount: 0,
        observedExternalIds: [],
        listings: [],
        anomalies: [],
        error: null,
      };
      try {
        await readBankPages(ctx, bank, run, getDetail);
        if (run.rawRowCount !== run.totalReported) {
          run.complete = false;
          run.outcome = 'partial';
          run.error = 'row count differs from total reported';
        }
      } catch (error) {
        run.outcome =
          run.outcome === 'partial' || run.rawRowCount ? 'partial' : 'failed';
        run.complete = false;
        run.error = String(error);
      }
      run.observedExternalIds = [...new Set(run.observedExternalIds)];
      run.completedAt = new Date();
      runs.push(run);
    }
    return runs;
  },
};
