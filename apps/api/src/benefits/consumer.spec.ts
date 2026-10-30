import { describe, expect, it } from 'vitest';
import {
  BenefitResultSchema,
  type BenefitProfile,
  type CampaignTerms,
  type PurchaseCondition,
} from '@repo/shared-types';
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
  purchaseConditions: [],
  capState: 'none',
  caps: [],
  minimumSpendMinor: 0,
  validity: { from: '2026-10-01', to: '2026-10-31', weekdays: [3] },
  channels: [],
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
      lastSeenAt: NOW,
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
  it('preserves each same-campaign bank variant’s qualifications, cards and stable unique identity', () => {
    const base = results()[0]!;
    const branch = {
      ...base,
      match: 'conditional' as const,
      usableWith: [
        {
          bankSlug: 'macro',
          bankName: 'Macro',
          card: { type: 'debit' as const, network: 'mastercard' as const },
        },
      ],
      channels: ['online'],
      minimumSpendMinor: 100000,
      where: 'Sólo sucursal B',
      capState: 'known' as const,
      caps: [{ amountMinor: 1500000, period: 'month' as const, scope: null }],
      requiresModo: false,
      validity: { ...base.validity, weekdays: [4] },
      nextDate: '2026-10-22',
      purchaseConditions: [
        {
          kind: 'coupon' as const,
          code: 'MACRO',
          instruction: 'Ingresá MACRO',
          evidence: 'Cupón MACRO',
        },
      ],
    };
    const other = { ...branch, channels: ['qr'] };
    const [group] = groupResults([branch, base, other, { ...branch }]);
    expect(group!.usableWith).toEqual(base.usableWith);
    expect(group!.variants).toHaveLength(2);
    const variant = group!.variants.find(
      (item) => item.channels[0] === 'online',
    )!;
    for (const field of [
      'usableWith',
      'channels',
      'minimumSpendMinor',
      'where',
      'capState',
      'caps',
      'requiresModo',
      'validity',
      'nextDate',
      'purchaseConditions',
      'match',
    ] as const)
      expect(variant[field], field).toEqual(branch[field]);
    expect(variant.id).toBe(base.id);
    expect(variant.variantKey).toBe(
      JSON.stringify([
        branch.id,
        branch.usableWith,
        branch.channels,
        branch.minimumSpendMinor,
        branch.where,
        branch.capState,
        branch.caps,
        branch.requiresModo,
        branch.validity,
        branch.nextDate,
        branch.purchaseConditions,
        branch.match,
      ]),
    );
    const keys = group!.variants.map((item) => item.variantKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      groupResults([other, base, branch])[0]!
        .variants.map((item) => item.variantKey)
        .sort(),
    ).toEqual([...keys].sort());
    expect(BenefitResultSchema.safeParse(group).success).toBe(true);
  });
  it('separates profile eligibility from all five purchase condition kinds', () => {
    const conditions: PurchaseCondition[] = [
      {
        kind: 'participating_locations',
        instruction: 'Consultá los locales',
        evidence: 'Locales adheridos',
      },
      {
        kind: 'acquirer',
        mode: 'include',
        names: ['Payway'],
        evidence: 'Sólo Payway',
      },
      {
        kind: 'daily_time',
        from: '09:00:00',
        to: '18:00:00',
        timezone: 'America/Argentina/Buenos_Aires',
        evidence: 'De 9 a 18',
      },
      {
        kind: 'coupon',
        code: 'AHORRO',
        instruction: 'Ingresá AHORRO',
        evidence: 'Cupón AHORRO',
      },
      {
        kind: 'legal_purchase',
        text: 'Sólo productos seleccionados',
        evidence: 'Productos seleccionados',
      },
    ];
    for (const condition of conditions) {
      const row = candidate({ purchaseConditions: [condition] });
      expect(results(row)[0]).toMatchObject({
        match: 'conditional',
        purchaseConditions: [condition],
      });
      row.presence.tiers = { bankSlug: 'galicia', codes: ['eminent'] };
      expect(results(row)[0]).toMatchObject({
        match: 'needs_tier',
        purchaseConditions: [condition],
      });
      expect(results(row, { ...profile, usesModo: false })).toEqual([]);
      expect(
        results(row, {
          ...profile,
          banks: [{ ...profile.banks[0]!, tier: 'masivo' }],
        }),
      ).toEqual([]);
    }
    expect(results()[0]).toMatchObject({
      match: 'eligible',
      purchaseConditions: [],
    });
  });
  it('marks minimum spend and payment channels conditional, warning when the minimum is unknown', () => {
    for (const patch of [
      { minimumSpendMinor: 10000 },
      { minimumSpendMinor: null },
      { channels: ['online'] },
      { channels: ['qr', 'nfc'] },
      { channels: ['modo'] },
    ]) {
      expect(results(candidate(patch))[0]?.match).toBe('conditional');
    }
    expect(results(candidate({ minimumSpendMinor: null }))[0]).toMatchObject({
      minimumSpendMinor: null,
      warnings: ['Compra mínima sin confirmar.'],
    });
  });
  it('parses old persisted terms with defaults without upgrading incomplete or invalid data', () => {
    const row = candidate();
    delete (row.presence.terms as Partial<CampaignTerms>).purchaseConditions;
    expect(results(row)[0]?.purchaseConditions).toEqual([]);
    row.presence.terms!.eligibilityCompleteness = 'incomplete';
    row.presence.terms!.unresolved = ['Acquirer not parsed'];
    expect(results(row)).toEqual([]);
    row.presence.terms!.eligibilityCompleteness = 'complete';
    row.presence.terms!.purchaseConditions = [{ kind: 'unknown' }] as never;
    expect(results(row)).toEqual([]);
  });
  it('uses complete active bank terms despite an incomplete, expired representative', () => {
    const row = candidate();
    row.presence.lastSeenAt = new Date('2026-10-20T12:00:00Z');
    row.campaign.terms = {
      ...terms,
      eligibilityCompleteness: 'incomplete',
      unresolved: ['Unparsed requirement'],
      validity: { from: null, to: '2026-01-01', weekdays: null },
    };
    expect(results(row)[0]).toMatchObject({
      match: 'eligible',
      nextDate: '2026-10-21',
      updatedAt: '2026-10-20T12:00:00.000Z',
    });
  });
  it('ranks each match class first and never unions cards across different purchase conditions', () => {
    const base = results()[0]!;
    const condition: PurchaseCondition = {
      kind: 'coupon',
      code: null,
      instruction: 'Pedí un cupón',
      evidence: 'Cupón requerido',
    };
    const conditional = {
      ...base,
      id: '00000000-0000-4000-8000-000000000002',
      match: 'conditional' as const,
      purchaseConditions: [condition],
      offers: [
        {
          kind: 'percent' as const,
          percentageBps: 9000,
          mode: 'discount' as const,
        },
      ],
    };
    const tier = {
      ...conditional,
      id: '00000000-0000-4000-8000-000000000003',
      match: 'needs_tier' as const,
    };
    const [group] = groupResults([tier, conditional, base]);
    expect(group).toMatchObject({
      id: base.id,
      match: 'eligible',
      variants: [
        {
          id: conditional.id,
          match: 'conditional',
          purchaseConditions: [condition],
        },
        { id: tier.id, match: 'needs_tier', purchaseConditions: [condition] },
      ],
    });
    expect(BenefitResultSchema.safeParse(group).success).toBe(true);
    const missingMatch = {
      ...group,
      variants: [
        {
          id: conditional.id,
          offers: conditional.offers,
          tierLabels: [],
          purchaseConditions: [],
        },
      ],
    };
    expect(BenefitResultSchema.safeParse(missingMatch).success).toBe(false);
    const differentBank = {
      ...base,
      match: 'conditional' as const,
      purchaseConditions: [condition],
      usableWith: [{ bankSlug: 'macro', bankName: 'Macro', card: null }],
    };
    const [sameCampaign] = groupResults([differentBank, base]);
    expect(sameCampaign!.usableWith).toEqual(base.usableWith);
    expect(sameCampaign!.variants).toMatchObject([
      { id: base.id, match: 'conditional', purchaseConditions: [condition] },
    ]);
    const separate = [tier, conditional, base].map((item) => ({
      ...item,
      title: item.id,
    }));
    expect(groupResults(separate).map((item) => item.match)).toEqual([
      'eligible',
      'conditional',
      'needs_tier',
    ]);
  });
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
    expect(rankResults(base, better)).toBeLessThan(0);
    expect(rankResults(base, { ...better, match: 'eligible' })).toBeGreaterThan(
      0,
    );
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
