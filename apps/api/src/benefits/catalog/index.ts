import { galicia } from './galicia';
import { modo } from './modo';
import type { Instrument, Provider } from './types';
import { visa } from './visa';

export type { Instrument, Provider, Source } from './types';

export const CATALOG: Provider[] = [galicia, visa, modo];

export const INSTRUMENTS = new Map(
  CATALOG.flatMap((p) =>
    p.instruments.map((i) => [i.slug, { ...i, providerSlug: p.slug }] as const),
  ),
);

export function candidateInstruments(provider: Provider): Instrument[] {
  const network = provider.appliesTo?.network;
  const others = network
    ? CATALOG.flatMap((p) => p.instruments).filter((i) => i.network === network)
    : [];
  return [
    ...new Map(
      [...provider.instruments, ...others].map((i) => [i.slug, i]),
    ).values(),
  ];
}
