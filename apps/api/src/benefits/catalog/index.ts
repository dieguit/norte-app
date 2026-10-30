import { galicia } from './galicia';
import { macro } from './macro';
import { santander } from './santander';
import { bbva } from './bbva';
import { brubank } from './brubank';
import { naranjax } from './naranjax';
import { personalpay } from './personalpay';
import { uala } from './uala';
import { mercadopago } from './mercadopago';
import { ypf } from './ypf';
import { shell } from './shell';
import { meli } from './meli';
import { uber } from './uber';
import { pedidosya } from './pedidosya';
import { mastercard } from './mastercard';
import { modo } from './modo';
import type { Instrument, Provider } from './types';
import { visa } from './visa';

export type { Instrument, Provider, Source } from './types';

export const CATALOG: Provider[] = [
  galicia,
  macro,
  santander,
  bbva,
  brubank,
  modo,
  naranjax,
  personalpay,
  uala,
  mercadopago,
  ypf,
  shell,
  meli,
  uber,
  pedidosya,
  visa,
  mastercard,
];

export const INSTRUMENTS = new Map(
  CATALOG.flatMap((p) =>
    p.instruments.map((i) => [i.slug, { ...i, providerSlug: p.slug }] as const),
  ),
);

export function resolveCandidateInstruments(
  provider: Provider,
  catalog: Provider[] = CATALOG,
): Instrument[] {
  const appliesTo = provider.appliesTo;
  const others = appliesTo
    ? catalog
        .flatMap((p) => p.instruments)
        .filter(
          (i) =>
            i.type !== 'membership' &&
            ('anyCard' in appliesTo || i.network === appliesTo.network),
        )
    : [];
  // Bank and network promos often require paying through a wallet (e.g. "con MODO").
  const wallets = catalog
    .flatMap((p) => p.instruments)
    .filter((i) => i.usage === 'wallet_access');
  return [
    ...new Map(
      [...provider.instruments, ...others, ...wallets].map((i) => [i.slug, i]),
    ).values(),
  ];
}
