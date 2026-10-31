import {
  CampaignTermsSchema,
  CatalogCategorySchema,
  type CampaignTerms,
  type CatalogCategory,
} from '@repo/shared-types';
import {
  and,
  eq,
  isNull,
  desc,
  asc,
  sql,
  inArray,
  arrayOverlaps,
  notInArray,
  isNotNull,
  or,
} from 'drizzle-orm';
import { todayInArgentina } from '../../argentina-time';
import { z } from 'zod';
import { DETAIL_TTL_MS, listingFinished } from './playdigital';
import { ALLOWED_BANKS } from './tiers';
import type { Database, Executor } from '../../database/database.types';
import {
  benefitBanks as banks,
  benefitCampaigns as campaigns,
  benefitCampaignBanks as presence,
  benefitIngestRuns as runs,
  benefitCategoryMappings as mappings,
  benefitDetailCache as details,
  benefitBrands as brands,
} from './schema';
import { upsertBrand } from './brands';
import type {
  AdapterRun,
  BankRef,
  IngestSource,
  KnownDetail,
  NormalizedListing,
} from './types';

export type CommitSummary = {
  runId: string;
  upserted: number;
  created: number;
  unpublishable: number;
  withdrawnBanks: number;
  withdrawnCampaigns: number;
  unmappedCategories: number;
};
type Anomalies = { kind: string; detail: string; externalId?: string }[];

export function resolveCategories(
  keys: string[],
  mapping: Map<string, CatalogCategory>,
): CatalogCategory[] | null {
  const matched = keys.filter(
    (k) =>
      mapping.has(k) &&
      !keys.some((other) => other.startsWith(`${k}/`) && mapping.has(other)),
  );
  return matched.length
    ? [...new Set(matched.map((k) => mapping.get(k)!))]
    : null;
}

export function canonicalCategories(
  rows: {
    bankSlug: string;
    withdrawnAt: Date | null;
    terms: CampaignTerms | null;
    snapshot: Pick<NormalizedListing, 'rawCategories'>;
  }[],
  mapping: Map<string, CatalogCategory>,
): CatalogCategory[] {
  const active = rows.filter((row) => !row.withdrawnAt);
  const relevant = (active.length ? active : [...rows]).sort((a, b) =>
    a.bankSlug.localeCompare(b.bankSlug),
  );
  const canonical = relevant.find((row) => row.terms) ?? relevant[0];
  return canonical
    ? (resolveCategories(canonical.snapshot.rawCategories, mapping) ?? [
        'otros',
      ])
    : ['otros'];
}

export function absenceBlockReason(
  run: AdapterRun,
  previousCount: number | null,
): string | null {
  if (run.outcome !== 'ok') return 'outcome_not_ok';
  if (!run.complete) return 'incomplete';
  if (run.totalReported !== null && run.rawRowCount !== run.totalReported)
    return 'count_mismatch';
  if (previousCount !== null && run.rawRowCount < previousCount * 0.5)
    return 'low_count';
  return null;
}

export async function loadKnownDetails(
  db: Executor,
  source: IngestSource,
): Promise<Map<string, KnownDetail>> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.source, source));
  const known = new Map<string, KnownDetail>();
  for (const row of rows) {
    if (row.detailFetchedAt && row.raw.detail != null)
      known.set(row.externalId, {
        listingHash: row.listingHash,
        fetchedAt: row.detailFetchedAt,
        detail: row.raw.detail,
      });
  }
  for (const row of await db
    .select()
    .from(details)
    .where(eq(details.source, source))) {
    const previous = known.get(row.externalId);
    if (!previous || previous.fetchedAt <= row.fetchedAt)
      known.set(row.externalId, {
        listingHash: row.listingHash,
        fetchedAt: row.fetchedAt,
        detail: row.detail,
      });
  }
  return known;
}

// Independent of campaign commits: interrupted initial loads can resume without refetching.
export async function saveDetail(
  db: Executor,
  source: IngestSource,
  externalId: string,
  detail: KnownDetail,
): Promise<void> {
  const value = {
    source,
    externalId,
    listingHash: detail.listingHash,
    fetchedAt: detail.fetchedAt,
    detail: detail.detail,
  };
  await db
    .insert(details)
    .values(value)
    .onConflictDoUpdate({
      target: [details.source, details.externalId],
      set: value,
      setWhere: sql`${details.fetchedAt} <= ${detail.fetchedAt}`,
    });
}

