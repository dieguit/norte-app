import type { CampaignTerms, CatalogCategory } from '@repo/shared-types';
import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  jsonb,
  integer,
  unique,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import type { IngestSource, NormalizedListing } from './types';

const ts = (name: string) => timestamp(name, { withTimezone: true });
export const benefitBanks = pgTable('benefit_banks', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  playdigitalId: text('playdigital_id').unique(),
  ownCatalog: boolean('own_catalog').notNull().default(false),
  ownCatalogScope: text('own_catalog_scope'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});
export const benefitBrands = pgTable('benefit_brands', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  normalized: text('normalized').notNull().unique(),
  aliases: text('aliases').array().notNull().default([]),
  sourceIds: jsonb('source_ids')
    .$type<Record<string, string[]>>()
    .notNull()
    .default({}),
});
export const benefitIngestRuns = pgTable(
  'benefit_ingest_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: text('source').$type<IngestSource>().notNull(),
    bankSlug: text('bank_slug'),
    startedAt: ts('started_at').notNull(),
    completedAt: ts('completed_at').notNull(),
    outcome: text('outcome').notNull(),
    complete: boolean('complete').notNull(),
    totalReported: integer('total_reported'),
    rawRowCount: integer('raw_row_count').notNull(),
    observedCount: integer('observed_count').notNull(),
    upserted: integer('upserted').notNull().default(0),
    created: integer('created').notNull().default(0),
    unpublishable: integer('unpublishable').notNull().default(0),
    withdrawnBanks: integer('withdrawn_banks').notNull().default(0),
    withdrawnCampaigns: integer('withdrawn_campaigns').notNull().default(0),
    unmappedCategories: integer('unmapped_categories').notNull().default(0),
    anomalies: jsonb('anomalies')
      .$type<{ kind: string; detail: string; externalId?: string }[]>()
      .notNull()
      .default([]),
    error: text('error'),
  },
  (t) => [
    index('benefit_ingest_runs_previous_idx').on(
      t.source,
      t.bankSlug,
      t.startedAt,
    ),
    check(
      'benefit_ingest_runs_outcome_check',
      sql`${t.outcome} in ('ok','partial','failed')`,
    ),
    check(
      'benefit_ingest_runs_counts_check',
      sql`${t.rawRowCount} >= 0 and ${t.observedCount} >= 0 and (${t.totalReported} is null or ${t.totalReported} >= 0)`,
    ),
  ],
);
export const benefitCampaigns = pgTable(
  'benefit_campaigns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: text('source').$type<IngestSource>().notNull(),
    externalId: text('external_id').notNull(),
    brandId: uuid('brand_id').references(() => benefitBrands.id),
    title: text('title').notNull(),
    categories: text('categories').array().$type<CatalogCategory[]>().notNull(),
    terms: jsonb('terms').$type<CampaignTerms>(),
    unpublishableReason: text('unpublishable_reason'),
    tiers: jsonb('tiers').$type<NormalizedListing['tiers']>(),
    rawTierSignal: text('raw_tier_signal'),
    verifyUrl: text('verify_url').notNull(),
    verifyHint: text('verify_hint'),
    hidden: boolean('hidden').notNull().default(false),
    hiddenBy: text('hidden_by'),
    raw: jsonb('raw').$type<NormalizedListing['raw']>().notNull(),
    listingHash: text('listing_hash').notNull(),
    detailFetchedAt: ts('detail_fetched_at'),
    detailStale: boolean('detail_stale').notNull().default(false),
    firstSeenAt: ts('first_seen_at').notNull(),
    lastSeenAt: ts('last_seen_at').notNull(),
    withdrawnAt: ts('withdrawn_at'),
  },
  (t) => [
    unique('benefit_campaigns_source_external_unique').on(
      t.source,
      t.externalId,
    ),
    index('benefit_campaigns_brand_idx').on(t.brandId),
    index('benefit_campaigns_categories_idx').using('gin', t.categories),
    check(
      'benefit_campaigns_source_check',
      sql`${t.source} in ('playdigital','galicia')`,
    ),
  ],
);
export const benefitCampaignBanks = pgTable(
  'benefit_campaign_banks',
  {
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => benefitCampaigns.id, { onDelete: 'cascade' }),
    bankSlug: text('bank_slug')
      .notNull()
      .references(() => benefitBanks.slug),
    terms: jsonb('terms').$type<CampaignTerms>(),
    tiers: jsonb('tiers').$type<NormalizedListing['tiers']>(),
    snapshot: jsonb('snapshot').$type<NormalizedListing>().notNull(),
    lastSeenAt: ts('last_seen_at').notNull(),
    lastSeenRunId: uuid('last_seen_run_id')
      .notNull()
      .references(() => benefitIngestRuns.id),
    missingSinceRunId: uuid('missing_since_run_id').references(
      () => benefitIngestRuns.id,
    ),
    withdrawnAt: ts('withdrawn_at'),
  },
  (t) => [
    primaryKey({ columns: [t.campaignId, t.bankSlug] }),
    index('benefit_campaign_banks_bank_idx').on(t.bankSlug),
  ],
);
export const benefitDetailCache = pgTable(
  'benefit_detail_cache',
  {
    source: text('source').$type<IngestSource>().notNull(),
    externalId: text('external_id').notNull(),
    listingHash: text('listing_hash').notNull(),
    fetchedAt: ts('fetched_at').notNull(),
    detail: jsonb('detail').$type<unknown>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.source, t.externalId] }),
    check(
      'benefit_detail_cache_source_check',
      sql`${t.source} in ('playdigital','galicia')`,
    ),
  ],
);
export const benefitCategoryMappings = pgTable(
  'benefit_category_mappings',
  {
    sourceKey: text('source_key').primaryKey(),
    category: text('category').$type<CatalogCategory>().notNull(),
    updatedBy: text('updated_by').notNull(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check(
      'benefit_category_mappings_category_check',
      sql`${t.category} in ('supermercados','gastronomia','indumentaria','hogar','electronica','salud-belleza','viajes','transporte','combustible-autos','entretenimiento','ninos-libreria','mascotas-servicios','otros')`,
    ),
  ],
);
