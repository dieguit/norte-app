import type {
  CardSelector,
  InstrumentFacts,
  ProviderFacts,
  Requirement,
} from '@repo/shared-types';
import type { Instrument } from '../catalog/types';

export type HeldInstrument = Instrument & { providerSlug: string };
export type EligibilityProfile = {
  instruments: HeldInstrument[];
  instrumentFacts: Record<string, InstrumentFacts>;
  providerFacts: Record<string, ProviderFacts>;
};
type Evaluation = {
  result: 'yes' | 'no' | 'unknown';
  matchedInstrumentSlugs: string[];
  missingFacts: string[];
  reasons: string[];
};
const unique = (values: string[]) => [...new Set(values)];
function combine(children: Evaluation[], and: boolean): Evaluation {
  const results = children.map((c) => c.result);
  const result = and
    ? results.includes('no')
      ? 'no'
      : results.every((r) => r === 'yes')
        ? 'yes'
        : 'unknown'
    : results.includes('yes')
      ? 'yes'
      : results.every((r) => r === 'no')
        ? 'no'
        : 'unknown';
  return {
    result,
    matchedInstrumentSlugs:
      result === 'yes'
        ? unique(
            children
              .filter((c) => c.result === 'yes')
              .flatMap((c) => c.matchedInstrumentSlugs),
          )
        : [],
    missingFacts:
      result === 'unknown'
        ? unique(
            children
              .filter((c) => c.result === 'unknown')
              .flatMap((c) => c.missingFacts),
          )
        : [],
    reasons:
      result === 'yes'
        ? []
        : unique(
            children
              .filter((c) => c.result !== 'yes')
              .flatMap((c) => c.reasons),
          ),
  };
}
const leaf = (
  result: Evaluation['result'],
  slug?: string,
  missing?: string,
  reason?: string,
): Evaluation => ({
  result,
  matchedInstrumentSlugs: result === 'yes' && slug ? [slug] : [],
  missingFacts: missing ? [missing] : [],
  reasons: reason ? [reason] : [],
});

function evaluateCard(
  selector: CardSelector,
  instrument: HeldInstrument,
  profile: EligibilityProfile,
): Evaluation {
  const facts = profile.instrumentFacts[instrument.slug];
  const issuer = instrument.issuerProviderSlug ?? instrument.providerSlug;
  if (selector.excludedIssuerProviderSlugs?.includes(issuer))
    return leaf('no', undefined, undefined, `Emisor excluido: ${issuer}`);
  return combine(
    cardFields(selector, instrument, facts, issuer)
      .filter(([, allowed]) => allowed !== undefined)
      .map(([key, allowed, value]) =>
        value === undefined
          ? leaf(
              'unknown',
              undefined,
              `instrument:${instrument.slug}:${key}`,
              `Falta confirmar ${key}`,
            )
          : leaf(
              allowed!.includes(value) ? 'yes' : 'no',
              instrument.slug,
              undefined,
              allowed!.includes(value)
                ? undefined
                : `La tarjeta ${instrument.slug} no cumple ${key}`,
            ),
      ),
    true,
  );
}

function cardFields(
  selector: CardSelector,
  instrument: HeldInstrument,
  facts: InstrumentFacts | undefined,
  issuer: string,
): [string, readonly string[] | undefined, string | undefined][] {
  return [
    ['slug', selector.instrumentSlugs, instrument.slug],
    ['issuerProviderSlug', selector.issuerProviderSlugs, issuer],
    // Catalog only sets a network once verified; a user can't fix it, so missing is a no, not unknown.
    [
      'network',
      selector.network ? [selector.network] : undefined,
      instrument.network ?? 'none',
    ],
    ['type', selector.types, instrument.type],
    [
      'productLevel',
      selector.productLevels,
      facts?.productLevel ?? instrument.productLevel,
    ],
    ['segment', selector.segments, facts?.segment ?? instrument.segment],
    [
      'issuerCountry',
      selector.issuerCountries,
      facts?.issuerCountry ?? instrument.issuerCountry,
    ],
  ];
}

export function evaluateEligibility(
  req: Requirement,
  profile: EligibilityProfile,
  today: string,
): Evaluation {
  if ('allOf' in req)
    return combine(
      req.allOf.map((r) => evaluateEligibility(r, profile, today)),
      true,
    );
  if ('anyOf' in req)
    return combine(
      req.anyOf.map((r) => evaluateEligibility(r, profile, today)),
      false,
    );
  if ('card' in req) {
    const cards = profile.instruments.filter((i) => i.type !== 'membership');
    return cards.length
      ? combine(
          cards.map((i) => evaluateCard(req.card, i, profile)),
          false,
        )
      : leaf('no', undefined, undefined, 'Falta una tarjeta admitida');
  }
  if ('membership' in req)
    return evaluateMembership(req.membership.instrumentSlug, profile, today);
  const { providerSlug, key, values } = req.providerFact;
  const value = profile.providerFacts[providerSlug]?.[key];
  return value === undefined
    ? leaf(
        'unknown',
        undefined,
        `provider:${providerSlug}:${key}`,
        `Falta confirmar ${key}`,
      )
    : leaf(
        values.includes(value) ? 'yes' : 'no',
        undefined,
        undefined,
        values.includes(value) ? undefined : `No cumple ${providerSlug}:${key}`,
      );
}

function evaluateMembership(
  slug: string,
  profile: EligibilityProfile,
  today: string,
): Evaluation {
  const facts = profile.instrumentFacts[slug];
  if (
    !profile.instruments.some(
      (i) => i.slug === slug && i.type === 'membership',
    ) ||
    facts?.membershipStatus === 'inactive' ||
    (facts?.membershipValidUntil && facts.membershipValidUntil < today)
  )
    return leaf('no', undefined, undefined, `Falta membresía activa: ${slug}`);
  if (facts?.membershipStatus === 'unknown')
    return leaf(
      'unknown',
      undefined,
      `instrument:${slug}:membershipStatus`,
      `Falta confirmar membresía: ${slug}`,
    );
  return leaf('yes', slug);
}
