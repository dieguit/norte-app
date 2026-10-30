import { describe, expect, it } from 'vitest';
import type {
  BenefitMatch,
  BenefitRules,
  Requirement,
} from '@repo/shared-types';
import {
  abc,
  epico,
  gourmet,
  instruments as i,
  mascotas,
  referenceRules,
  turbo,
  ypf,
} from './__fixtures__/reference-benefits';
import {
  evaluateAvailability,
  evaluateBenefit,
  evaluateEligibility,
  estimateSaving,
  rankMatches,
  type EligibilityProfile,
  type HeldInstrument,
} from './index';

const today = '2026-10-26';
const now = new Date('2026-10-26T15:00:00Z');
const profile = (...instruments: HeldInstrument[]): EligibilityProfile => ({
  instruments,
  instrumentFacts: {},
  providerFacts: {},
});

it('evaluateBenefit explicitly honors the exclusion TTL override', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const benefit = {
    id: 'manual',
    rules: ypf,
    lifecycle: 'published',
    lastVerifiedAt: new Date(now.getTime() - 8 * dayMs),
  };
  expect(evaluateBenefit(benefit, profile(), { now }).availability).toBe(
    'unavailable',
  );
  expect(
    evaluateBenefit({ ...benefit, excludeAfterMs: 90 * dayMs }, profile(), {
      now,
    }).availability,
  ).not.toBe('unavailable');
});
const match = (rules: BenefitRules, p: EligibilityProfile, clock = now) =>
  evaluateBenefit(
    { id: 'test', rules, lifecycle: 'published', lastVerifiedAt: clock },
    p,
    { now: clock },
  );
const eligibility = (req: Requirement, p: EligibilityProfile) =>
  evaluateEligibility(req, p, today);
const available = (rules: BenefitRules, day = today, extra = {}) =>
  evaluateAvailability(rules, {
    lifecycle: 'published',
    today: day,
    lastVerifiedAt: now,
    now,
    ...extra,
  });