export async function upsertBanks(
  db: Executor,
  refs: BankRef[],
): Promise<void> {
  for (const bank of refs.filter((bank) => ALLOWED_BANKS.includes(bank.slug))) {
    const value = {
      ...bank,
      ownCatalog: ['galicia', 'macro'].includes(bank.slug),
      ownCatalogScope: ownCatalogScope(bank.slug),
      updatedAt: new Date(),
    };
    await db
      .insert(banks)
      .values(value)
      .onConflictDoUpdate({ target: banks.slug, set: value });
  }
}

function ownCatalogScope(slug: string): string | null {
  if (slug === 'macro')
    return 'Solo el hub de PlayDigital; las secciones Selecta separadas no están confirmadas';
  if (slug === 'galicia') return 'Catálogo propio de la API de Galicia';
  return null;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
}

function sharedTerms(terms: CampaignTerms): string {
  const {
    eligibility: _,
    eligibilityCompleteness: __,
    unresolved: ___,
    ...shared
  } = terms;
  return stableJson(shared);
}

function campaignSnapshot(
  listing: NormalizedListing,
  categories: CatalogCategory[],
  brandId: string | null,
) {
  return {
    brandId,
    title: listing.title,
    categories,
    verifyUrl: listing.verify.url,
    verifyHint: listing.verify.hint,
    raw: listing.raw,
    listingHash: listing.listingHash,
    detailFetchedAt: listing.detailFetchedAt
      ? new Date(listing.detailFetchedAt)
      : null,
    detailStale: listing.detailStale,
  };
}

async function saveListing(
  db: Executor,
  listing: NormalizedListing,
  run: AdapterRun,
  bankSlug: string,
  now: Date,
  summary: CommitSummary,
  mapping: Map<string, CatalogCategory>,
  anomalies: Anomalies,
): Promise<string> {
  if (listing.source !== run.source)
    throw new Error('Listing source differs from run');
  const categories = resolveCategories(listing.rawCategories, mapping);
  if (!categories) {
    summary.unmappedCategories++;
    anomalies.push({
      kind: 'unmapped_category',
      detail: listing.rawCategories.join(', '),
      externalId: listing.externalId,
    });
  }
  const parsed = CampaignTermsSchema.safeParse(listing.terms);
  const terms = parsed.success ? parsed.data : null;
  if (!terms) summary.unpublishable++;
  const brandId = await upsertBrand(
    db,
    run.source,
    listing.brandName,
    listing.sourceBrandId,
  );
  const [existing] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.source, run.source),
        eq(campaigns.externalId, listing.externalId),
      ),
    );
  const [campaign] = await db
    .insert(campaigns)
    .values({
      source: run.source,
      externalId: listing.externalId,
      ...campaignSnapshot(listing, categories ?? ['otros'], brandId),
      terms,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [campaigns.source, campaigns.externalId],
      set: { lastSeenAt: now },
    })
    .returning({ id: campaigns.id });
  summary.upserted++;
  if (!existing) summary.created++;
  const value = {
    campaignId: campaign.id,
    bankSlug,
    terms,
    tiers: terms ? listing.tiers : null,
    snapshot: { ...listing, terms, tiers: terms ? listing.tiers : null },
    lastSeenAt: now,
    lastSeenRunId: summary.runId,
    missingSinceRunId: null,
    withdrawnAt: null,
  };
  await db
    .insert(presence)
    .values(value)
    .onConflictDoUpdate({
      target: [presence.campaignId, presence.bankSlug],
      set: value,
    });
  return campaign.id;
}

async function markMissing(
  db: Executor,
  p: typeof presence.$inferSelect,
  run: AdapterRun,
  runId: string,
  now: Date,
): Promise<boolean> {
  const key = and(
    eq(presence.campaignId, p.campaignId),
    eq(presence.bankSlug, p.bankSlug),
  );
  if (p.withdrawnAt) return false;
  if (!p.missingSinceRunId) {
    await db.update(presence).set({ missingSinceRunId: runId }).where(key);
    return false;
  }
  const [missing] = await db
    .select({ startedAt: runs.startedAt })
    .from(runs)
    .where(eq(runs.id, p.missingSinceRunId));
  if (run.startedAt.getTime() - missing.startedAt.getTime() < 86_400_000)
    return false;
  await db.update(presence).set({ withdrawnAt: now }).where(key);
  return true;
}

