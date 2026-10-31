import type { CampaignTerms } from '@repo/shared-types';

export type IngestSource = 'playdigital' | 'galicia';

export type BankRef = {
  slug: string; // ours, stable: 'galicia', 'macro', 'bbva', ...
  name: string;
  playdigitalId: string | null;
};

// One record of a source catalog after deterministic mapping. No DB access in adapters.
export type NormalizedListing = {
  source: IngestSource;
  externalId: string; // promo_id (PlayDigital) / id (Galicia)
  bankSlugs: string[]; // banks whose catalog lists it (PlayDigital per-bank loop)
  title: string;
  brandName: string | null; // null for generic campaigns ("comercios adheridos")
  sourceBrandId: string | null; // e.g. Galicia idMarca; names alone risk false brand merges
  // Source category keys, most specific first: 'pd:14/31', 'pd:14', 'galicia:Indumentaria'.
  rawCategories: string[];
  // null = every tier of the bank; otherwise the tier codes that qualify (see tiers.ts).
  tiers: { bankSlug: string; codes: string[] } | null;
  rawTierSignal: string | null; // what the detection matched, for admin
  // null = observed but not publishable (e.g. PlayDigital detail never fetched); reason says why.
  terms: CampaignTerms | null;
  unpublishableReason: string | null;
  verify: { url: string; hint: string | null };
  // Hash of the listing content excluding bank membership; PlayDigital refetches detail only when it changes or detail is stale.
  listingHash: string;
  raw: { listing: unknown; detail: unknown | null };
  detailFetchedAt: Date | null; // last SUCCESSFUL fetch; a failed refresh keeps the previous detail and date
  detailStale: boolean;
};

export type AdapterAnomaly = {
  kind:
    | 'unmapped_category'
    | 'unknown_tier_signal'
    | 'unknown_audience'
    | 'unparsed_offer'
    | 'unparsed_days'
    | 'missing_field'
    | 'detail_failed'
    | 'shape_changed';
  detail: string;
  externalId?: string;
};

export type AdapterRun = {
  source: IngestSource;
  bankSlug: string | null; // per-bank PlayDigital runs; null for Galicia
  startedAt: Date;
  completedAt: Date;
  outcome: 'ok' | 'partial' | 'failed';
  // complete = every page read and every record mapped or reported; only complete runs can withdraw by absence.
  complete: boolean;
  totalReported: number | null; // source's own total (pagination metadata)
  rawRowCount: number; // rows actually read, before dedupe (Macro has legit duplicate rows)
  // Every non-finished external id seen, mapped or not, is used for absence checks.
  observedExternalIds: string[];
  listings: NormalizedListing[];
  anomalies: AdapterAnomaly[];
  error: string | null;
};

export type KnownDetail = {
  listingHash: string;
  fetchedAt: Date;
  detail: unknown;
};

export type AdapterContext = {
  fetchImpl: typeof fetch;
  now: Date;
  // PlayDigital: previously fetched details by promo_id (skip refetch when listingHash matches and fresh).
  knownDetails: Map<string, KnownDetail>;
  // Persist each successful detail as it arrives so an interrupted first load resumes.
  saveDetail?: (externalId: string, detail: KnownDetail) => Promise<void>;
  // Optional narrowing for CLI runs.
  bankSlugs?: string[];
  // Run-wide budget; remaining details stay unfetched (listing unpublishable or stale).
  maxDetailFetches?: number;
  // Global pacing for every request of the run.
  pacing?: { minIntervalMs: number; timeoutMs: number; retries: number };
};

export type Adapter = {
  source: IngestSource;
  listBanks?(ctx: AdapterContext): Promise<BankRef[]>;
  run(ctx: AdapterContext, banks: BankRef[]): Promise<AdapterRun[]>;
};
