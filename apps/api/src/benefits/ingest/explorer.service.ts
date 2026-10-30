import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExplorerCampaignSchema,
  ExplorerCampaignDetailSchema,
  ExplorerOverviewSchema,
  type ExplorerQuery,
  type CatalogCategory,
} from '@repo/shared-types';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  getTableColumns,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../database/database.constants';
import type { Database, Transaction } from '../../database/database.types';
import { todayInArgentina } from '../../argentina-time';
import {
  benefitCampaigns as campaigns,
  benefitBrands as brands,
  benefitCampaignBanks as presence,
  benefitBanks as banks,
  benefitIngestRuns as runs,
  benefitCategoryMappings as mappings,
} from './schema';
import { normalizeBrand } from './brands';
import { canonicalCategories, setCategoryMapping } from './store';
import { BANK_TIERS } from './tiers';
import type { NormalizedListing } from './types';

type Brand = typeof brands.$inferSelect;
type Campaign = typeof campaigns.$inferSelect;
type Presence = typeof presence.$inferSelect;
const ok = { ok: true as const };
const literalSearch = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

function brandSearch(q: string) {
  const pattern = literalSearch(q);
  return or(
    ilike(brands.name, pattern),
    sql`exists (select 1 from unnest(${brands.aliases}) as alias where alias ilike ${pattern})`,
  );
}