async function updatePresence(
  db: Executor,
  run: AdapterRun,
  bankSlug: string,
  now: Date,
  summary: CommitSummary,
  block: string | null,
): Promise<string[]> {
  const rows = await db
    .select({ p: presence, externalId: campaigns.externalId })
    .from(presence)
    .innerJoin(campaigns, eq(campaigns.id, presence.campaignId))
    .where(
      and(eq(campaigns.source, run.source), eq(presence.bankSlug, bankSlug)),
    );
  const observed = new Set(run.observedExternalIds);
  const mapped = new Set(run.listings.map((listing) => listing.externalId));
  const affected: string[] = [];
  for (const { p, externalId } of rows) {
    if (observed.has(externalId)) {
      const invalid = mapped.has(externalId)
        ? {}
        : invalidateObservedSnapshot(p);
      if (!mapped.has(externalId)) summary.unpublishable++;
      await db
        .update(presence)
        .set({
          ...invalid,
          lastSeenAt: now,
          lastSeenRunId: summary.runId,
          missingSinceRunId: null,
          withdrawnAt: null,
        })
        .where(
          and(
            eq(presence.campaignId, p.campaignId),
            eq(presence.bankSlug, bankSlug),
          ),
        );
      affected.push(p.campaignId);
    } else if (!block && (await markMissing(db, p, run, summary.runId, now))) {
      summary.withdrawnBanks++;
      affected.push(p.campaignId);
    }
  }
  return affected;
}

function invalidateObservedSnapshot(p: typeof presence.$inferSelect) {
  const snapshot: NormalizedListing = {
    source: p.snapshot.source,
    externalId: p.snapshot.externalId,
    bankSlugs: [p.bankSlug],
    title: `Unmapped ${p.snapshot.externalId}`,
    brandName: null,
    sourceBrandId: null,
    rawCategories: [],
    terms: null,
    tiers: null,
    rawTierSignal: null,
    unpublishableReason: 'observed_without_listing',
    verify: p.snapshot.verify,
    raw: { listing: p.snapshot.raw.listing, detail: null },
    listingHash: '',
    detailFetchedAt: null,
    detailStale: true,
  };
  return { terms: null, tiers: null, snapshot };
}

function publishableTerms(
  active: (typeof presence.$inferSelect)[],
  canonical: typeof presence.$inferSelect,
  anomalies: Anomalies,
) {
  if (!canonical.terms)
    return {
      terms: null,
      unpublishableReason:
        canonical.snapshot.unpublishableReason ?? 'invalid_terms',
    };
  const signature = sharedTerms(canonical.terms);
  for (const p of active)
    if (p.terms && sharedTerms(p.terms) !== signature)
      anomalies.push({
        kind: 'conflicting_terms',
        externalId: canonical.snapshot.externalId,
        detail: `Shared terms differ for bank ${p.bankSlug}; canonical bank snapshot retained`,
      });
  return { terms: canonical.terms, unpublishableReason: null };
}

async function rebuildCampaign(
  db: Executor,
  id: string,
  now: Date,
  summary: CommitSummary,
  anomalies: Anomalies,
): Promise<void> {
  const rows = await db
    .select()
    .from(presence)
    .where(eq(presence.campaignId, id))
    .orderBy(asc(presence.bankSlug));
  const validatedRows = rows.map((p) => {
    const parsed = CampaignTermsSchema.safeParse(p.terms);
    return { ...p, terms: parsed.success ? parsed.data : null };
  });
  const active = validatedRows.filter((p) => !p.withdrawnAt);
  if (!active.length) {
    const withdrawn = await db
      .update(campaigns)
      .set({ withdrawnAt: now })
      .where(and(eq(campaigns.id, id), isNull(campaigns.withdrawnAt)))
      .returning({ id: campaigns.id });
    summary.withdrawnCampaigns += withdrawn.length;
    return;
  }
  // Lowest bank slug with valid terms owns shared fields, independent of run order.
  const canonical = active.find((p) => p.terms) ?? active[0];
  const listing = canonical.snapshot;
  const mapping = new Map(
    (await db.select().from(mappings)).map((m) => [m.sourceKey, m.category]),
  );
  const brandId = await upsertBrand(
    db,
    listing.source,
    listing.brandName,
    listing.sourceBrandId,
  );
  await db
    .update(campaigns)
    .set({
      ...campaignSnapshot(listing, canonicalCategories(rows, mapping), brandId),
      ...publishableTerms(active, canonical, anomalies),
      tiers: active.length === 1 ? canonical.tiers : null,
      rawTierSignal: active.length === 1 ? listing.rawTierSignal : null,
      withdrawnAt: null,
      lastSeenAt: new Date(
        Math.max(...rows.map((p) => p.lastSeenAt.getTime())),
      ),
    })
    .where(eq(campaigns.id, id));
}