describe('reference eligibility matrix', () => {
  it.each([
    ['MODO alone', gourmet, profile(i.modo), 'ineligible'],
    ['Selecta without MODO', gourmet, profile(i.selecta), 'ineligible'],
    [
      'unknown Macro level',
      gourmet,
      profile({ ...i.selecta, productLevel: undefined }, i.modo),
      'needs_information',
    ],
    [
      'do not combine cards',
      gourmet,
      profile(
        { ...i.selecta, segment: undefined, productLevel: 'classic' },
        { ...i.mastercard, productLevel: 'black', segment: 'selecta' },
        i.modo,
      ),
      'ineligible',
    ],
    ['Mastercard without Plus', mascotas, profile(i.mastercard), 'ineligible'],
    ['Plus with debit', mascotas, profile(i.debit, i.plus), 'ineligible'],
    ['NX without Turbo', turbo, profile(i.nx), 'ineligible'],
    ['NX without Épico', epico, profile(i.nx), 'ineligible'],
    ['Turbo active', turbo, profile(i.nx, i.turbo), 'eligible'],
    [
      'Épico does not inherit Turbo',
      turbo,
      profile(i.nx, i.epico),
      'ineligible',
    ],
    ['switch to Épico', epico, profile(i.nx, i.epico), 'eligible'],
    ['ABC unresolved issuers', abc, profile(i.cabal), 'needs_information'],
    ['YPF Mastercard', ypf, profile(i.mastercard), 'eligible'],
    [
      'Gourmet full combination',
      gourmet,
      profile(i.selecta, i.modo),
      'eligible',
    ],
    [
      'Mascotas full combination',
      mascotas,
      profile(i.mastercard, i.plus),
      'eligible',
    ],
  ])('%s', (_, rules, p, expected) =>
    expect(match(rules, p).eligibility).toBe(expected),
  );

  it('matches a different bank Visa debit, but never a membership', () => {
    const req: Requirement = { card: { network: 'visa', types: ['debit'] } };
    expect(
      eligibility(req, profile({ ...i.debit, network: 'visa' })).result,
    ).toBe('yes');
    expect(
      eligibility(req, profile({ ...i.modo, network: 'visa' })).result,
    ).toBe('no');
  });
  it('a card without a verified network never satisfies a network selector', () => {
    expect(
      eligibility(
        { card: { network: 'visa' } },
        profile({ ...i.debit, network: undefined }),
      ).result,
    ).toBe('no');
  });
  it('issuer exclusions beat inclusion', () => {
    expect(
      eligibility(
        {
          card: {
            issuerProviderSlugs: ['bank'],
            excludedIssuerProviderSlugs: ['bank'],
          },
        },
        profile(i.mastercard),
      ).result,
    ).toBe('no');
  });
  it('facts override card attributes and report unknowns precisely', () => {
    const p = profile({ ...i.selecta, productLevel: undefined }, i.modo);
    expect(match(gourmet, p).missingFacts).toContain(
      'instrument:macro-signature:productLevel',
    );
    p.instrumentFacts[i.selecta.slug] = { productLevel: 'signature' };
    expect(match(gourmet, p).eligibility).toBe('eligible');
    p.instrumentFacts[i.selecta.slug] = { productLevel: 'classic' };
    expect(match(gourmet, p).eligibility).toBe('ineligible');
  });
  it('membership validity is inclusive, inactive and unknown are not yes', () => {
    const p = profile(i.plus);
    const req: Requirement = { membership: { instrumentSlug: i.plus.slug } };
    p.instrumentFacts[i.plus.slug] = { membershipValidUntil: today };
    expect(eligibility(req, p).result).toBe('yes');
    p.instrumentFacts[i.plus.slug] = { membershipValidUntil: '2026-10-25' };
    expect(eligibility(req, p).result).toBe('no');
    p.instrumentFacts[i.plus.slug] = { membershipStatus: 'inactive' };
    expect(eligibility(req, p).result).toBe('no');
    p.instrumentFacts[i.plus.slug] = { membershipStatus: 'unknown' };
    expect(eligibility(req, p).result).toBe('unknown');
  });
  it('provider facts preserve false and ternary AND/OR', () => {
    const req: Requirement = {
      providerFact: {
        providerSlug: 'bank',
        key: 'salaryAccount',
        values: [false],
      },
    };
    const p = profile(i.mastercard);
    expect(eligibility(req, p).missingFacts).toEqual([
      'provider:bank:salaryAccount',
    ]);
    const yes: Requirement = { card: { network: 'mastercard' } };
    const no: Requirement = { membership: { instrumentSlug: 'absent' } };
    expect(eligibility({ allOf: [req, no] }, p).result).toBe('no');
    expect(eligibility({ allOf: [req, yes] }, p).result).toBe('unknown');
    expect(eligibility({ anyOf: [req, yes] }, p)).toMatchObject({
      result: 'yes',
      matchedInstrumentSlugs: [i.mastercard.slug],
      missingFacts: [],
    });
    expect(eligibility({ anyOf: [req, no] }, p).result).toBe('unknown');
    p.providerFacts.bank = { salaryAccount: false };
    expect(eligibility(req, p).result).toBe('yes');
  });
  it('only reports contributing instruments and exposes actions', () => {
    const result = match(gourmet, profile(i.selecta, i.modo, i.mastercard));
    expect(result.matchedInstrumentSlugs).toEqual([
      i.selecta.slug,
      i.modo.slug,
    ]);
    expect(result.requiredActions).toEqual([]);
    expect(result.channels).toEqual({
      allowed: ['app-macro', 'modo'],
      excluded: [],
    });
    expect(match(abc, profile(i.cabal)).channels.excluded).toEqual([
      'wallet',
      'intermediary',
    ]);
    expect(
      match(
        { ...gourmet, requiredActions: ['Activar cupón'] },
        profile(i.selecta, i.modo),
      ).requiredActions,
    ).toEqual(['Activar cupón']);
  });
  it('does not infer issuer country and rejects cards as memberships', () => {
    const p = profile({ ...i.mastercard, issuerCountry: undefined });
    expect(eligibility({ card: { issuerCountries: ['AR'] } }, p)).toMatchObject(
      {
        result: 'unknown',
        missingFacts: [`instrument:${i.mastercard.slug}:issuerCountry`],
      },
    );
    expect(
      eligibility({ membership: { instrumentSlug: i.mastercard.slug } }, p)
        .result,
    ).toBe('no');
  });
});

