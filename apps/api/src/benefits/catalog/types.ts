import type {
  CARD_NETWORKS,
  INSTRUMENT_TYPES,
  PROVIDER_KINDS,
} from '@repo/shared-types';

type Network = (typeof CARD_NETWORKS)[number];

export type Instrument = {
  slug: string;
  label: string;
  network?: Network;
  type: (typeof INSTRUMENT_TYPES)[number];
  tier?: string;
};

export type Source = {
  url: string;
  strategy: 'fetch' | 'json';
  instructions: string;
};

export type Provider = {
  slug: string;
  name: string;
  kind: (typeof PROVIDER_KINDS)[number];
  instruments: Instrument[];
  sources: Source[];
  appliesTo?: { network: Network };
};