async function startRun(
  db: Executor,
  run: AdapterRun,
  bankSlug: string,
  anomalies: Anomalies,
) {
  await db
    .insert(banks)
    .values({
      slug: bankSlug,
      name: bankSlug,
      ownCatalog: ['galicia', 'macro'].includes(bankSlug),
      ownCatalogScope: ownCatalogScope(bankSlug),
    })
    .onConflictDoNothing();
  const [previous] = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.source, run.source),
        eq(runs.bankSlug, bankSlug),
        eq(runs.complete, true),
        eq(runs.outcome, 'ok'),
        // A rejected low-count run must never become the next run's baseline.
        sql`not (${runs.anomalies} @> '[{"kind":"absence_skipped"}]'::jsonb)`,
      ),
    )
    .orderBy(desc(runs.startedAt))
    .limit(1);
  const block = absenceBlockReason(run, previous?.rawRowCount ?? null);
  if (block) anomalies.push({ kind: 'absence_skipped', detail: block });
  const [record] = await db
    .insert(runs)
    .values({
      source: run.source,
      bankSlug,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      outcome: run.outcome,
      complete: run.complete,
      totalReported: run.totalReported,
      rawRowCount: run.rawRowCount,
      observedCount: new Set(run.observedExternalIds).size,
      error: run.error,
    })
    .returning({ id: runs.id });
  return { block, record };
}

async function pruneCampaigns(
  tx: Executor,
  now: Date,
  summary: CommitSummary,
  anomalies: Anomalies,
) {
  const removed = await tx
    .delete(presence)
    .where(
      or(
        notInArray(presence.bankSlug, ALLOWED_BANKS),
        isNotNull(presence.withdrawnAt),
        and(
          inArray(
            presence.campaignId,
            tx
              .select({ id: campaigns.id })
              .from(campaigns)
              .where(eq(campaigns.source, 'playdigital')),
          ),
          sql`(${presence.snapshot}->>'unpublishableReason' = 'finished' or ${presence.snapshot}->>'unpublishableReason' like 'Error: %')`,
        ),
      ),
    )
    .returning({ campaignId: presence.campaignId });
  const legacy = await tx
    .select({
      id: campaigns.id,
      listing: sql<unknown>`${campaigns.raw}->'listing'`,
    })
    .from(campaigns)
    .where(eq(campaigns.source, 'playdigital'));
  const legacyFields = z.object({
    calculated_status: z.string().nullish(),
    stop_date: z.string().nullish().catch(undefined),
  });
  const ended = legacy
    .filter((row) => {
      const parsed = legacyFields.safeParse(row.listing);
      return (
        !parsed.success ||
        parsed.data.calculated_status !== 'RUNNING' ||
        listingFinished(parsed.data, todayInArgentina(now).today)
      );
    })
    .map((row) => row.id);
  for (let i = 0; i < ended.length; i += 1000)
    await tx
      .delete(campaigns)
      .where(inArray(campaigns.id, ended.slice(i, i + 1000)));
  const removedIds = [...new Set(removed.map((row) => row.campaignId))];
  for (let i = 0; i < removedIds.length; i += 1000) {
    const remaining = await tx
      .selectDistinct({ campaignId: presence.campaignId })
      .from(presence)
      .where(inArray(presence.campaignId, removedIds.slice(i, i + 1000)));
    for (const { campaignId: id } of remaining)
      await rebuildCampaign(tx, id, now, summary, anomalies);
  }
  await tx
    .delete(campaigns)
    .where(
      or(
        sql`not exists (select 1 from ${presence} where ${presence.campaignId} = ${campaigns.id})`,
        sql`${campaigns.terms}->'validity'->>'to' < ${todayInArgentina(now).today}`,
      ),
    );
  // Keep fresh orphan details for listings rejected by another bank's run.
  await tx
    .delete(details)
    .where(
      and(
        sql`${details.fetchedAt} < ${new Date(now.getTime() - DETAIL_TTL_MS)}`,
        sql`not exists (select 1 from ${campaigns} where ${campaigns.source} = ${details.source} and ${campaigns.externalId} = ${details.externalId})`,
      ),
    );
  await tx
    .delete(brands)
    .where(
      and(
        sql`cardinality(${brands.aliases}) = 0`,
        sql`not exists (select 1 from ${campaigns} where ${campaigns.brandId} = ${brands.id})`,
      ),
    );
}

