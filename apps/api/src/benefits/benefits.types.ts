import type {
  BenefitCategory,
  BenefitMatch,
  BenefitRules,
} from '@repo/shared-types';
import type { Provider, Source } from './catalog';

// Quotes are verbatim fragments of the fetched content, checked by substring before storing.
export type Evidence = {
  sourceUrl: string;
  detailUrl: string | null;
  termsUrl: string | null;
  quotes: { field: string; quote: string }[];
  fetchedContentHash: string;
};

export type BenefitSnapshot = {
  title: string;
  merchant: string | null;
  rules: BenefitRules;
  evidence: Evidence;
};

// Fields a manual edit can protect from harvest overwrite (whole `rules`, never sub-paths).
export const PROTECTABLE_FIELDS = [
  'title',
  'merchant',
  'category',
  'rules',
] as const;
export type ProtectableField = (typeof PROTECTABLE_FIELDS)[number];

export type CandidateBenefit = {
  publisherProviderSlug: string;
  // `${publisher}:${upstreamId}` when the source exposes a stable id, else a normalized fingerprint.
  identityKey: string;
  upstreamId: string | null;
  category: BenefitCategory;
  snapshot: BenefitSnapshot;
  // sha256 of stable JSON of { title, merchant, category, rules }; evidence excluded.
  contentHash: string;
};

export type RunCounts = {
  detected: number;
  valid: number;
  rejected: number;
  published?: number;
  staged?: number;
  unchanged?: number;
  withdrawn?: number;
};

export type SourceResult = {
  sourceId: string;
  providerSlug: string;
  provenance: 'live' | 'fixture';
  llm: boolean;
  outcome: 'ok' | 'partial' | 'blocked' | 'failed';
  complete: boolean;
  truncated: boolean;
  coverage: Source['coverage'];
  http: { status: number; mime: string | null; bytes: number } | null;
  diagnostics: string[];
  candidates: CandidateBenefit[];
  rejected: { reason: string; item: unknown }[];
  startedAt: Date;
  completedAt: Date;
};

export type Extract = (prompt: string) => Promise<unknown>;

export type HarvestOptions = {
  providers: Provider[];
  sourceIds?: string[];
  // false = cron: only enabled sources (after policy overrides); true = verify CLI.
  includeDisabled: boolean;
  policies: Map<string, SourcePolicy>;
  extract: Extract | null; // null = --no-llm
  fixtureDir?: string; // replay saved bodies instead of fetching
  saveFixtureDir?: string;
  fetchImpl?: typeof fetch;
  now: Date;
};
// runHarvest(options: HarvestOptions): Promise<SourceResult[]> — no DB writes. (harvest.ts)

export type SourcePolicy = { enabled?: boolean; autoPublish?: boolean };

export type WriteContext = { now: Date; actor: string };

export type CommitSummary = {
  runId: string;
  published: number;
  staged: number;
  updated: number;
  unchanged: number;
  withdrawn: number;
};

export type ReviewCommand =
  | { kind: 'approve'; benefitId: string; reason?: string }
  | { kind: 'reject'; benefitId: string; reason: string }
  | {
      kind: 'add';
      candidate: CandidateBenefit;
      protectedFields: ProtectableField[];
    }
  | {
      kind: 'edit';
      benefitId: string;
      patch: Partial<Pick<CandidateBenefit, 'category'>> &
        Partial<Pick<BenefitSnapshot, 'title' | 'merchant' | 'rules'>>;
      protectedFields: ProtectableField[];
    }
  | { kind: 'reverify'; benefitId: string };

export type ReviewResult = {
  benefitId: string;
  lifecycle: string;
  version: number;
};

/* Persistence API (benefits/store.ts), frozen for pass 2 lanes:
 * loadSourcePolicies(db): Promise<Map<string, SourcePolicy>>
 * setSourcePolicy(db, sourceId, patch: SourcePolicy, ctx): Promise<void>
 * commitSourceRun(db, result: SourceResult, source: Source, ctx): Promise<CommitSummary>
 *   — throws if result.provenance === 'fixture' || !result.llm (never certifies).
 * expireBenefits(db, today: string): Promise<number>
 * reviewBenefit(db, cmd: ReviewCommand, ctx): Promise<ReviewResult>
 * listBenefits(db, filter: { lifecycle?: string; sourceId?: string }): Promise<StoredBenefit[]>
 * getBenefit(db, id): Promise<(StoredBenefit & { pendingRevision: StoredRevision | null }) | null>
 * loadMatchableBenefits(db, categories: BenefitCategory[]): Promise<StoredBenefit[]>  — lifecycle published only.
 */
export type StoredBenefit = {
  id: string;
  publisherProviderSlug: string;
  identityKey: string;
  origin: 'harvest' | 'manual';
  lifecycle: 'draft' | 'needs_review' | 'published' | 'expired' | 'withdrawn';
  category: BenefitCategory;
  snapshot: BenefitSnapshot;
  protectedFields: string[];
  version: number;
  lastVerifiedAt: Date | null;
};
export type StoredRevision = {
  id: string;
  baseVersion: number;
  category: BenefitCategory;
  snapshot: BenefitSnapshot;
  actor: string;
  createdAt: Date;
};

// Service output (benefits.service.ts findMatching), consumed by digest and WhatsApp tool.
export type MatchedBenefit = {
  match: BenefitMatch;
  benefit: Pick<
    StoredBenefit,
    'id' | 'publisherProviderSlug' | 'category' | 'origin'
  > & {
    title: string;
    merchant: string | null;
    rules: BenefitRules;
    sourceUrl: string;
    termsUrl: string | null;
  };
  instrumentLabels: string[];
};