function campaignItem(
  row: Omit<Campaign, 'raw'>,
  brandName: string | null,
  rows: Pick<Presence, 'bankSlug' | 'withdrawnAt'>[],
) {
  return ExplorerCampaignSchema.parse({
    ...row,
    brandName,
    bankSlugs: rows
      .filter((p) => !p.withdrawnAt)
      .map((p) => p.bankSlug)
      .sort(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
    detailFetchedAt: row.detailFetchedAt?.toISOString() ?? null,
  });
}

function checkBrandCollision(candidate: Brand, others: Brand[]) {
  const names = new Set([
    candidate.normalized,
    ...candidate.aliases.map(normalizeBrand),
  ]);
  for (const other of others) {
    if (
      [other.normalized, ...other.aliases.map(normalizeBrand)].some((name) =>
        names.has(name),
      )
    )
      throw new ConflictException(
        'Brand name or alias already belongs to another brand',
      );
    for (const [source, ids] of Object.entries(candidate.sourceIds)) {
      if (ids.some((id) => other.sourceIds[source]?.includes(id)))
        throw new ConflictException(
          'Source identity already belongs to another brand',
        );
    }
  }
}

function statusFilter(status: ExplorerQuery['status']) {
  switch (status) {
    case 'available':
      return and(eq(campaigns.hidden, false), isNull(campaigns.withdrawnAt));
    case 'incomplete':
      return undefined;
    case 'hidden':
      return eq(campaigns.hidden, true);
  }
}

function tierFilter(tier: ExplorerQuery['tier']) {
  if (!tier) return undefined;
  const tierBanks = Object.entries(BANK_TIERS)
    .filter(([, tiers]) => tiers.some((candidate) => candidate.code === tier))
    .map(([bank]) => bank);
  return and(
    inArray(presence.bankSlug, tierBanks),
    or(
      sql`${presence.tiers}->'codes' @> ${JSON.stringify([tier])}::jsonb`,
      and(
        isNull(presence.tiers),
        sql`${presence.terms}->>'eligibilityCompleteness' = 'complete'`,
      ),
    ),
  );
}

@Injectable()
export class BenefitsExplorerService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  private write<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('benefits-ingest'))`,
      );
      return work(tx);
    });
  }

  async campaigns(query: ExplorerQuery) {
    const conditions = [
      statusFilter(query.status),
      query.source ? eq(campaigns.source, query.source) : undefined,
      query.category
        ? sql`${query.category} = any(${campaigns.categories})`
        : undefined,
    ];
    if (query.q)
      conditions.push(
        or(
          ilike(campaigns.title, literalSearch(query.q)),
          exists(
            this.db
              .select({ id: brands.id })
              .from(brands)
              .where(
                and(eq(brands.id, campaigns.brandId), brandSearch(query.q)),
              ),
          ),
        ),
      );
    conditions.push(this.bankFilter(query));
    // A single statement keeps count and page consistent without join fan-out.
    const filtered = this.db.$with('filtered').as(
      this.db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(and(...conditions)),
    );
    const result = await this.db
      .with(filtered)
      .select({
        total: sql<number>`(select count(*)::int from ${filtered})`,
        items: sql<
          { id: string }[]
        >`coalesce((select jsonb_agg(page) from (select c.id from ${campaigns} c where c.id in (select id from ${filtered}) order by c.title, c.id limit ${query.pageSize} offset ${(query.page - 1) * query.pageSize}) page), '[]'::jsonb)`,
      })
      .from(sql`(values (1)) as singleton(value)`);
    // Fetch typed rows only for this page; raw JSON is never returned by the API.
    const ids = result[0].items.map((row) => row.id);
    const { raw: _raw, ...columns } = getTableColumns(campaigns);
    const items = ids.length
      ? await this.db
          .select({ campaign: columns, brandName: brands.name })
          .from(campaigns)
          .leftJoin(brands, eq(brands.id, campaigns.brandId))
          .where(inArray(campaigns.id, ids))
          .orderBy(asc(campaigns.title), asc(campaigns.id))
      : [];
    const associations = ids.length
      ? await this.db
          .select({
            campaignId: presence.campaignId,
            bankSlug: presence.bankSlug,
            withdrawnAt: presence.withdrawnAt,
          })
          .from(presence)
          .where(inArray(presence.campaignId, ids))
      : [];
    return {
      items: items.map(({ campaign, brandName }) =>
        campaignItem(
          campaign,
          brandName,
          associations.filter((p) => p.campaignId === campaign.id),
        ),
      ),
      total: result[0].total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async campaign(id: string) {
    const [row] = await this.db
      .select({ campaign: campaigns, brandName: brands.name })
      .from(campaigns)
      .leftJoin(brands, eq(brands.id, campaigns.brandId))
      .where(eq(campaigns.id, id));
    if (!row) throw new NotFoundException('Campaign not found');
    const associations = await this.db
      .select()
      .from(presence)
      .where(eq(presence.campaignId, id))
      .orderBy(asc(presence.bankSlug));
    return ExplorerCampaignDetailSchema.parse({
      ...campaignItem(row.campaign, row.brandName, associations),
      raw: row.campaign.raw,
      rawTierSignal: row.campaign.rawTierSignal,
      banks: associations.map((p) => ({
        slug: p.bankSlug,
        terms: p.terms,
        tierCodes: p.tiers?.codes ?? [],
        withdrawnAt: p.withdrawnAt?.toISOString() ?? null,
        lastSeenAt: p.lastSeenAt.toISOString(),
      })),
    });
  }

  private bankFilter(query: Pick<ExplorerQuery, 'bank' | 'tier' | 'status'>) {
    const bankOrTier = Boolean(query.bank ?? query.tier);
    if (
      !bankOrTier &&
      !['available', 'incomplete'].includes(query.status ?? '')
    )
      return undefined;
    const conditions = [
      eq(presence.campaignId, campaigns.id),
      isNull(presence.withdrawnAt),
      query.status === 'available'
        ? and(
            sql`${presence.terms}->>'eligibilityCompleteness' = 'complete'`,
            sql`(${presence.terms}->'validity'->>'to' is null or ${presence.terms}->'validity'->>'to' >= ${todayInArgentina().today})`,
          )
        : undefined,
      query.bank ? eq(presence.bankSlug, query.bank) : undefined,
      tierFilter(query.tier),
    ];
    const association = this.db
      .select({ id: presence.campaignId })
      .from(presence)
      .where(and(...conditions));
    if (query.status === 'incomplete') {
      const complete = this.db
        .select({ id: presence.campaignId })
        .from(presence)
        .where(
          and(
            ...conditions,
            sql`${presence.terms}->>'eligibilityCompleteness' = 'complete'`,
          ),
        );
      return and(
        bankOrTier ? exists(association) : undefined,
        sql`not ${exists(complete)}`,
      );
    }
    return exists(association);
  }

  async overview() {
    const [bankRows, runRows] = await Promise.all([
      this.db.select().from(banks).orderBy(asc(banks.slug)),
      this.db
        .select()
        .from(runs)
        .orderBy(desc(runs.startedAt), desc(runs.id))
        .limit(50),
    ]);
    return ExplorerOverviewSchema.parse({
      banks: bankRows,
      runs: runRows.map((run) => ({
        ...run,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt.toISOString(),
      })),
      tiers: BANK_TIERS,
    });
  }

  hide(id: string, hidden: boolean, actor: string) {
    return this.write(async (tx) => {
      const rows = await tx
        .update(campaigns)
        .set({ hidden, hiddenBy: actor })
        .where(eq(campaigns.id, id))
        .returning({ id: campaigns.id });
      if (!rows.length) throw new NotFoundException('Campaign not found');
      return ok;
    });
  }

  async brands(query: { q?: string; page: number; pageSize: number }) {
    const where = query.q ? brandSearch(query.q) : undefined;
    const [items, totals] = await Promise.all([
      this.db
        .select({
          id: brands.id,
          name: brands.name,
          aliases: brands.aliases,
          campaignCount: sql<number>`(select count(*)::int from ${campaigns} c where c.brand_id = benefit_brands.id)`,
        })
        .from(brands)
        .where(where)
        .orderBy(asc(brands.normalized), asc(brands.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: count() }).from(brands).where(where),
    ]);
    return {
      items,
      total: totals[0].total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  aliases(id: string, aliases: string[]) {
    if (aliases.some((name) => !normalizeBrand(name)))
      throw new BadRequestException('Aliases must contain a brand name');
    return this.write(async (tx) => {
      const rows = await tx
        .select()
        .from(brands)
        .orderBy(asc(brands.id))
        .for('update');
      const brand = rows.find((b) => b.id === id);
      if (!brand) throw new NotFoundException('Brand not found');
      const unique = [
        ...new Map(
          aliases.map((name) => [normalizeBrand(name), name]),
        ).values(),
      ];
      checkBrandCollision(
        { ...brand, aliases: unique },
        rows.filter((b) => b.id !== id),
      );
      await tx.update(brands).set({ aliases: unique }).where(eq(brands.id, id));
      return ok;
    });
  }

  merge(fromId: string, intoId: string) {
    if (fromId === intoId)
      throw new BadRequestException('Choose two different brands');
    return this.write(async (tx) => {
      const rows = await tx
        .select()
        .from(brands)
        .orderBy(asc(brands.id))
        .for('update');
      const from = rows.find((b) => b.id === fromId),
        into = rows.find((b) => b.id === intoId);
      if (!from || !into) throw new NotFoundException('Brand not found');
      const sourceIds = { ...into.sourceIds };
      for (const [source, ids] of Object.entries(from.sourceIds))
        sourceIds[source] = [
          ...new Set([...(sourceIds[source] ?? []), ...ids]),
        ];
      const aliases = [
        ...new Map(
          [...into.aliases, ...from.aliases, from.name].map((name) => [
            normalizeBrand(name),
            name,
          ]),
        ).values(),
      ];
      checkBrandCollision(
        { ...into, aliases, sourceIds },
        rows.filter((b) => b.id !== fromId && b.id !== intoId),
      );
      await tx
        .update(brands)
        .set({ aliases, sourceIds })
        .where(eq(brands.id, intoId));
      await tx
        .update(campaigns)
        .set({ brandId: intoId })
        .where(eq(campaigns.brandId, fromId));
      // Retrying a consumed source ID intentionally returns 404.
      await tx.delete(brands).where(eq(brands.id, fromId));
      return ok;
    });
  }

  async mappings() {
    const [known, snapshots] = await Promise.all([
      this.db.select().from(mappings),
      this.db
        .select({
          campaignId: presence.campaignId,
          rawCategories: sql<
            string[]
          >`coalesce(nullif(${presence.snapshot}->'rawCategories', 'null'::jsonb), '[]'::jsonb)`,
        })
        .from(presence),
    ]);
    const affected = new Map<string, Set<string>>();
    for (const { campaignId, rawCategories } of snapshots)
      for (const key of rawCategories) {
        if (!affected.has(key)) affected.set(key, new Set());
        affected.get(key)!.add(campaignId);
      }
    const keys = new Set([
      ...known.map((m) => m.sourceKey),
      ...affected.keys(),
    ]);
    return {
      items: [...keys].sort().map((sourceKey) => {
        const mapping = known.find((m) => m.sourceKey === sourceKey);
        return {
          sourceKey,
          category: mapping?.category ?? null,
          affectedCampaigns: affected.get(sourceKey)?.size ?? 0,
          updatedBy: mapping?.updatedBy ?? null,
        };
      }),
    };
  }

  mapping(
    patch: { sourceKey: string; category: CatalogCategory },
    actor: string,
  ) {
    return this.write(async (tx) => {
      await setCategoryMapping(tx, patch.sourceKey, patch.category, actor);
      const mapping = new Map(
        (await tx.select().from(mappings)).map((m) => [
          m.sourceKey,
          m.category,
        ]),
      );
      const rows = await tx
        .select({
          campaignId: presence.campaignId,
          bankSlug: presence.bankSlug,
          withdrawnAt: presence.withdrawnAt,
          terms: presence.terms,
          snapshot: sql<
            Pick<NormalizedListing, 'rawCategories'>
          >`jsonb_build_object('rawCategories', coalesce(nullif(${presence.snapshot}->'rawCategories', 'null'::jsonb), '[]'::jsonb))`,
        })
        .from(presence)
        .orderBy(asc(presence.bankSlug));
      const affected = new Set(
        rows
          .filter((p) => p.snapshot.rawCategories.includes(patch.sourceKey))
          .map((p) => p.campaignId),
      );
      for (const id of affected)
        await tx
          .update(campaigns)
          .set({
            categories: canonicalCategories(
              rows.filter((p) => p.campaignId === id),
              mapping,
            ),
          })
          .where(eq(campaigns.id, id));
      return ok;
    });
  }
}