async function removeRejected(tx: Executor, run: AdapterRun, bankSlug: string) {
  if (!run.rejectedExternalIds?.length) return [];
  return tx
    .delete(presence)
    .where(
      and(
        eq(presence.bankSlug, bankSlug),
        inArray(
          presence.campaignId,
          tx
            .select({ id: campaigns.id })
            .from(campaigns)
            .where(
              and(
                eq(campaigns.source, run.source),
                inArray(campaigns.externalId, run.rejectedExternalIds),
              ),
            ),
        ),
      ),
    )
    .returning({ campaignId: presence.campaignId });
}

export async function commitRun(
  db: Database,
  run: AdapterRun,
  now: Date,
): Promise<CommitSummary> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('benefits-ingest'))`,
    );
    const bankSlug =
      run.bankSlug ?? (run.source === 'galicia' ? 'galicia' : null);
    if (!bankSlug) throw new Error('PlayDigital run requires bankSlug');
    if (!ALLOWED_BANKS.includes(bankSlug)) throw new Error('Invalid bank');
    const anomalies: Anomalies = [...run.anomalies];
    const { block, record } = await startRun(tx, run, bankSlug, anomalies);
    const summary: CommitSummary = {
      runId: record.id,
      upserted: 0,
      created: 0,
      unpublishable: 0,
      withdrawnBanks: 0,
      withdrawnCampaigns: 0,
      unmappedCategories: 0,
    };
    const mapping = new Map(
      (await tx.select().from(mappings)).map((m) => [m.sourceKey, m.category]),
    );
    const affected = new Set(
      (await removeRejected(tx, run, bankSlug)).map(
        ({ campaignId }) => campaignId,
      ),
    );
    for (const listing of run.listings)
      affected.add(
        await saveListing(
          tx,
          listing,
          run,
          bankSlug,
          now,
          summary,
          mapping,
          anomalies,
        ),
      );
    for (const id of await updatePresence(
      tx,
      run,
      bankSlug,
      now,
      summary,
      block,
    ))
      affected.add(id);
    for (const id of affected)
      await rebuildCampaign(tx, id, now, summary, anomalies);
    await pruneCampaigns(tx, now, summary, anomalies);
    const { runId: _, ...counts } = summary;
    await tx
      .update(runs)
      .set({ ...counts, anomalies })
      .where(eq(runs.id, record.id));
    return summary;
  });
}

export async function setCategoryMapping(
  db: Executor,
  sourceKey: string,
  category: CatalogCategory,
  actor: string,
): Promise<void> {
  const value = {
    sourceKey,
    category: CatalogCategorySchema.parse(category),
    updatedBy: actor,
    updatedAt: new Date(),
  };
  await db
    .insert(mappings)
    .values(value)
    .onConflictDoUpdate({ target: mappings.sourceKey, set: value });
}

export async function setCampaignHidden(
  db: Executor,
  id: string,
  hidden: boolean,
  actor: string,
): Promise<void> {
  await db
    .update(campaigns)
    .set({ hidden, hiddenBy: actor })
    .where(eq(campaigns.id, id));
}

export async function listPublishableCampaigns(
  db: Executor,
  filter: {
    bankSlugs?: string[];
    categories?: CatalogCategory[];
    today: string;
  },
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filter.today))
    throw new Error('today must be an ISO day');
  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.hidden, false),
        isNull(campaigns.withdrawnAt),

        filter.categories?.length
          ? arrayOverlaps(campaigns.categories, filter.categories)
          : undefined,
        inArray(
          campaigns.id,
          db
            .select({ id: presence.campaignId })
            .from(presence)
            .where(
              and(
                isNull(presence.withdrawnAt),
                sql`${presence.terms}->>'eligibilityCompleteness' = 'complete'`,
                sql`(${presence.terms}->'validity'->>'to' is null or ${presence.terms}->'validity'->>'to' >= ${filter.today})`,
                filter.bankSlugs?.length
                  ? inArray(presence.bankSlug, filter.bankSlugs)
                  : undefined,
              ),
            ),
        ),
      ),
    );
  return rows.map((row) => ({
    ...row,
    terms: row.terms ? CampaignTermsSchema.parse(row.terms) : null,
  }));
}
