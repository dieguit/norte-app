import type { BenefitCategory, BenefitProfileFacts } from '@repo/shared-types';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from '../database/columns';
import type { BenefitSnapshot, RunCounts } from './benefits.types';

export const benefitUserPreferences = pgTable('benefit_user_preferences', {
  userId: text('user_id').primaryKey(),
  instrumentSlugs: text('instrument_slugs').array().notNull(),
  categories: text('categories').array().notNull(),
  instrumentFacts: jsonb('instrument_facts')
    .$type<BenefitProfileFacts['instrumentFacts']>()
    .notNull()
    .default({}),
  providerFacts: jsonb('provider_facts')
    .$type<BenefitProfileFacts['providerFacts']>()
    .notNull()
    .default({}),
  // ISO timestamp per instrument slug, set server-side when first declared.
  declaredAt: jsonb('declared_at')
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  ...timestamps(),
});

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const benefits = pgTable(
  'benefits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publisherProviderSlug: text('publisher_provider_slug').notNull(),
    identityKey: text('identity_key').notNull(),
    origin: text('origin').$type<'harvest' | 'manual'>().notNull(),
    lifecycle: text('lifecycle')
      .$type<'draft' | 'needs_review' | 'published' | 'expired' | 'withdrawn'>()
      .notNull(),
    category: text('category').$type<BenefitCategory>().notNull(),
    // Current snapshot (title, merchant, rules, evidence); promoted only via approval when published.
    snapshot: jsonb('snapshot').$type<BenefitSnapshot>().notNull(),
    contentHash: text('content_hash').notNull(),
    protectedFields: text('protected_fields').array().notNull().default([]),
    version: integer('version').notNull().default(1),
    firstSeenAt: ts('first_seen_at').notNull(),
    lastSeenAt: ts('last_seen_at').notNull(),
    lastVerifiedAt: ts('last_verified_at'),
    ...timestamps(),
  },
  (t) => [
    unique('benefits_identity_unique').on(
      t.publisherProviderSlug,
      t.identityKey,
    ),
    index('benefits_lifecycle_category_idx').on(t.lifecycle, t.category),
    check('benefits_origin_check', sql`${t.origin} in ('harvest', 'manual')`),
    check(
      'benefits_lifecycle_check',
      sql`${t.lifecycle} in ('draft', 'needs_review', 'published', 'expired', 'withdrawn')`,
    ),
    check('benefits_version_check', sql`${t.version} > 0`),
  ],
);

export const benefitRevisions = pgTable(
  'benefit_revisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    benefitId: uuid('benefit_id')
      .notNull()
      .references(() => benefits.id, { onDelete: 'cascade' }),
    baseVersion: integer('base_version').notNull(),
    snapshot: jsonb('snapshot').$type<BenefitSnapshot>().notNull(),
    category: text('category').$type<BenefitCategory>().notNull(),
    contentHash: text('content_hash').notNull(),
    status: text('status')
      .$type<'pending' | 'approved' | 'rejected' | 'superseded'>()
      .notNull(),
    actor: text('actor').notNull(),
    reason: text('reason'),
    decidedBy: text('decided_by'),
    decidedAt: ts('decided_at'),
    createdAt: ts('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('benefit_revisions_benefit_idx').on(t.benefitId, t.createdAt),
    uniqueIndex('benefit_revisions_one_pending')
      .on(t.benefitId)
      .where(sql`${t.status} = 'pending'`),
    check(
      'benefit_revisions_status_check',
      sql`${t.status} in ('pending', 'approved', 'rejected', 'superseded')`,
    ),
  ],
);

export const benefitSourceRuns = pgTable(
  'benefit_source_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: text('source_id').notNull(),
    provenance: text('provenance').$type<'live' | 'fixture'>().notNull(),
    llm: boolean('llm').notNull(),
    outcome: text('outcome')
      .$type<'ok' | 'partial' | 'blocked' | 'failed'>()
      .notNull(),
    // complete = whole source read and extracted; only complete + coverage full runs count for absence.
    complete: boolean('complete').notNull(),
    coverage: text('coverage').notNull(),
    httpStatus: integer('http_status'),
    mime: text('mime'),
    bytes: integer('bytes'),
    counts: jsonb('counts').$type<RunCounts>().notNull(),
    diagnostics: text('diagnostics').array().notNull().default([]),
    startedAt: ts('started_at').notNull(),
    completedAt: ts('completed_at').notNull(),
  },
  (t) => [index('benefit_source_runs_source_idx').on(t.sourceId, t.startedAt)],
);

export const benefitSources = pgTable(
  'benefit_sources',
  {
    benefitId: uuid('benefit_id')
      .notNull()
      .references(() => benefits.id, { onDelete: 'cascade' }),
    sourceId: text('source_id').notNull(),
    upstreamId: text('upstream_id'),
    lastSeenAt: ts('last_seen_at').notNull(),
    lastSeenRunId: uuid('last_seen_run_id'),
    // First qualifying run that did not see this benefit; reset on any sighting.
    firstMissingRunId: uuid('first_missing_run_id').references(
      () => benefitSourceRuns.id,
    ),
  },
  (t) => [primaryKey({ columns: [t.benefitId, t.sourceId] })],
);

// Admin overrides over the static catalog (enabled/autoPublish); absent row = catalog default.
export const benefitSourcePolicies = pgTable('benefit_source_policies', {
  sourceId: text('source_id').primaryKey(),
  enabled: boolean('enabled'),
  autoPublish: boolean('auto_publish'),
  updatedBy: text('updated_by').notNull(),
  ...timestamps(),
});
