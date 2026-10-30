import type {
  CARD_NETWORKS,
  INSTRUMENT_TYPES,
  MEMBERSHIP_USAGES,
  PROVIDER_KINDS,
} from '@repo/shared-types';

type Network = (typeof CARD_NETWORKS)[number];

export type Instrument = {
  slug: string;
  label: string;
  network?: Network;
  type: (typeof INSTRUMENT_TYPES)[number];
  // Legacy; prefer segment (commercial: eminent, selecta) vs productLevel (signature, black, icon).
  tier?: string;
  // Defaults to the owning provider for bank cards; wallets/memberships may omit it.
  issuerProviderSlug?: string;
  issuerCountry?: string;
  productLevel?: string;
  segment?: string;
  usage?: (typeof MEMBERSHIP_USAGES)[number];
  evidenceUrl: string; // official page proving this product exists
};

const SOURCE_STATUSES = [
  'pending_discovery',
  'pending_validation',
  'active',
  'degraded',
  'blocked',
  'disabled',
] as const;
const SOURCE_COVERAGES = [
  'full',
  'partial',
  'campaign_only',
  'unknown',
] as const;

export type Source = {
  id: string; // stable, globally unique
  url: string;
  strategy: 'fetch' | 'json' | 'file'; // file: url is a path under benefits/manual/
  instructions: string;
  enabled: boolean; // only `active` sources may be enabled
  autoPublish: boolean; // false until the source is validated; everything goes to needs_review
  status: (typeof SOURCE_STATUSES)[number];
  coverage: (typeof SOURCE_COVERAGES)[number];
  note?: string; // why pending/blocked
};

export type Provider = {
  slug: string;
  name: string;
  kind: (typeof PROVIDER_KINDS)[number];
  instruments: Instrument[];
  sources: Source[];
  appliesTo?: { network: Network } | { anyCard: true };
};