describe('availability', () => {
  it('carries next date and freshness into matches', () => {
    const clock = new Date('2026-10-25T15:00:00Z');
    const result = evaluateBenefit(
      {
        id: 'ypf',
        rules: ypf,
        lifecycle: 'published',
        lastVerifiedAt: new Date('2026-10-22T15:00:00Z'),
      },
      profile(i.mastercard),
      { now: clock },
    );
    expect(result).toMatchObject({
      availability: 'upcoming',
      nextDate: '2026-10-26',
      stale: true,
    });
  });
  it('uses Argentina date across UTC Sunday/Monday boundary', () => {
    expect(
      match(ypf, profile(i.mastercard), new Date('2026-10-26T02:30:00Z'))
        .availability,
    ).toBe('upcoming');
    expect(
      match(ypf, profile(i.mastercard), new Date('2026-10-26T03:00:00Z'))
        .availability,
    ).toBe('available');
    expect(
      match(ypf, profile(i.mastercard), new Date('2026-10-25T23:30:00Z'))
        .availability,
    ).toBe('upcoming');
  });
  it('enforces inclusive bounds and does not call outside-campaign upcoming', () => {
    expect(available(mascotas, '2026-10-31').availability).toBe('available');
    expect(available(mascotas, '2026-11-01').availability).toBe('unavailable');
    expect(available(ypf, '2026-09-27').availability).toBe('unavailable');
    expect(
      match(ypf, profile(i.mastercard), new Date('2027-10-26T12:00:00Z'))
        .availability,
    ).toBe('unavailable');
  });
  it('requires weekday AND month day and limits lookahead/campaign', () => {
    const rules = { ...ypf, validity: { ...ypf.validity, monthDays: [27] } };
    expect(available(rules).availability).toBe('unavailable');
    expect(available(ypf, '2026-10-25')).toMatchObject({
      availability: 'upcoming',
      nextDate: '2026-10-26',
    });
    expect(
      available(ypf, '2026-10-25', { lookaheadDays: 0 }).availability,
    ).toBe('unavailable');
    expect(available(ypf, '2026-10-30').availability).toBe('unavailable');
  });
  it('marks stale and excludes older than seven days; unverified is excluded', () => {
    expect(
      available(ypf, today, {
        lastVerifiedAt: new Date(now.getTime() - 49 * 3600000),
      }),
    ).toMatchObject({ availability: 'available', stale: true });
    expect(
      available(ypf, today, {
        lastVerifiedAt: new Date(now.getTime() - 7 * 86400000 - 1),
      }),
    ).toMatchObject({ availability: 'unavailable', reasons: ['stale'] });
    expect(available(ypf, today, { lastVerifiedAt: null }).availability).toBe(
      'unavailable',
    );
    expect(available(ypf, today, { lifecycle: 'draft' }).availability).toBe(
      'unavailable',
    );
  });
  it('does not block today for unknown end, but reports it', () => {
    expect(
      available({ ...ypf, validity: { ...ypf.validity, to: null } }),
    ).toMatchObject({
      availability: 'available',
      reasons: ['Fin de vigencia desconocido'],
    });
  });
});

describe('estimates and ranking', () => {
  it('distinguishes unknown minimum from no minimum', () => {
    expect(
      estimateSaving(
        { ...ypf, minimumSpendMinor: null },
        { amountMinor: 8000000 },
      ),
    ).toEqual({
      estimatedSavingMinor: null,
      assumptions: ['Compra mínima desconocida'],
    });
    expect(
      estimateSaving({ ...ypf, minimumSpendMinor: 0 }, { amountMinor: 100 }),
    ).toMatchObject({ estimatedSavingMinor: 10 });
  });
  it('caps 80,000 at 10% to 6,000 and explains unused cap assumption', () => {
    expect(estimateSaving(ypf, { amountMinor: 8000000 })).toEqual({
      estimatedSavingMinor: 600000,
      assumptions: ['suponiendo que no consumiste el tope'],
    });
    expect(
      estimateSaving(ypf, { amountMinor: 3499999 }).estimatedSavingMinor,
    ).toBe(0);
    expect(
      estimateSaving(gourmet, { amountMinor: 8000000 }).estimatedSavingMinor,
    ).toBeNull();
    expect(
      estimateSaving(
        { ...gourmet, capState: 'known' },
        { amountMinor: 8000000 },
      ).estimatedSavingMinor,
    ).toBeNull();
  });
  it('floors integer amounts, applies every cap, does not monetize installments', () => {
    const rules = referenceRules({ card: { network: 'visa' } });
    expect(
      estimateSaving(rules, { amountMinor: 19 }).estimatedSavingMinor,
    ).toBe(1);
    expect(
      estimateSaving(
        {
          ...rules,
          capState: 'known',
          caps: [
            { amountMinor: 50, period: 'day', scope: 'person' },
            {
              amountMinor: 30,
              period: 'month',
              scope: 'person',
              sharedCapGroupId: 'shared',
            },
          ],
        },
        { amountMinor: 1000 },
      ).estimatedSavingMinor,
    ).toBe(30);
    expect(
      estimateSaving(
        { ...rules, offer: { type: 'installments', installments: 3 } },
        { amountMinor: 1000 },
      ).estimatedSavingMinor,
    ).toBeNull();
    expect(() => estimateSaving(rules, { amountMinor: 1.5 })).toThrow(
      RangeError,
    );
  });
  it('ranks groups, preserves unknown estimates and never adds shared caps', () => {
    const base = match(ypf, profile(i.mastercard));
    const m = (
      id: string,
      amount: number | null,
      changes: Partial<BenefitMatch> = {},
    ): BenefitMatch => ({
      ...base,
      benefitId: id,
      estimatedSavingMinor: amount,
      ...changes,
    });
    const list = [
      m('upcoming', 900, { availability: 'upcoming' }),
      m('low', 10),
      m('high', 20),
      m('unknown', null, { eligibility: 'needs_information' }),
      m('info', 99, { eligibility: 'needs_information' }),
      m('no', 100, { eligibility: 'ineligible' }),
      m('expired', 200, { availability: 'unavailable' }),
    ];
    expect(rankMatches(list).map((r) => r.benefitId)).toEqual([
      'high',
      'low',
      'upcoming',
      'unknown',
      'info',
    ]);
    expect(list[0].benefitId).toBe('upcoming');
    expect(
      rankMatches([m('first', null), m('second', 900)]).map((r) => r.benefitId),
    ).toEqual(['first', 'second']);
  });
});
