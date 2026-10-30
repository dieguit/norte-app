import { describe, expect, it } from 'vitest';
import type { BenefitProfile, CampaignTerms } from '@repo/shared-types';
import { buildResults, groupResults, nextDate, rankResults } from './consumer';

export const NOW = new Date('2026-10-22T02:00:00Z'); // Wednesday in Argentina.
export const terms: CampaignTerms = {
  offers: [{ kind: 'percent', percentageBps: 2000, mode: 'cashback' }],
  eligibility: {
    allOf: [
      {
        card: {
          issuerProviderSlugs: ['galicia'],
          types: ['credit'],
          network: 'visa',
        },
      },
      { membership: { instrumentSlug: 'modo' } },
    ],
  },
  eligibilityCompleteness: 'complete',
  unresolved: [],
  capState: 'none',
  caps: [],
  minimumSpendMinor: 0,
  validity: { from: '2026-10-01', to: '2026-10-31', weekdays: [3] },
  channels: ['modo'],
  where: null,
  legalText: null,
  warnings: [],
};
export const profile: BenefitProfile = {
  banks: [
    {
      slug: 'galicia',
      tier: null,
      cards: [{ type: 'credit', network: 'visa' }],
    },
  ],
  usesModo: true,
  categories: ['supermercados'],
  enabled: false,
};
export function candidate(
  patch: Partial<CampaignTerms> = {},
  id = '00000000-0000-4000-8000-000000000001',
) {
  return {
    campaign: {
      id,
      source: 'galicia',
      externalId: id,
      brandId: null,
      title: 'Coto',
      categories: ['supermercados'],
      terms: { ...terms, ...patch },
      tiers: null,
      hidden: false,
      withdrawnAt: null,
      verifyUrl: 'https://example.com',
      verifyHint: 'Buscá Coto',
      lastSeenAt: NOW,
      detailFetchedAt: NOW,
    },
    presence: {
      bankSlug: 'galicia',
      withdrawnAt: null,
      terms: { ...terms, ...patch },
      tiers: null,
    },
    brand: null,
  } as Parameters<typeof buildResults>[0][number];
}
const results = (row = candidate(), prefs = profile) =>
  buildResults([row], prefs, [], 'today', NOW);

describe('v3 consumer eligibility', () => {
  it('keeps visibility gates and presence-tier mapping when including ineligible details', () => {
    const row = candidate();
    row.presence.tiers = { bankSlug: 'galicia', codes: ['eminent'] };
    expect(results(row)[0]).toMatchObject({
      match: 'needs_tier',
      tierLabels: ['Éminent'],
    });
    const noModo = { ...profile, usesModo: false };
    expect(buildResults([row], noModo, [], 'today', NOW, true)[0]?.match).toBe(
      'ineligible',
    );
    for (const hidden of [
      { ...row, campaign: { ...row.campaign, hidden: true } },
      { ...row, campaign: { ...row.campaign, withdrawnAt: NOW } },
      { ...row, presence: { ...row.presence, withdrawnAt: NOW } },
    ])
      expect(buildResults([hidden], profile, [], 'today', NOW, true)).toEqual(
        [],
      );
  });
  it('never borrows another bank’s complete canonical terms for an unknown branch', () => {
    const row = candidate();
    row.presence.terms = null;
    expect(results(row)).toEqual([]);
  });
  it('maps known cards and required MODO; rejects wrong network/type and absent MODO', () => {
    expect(results()[0]).toMatchObject({
      match: 'eligible',
      requiresModo: true,
      usableWith: [
        { bankSlug: 'galicia', card: { type: 'credit', network: 'visa' } },
      ],
    });
    expect(results(candidate(), { ...profile, usesModo: false })).toEqual([]);
    for (const card of [
      { type: 'debit', network: 'visa' },
      { type: 'credit', network: 'mastercard' },
    ] as const)
      expect(
        results(candidate(), {
          ...profile,
          banks: [{ ...profile.banks[0]!, cards: [card] }],
        }),
      ).toEqual([]);
    expect(
      results(candidate({ eligibility: { card: { types: ['credit'] } } }))[0]
        ?.requiresModo,
    ).toBe(false);
  });
  it('only missing tiers become needs_tier; wrong tiers and other unknowns are excluded', () => {
    const row = candidate({
      eligibility: {
        allOf: [
          terms.eligibility,
          {
            providerFact: {
              providerSlug: 'galicia',
              key: 'tier',
              values: ['eminent'],
            },
          },
        ],
      },
    });
    expect(results(row)[0]).toMatchObject({
      match: 'needs_tier',
      tierLabels: ['Éminent'],
      usableWith: [{ bankSlug: 'galicia' }],
    });
    expect(
      results(row, {
        ...profile,
        banks: [{ ...profile.banks[0]!, tier: 'masivo' }],
      }),
    ).toEqual([]);
    expect(
      results(row, {
        ...profile,
        banks: [{ ...profile.banks[0]!, tier: 'eminent' }],
      })[0]?.match,
    ).toBe('eligible');
    expect(
      results(
        candidate({
          eligibility: {
            providerFact: {
              providerSlug: 'galicia',
              key: 'salaryAccount',
              values: [true],
            },
          },
        }),
      ),
    ).toEqual([]);
    expect(
      results(candidate({ eligibilityCompleteness: 'incomplete' })),
    ).toEqual([]);
  });
  it('uses AR dates, inclusive windows and weekdays', () => {
    expect(nextDate(terms, 'today', NOW)).toBe('2026-10-21');
    expect(nextDate(terms, 'tomorrow', NOW)).toBeNull();
    expect(
      nextDate(
        {
          ...terms,
          validity: { from: '2026-10-23', to: '2026-10-24', weekdays: null },
        },
        'week',
        NOW,
      ),
    ).toBe('2026-10-23');
    expect(
      nextDate(
        {
          ...terms,
          validity: { from: null, to: '2026-10-20', weekdays: null },
        },
        'week',
        NOW,
      ),
    ).toBeNull();
  });
  it('groups variants, prefers eligible then ranks percent, installments and caps', () => {
    const base = results()[0]!;
    const better = {
      ...base,
      id: 'better',
      offers: [
        {
          kind: 'percent' as const,
          percentageBps: 3000,
          mode: 'cashback' as const,
        },
      ],
      match: 'needs_tier' as const,
    };
    expect(groupResults([better, base])).toMatchObject([
      { id: base.id, variants: [{ id: 'better' }] },
    ]);
    expect(rankResults(base, better)).toBeGreaterThan(0);
    expect(rankResults(base, { ...base, capState: 'unknown' })).toBeLessThan(0);
    expect(
      groupResults([
        base,
        { ...base, validity: { ...base.validity, to: null } },
      ]),
    ).toHaveLength(2);
  });
  it('lists eligible before level-only groups and keeps bank-specific locations apart', () => {
    const base = results()[0]!;
    const tierOnly = {
      ...base,
      id: 'tier-only',
      validity: { ...base.validity, to: null },
      offers: [
        {
          kind: 'percent' as const,
          percentageBps: 9000,
          mode: 'cashback' as const,
        },
      ],
      match: 'needs_tier' as const,
    };
    expect(groupResults([tierOnly, base]).map((r) => r.id)).toEqual([
      base.id,
      'tier-only',
    ]);
    const elsewhere = {
      ...base,
      where: 'Sólo en sucursal B',
      usableWith: [{ bankSlug: 'macro', bankName: 'Macro', card: null }],
    };
    const [grouped] = groupResults([base, elsewhere]);
    expect(grouped!.usableWith.map((u) => u.bankSlug)).not.toContain('macro');
  });
});
