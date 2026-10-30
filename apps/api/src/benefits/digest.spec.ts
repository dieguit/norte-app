import { describe, expect, it } from 'vitest';
import type { MatchedBenefit } from './benefits.types';
import { formatDigest } from './digest';

const item = (): MatchedBenefit => ({
  benefit: {
    id: 'b',
    publisherProviderSlug: 'macro',
    category: 'supermercado',
    origin: 'harvest',
    title: 'Promo',
    merchant: 'Coto',
    sourceUrl: 'https://example.com',
    termsUrl: null,
    rules: {
      eligibility: { membership: { instrumentSlug: 'modo' } },
      eligibilityCompleteness: 'complete',
      unresolved: [],
      offer: { type: 'cashback', percentageBps: 2500 },
      currency: 'ARS',
      minimumSpendMinor: 1000000,
      capState: 'known',
      caps: [{ amountMinor: 500000, period: 'month', scope: 'person' }],
      validity: {
        from: null,
        to: '2026-10-31',
        weekdays: null,
        monthDays: null,
      },
      channels: { allowed: ['app-macro', 'modo'], excluded: ['efectivo'] },
      requiredActions: [],
      stackable: 'unknown',
      recurrence: 'campaign',
    },
  },
  match: {
    benefitId: 'b',
    eligibility: 'eligible',
    availability: 'available',
    nextDate: null,
    stale: false,
    channels: { allowed: ['app-macro', 'modo'], excluded: ['efectivo'] },
    matchedInstrumentSlugs: ['macro', 'modo'],
    missingFacts: [],
    reasons: [],
    requiredActions: [],
    estimatedSavingMinor: null,
    estimateAssumptions: [],
  },
  instrumentLabels: ['Macro Selecta Visa Signature', 'MODO'],
});

describe('formatDigest', () => {
  it('returns null for no matches', () => expect(formatDigest([])).toBeNull());
  it('formats combos, channel alternatives, exclusions, minor units and validity', () => {
    expect(formatDigest([item()])).toBe(
      'Beneficios de hoy 🧭\n• 25% de reintegro en Coto con Macro Selecta Visa Signature + MODO · pagando con App Macro o MODO · excluye efectivo · compra mínima $10.000 · tope $5.000 por mes · hasta 2026-10-31',
    );
  });
  it('never calls an unknown cap unlimited', () => {
    const benefit = item();
    benefit.benefit.rules.capState = 'unknown';
    benefit.benefit.rules.caps = [];
    expect(formatDigest([benefit])).toContain('tope sin confirmar');
    expect(formatDigest([benefit])).not.toContain('sin tope');
  });
  it('formats discounts, installments and explicitly unlimited caps', () => {
    const benefit = item();
    benefit.benefit.rules.offer = { type: 'discount', percentageBps: 1250 };
    benefit.benefit.rules.capState = 'none';
    benefit.benefit.rules.caps = [];
    expect(formatDigest([benefit])).toContain('12.5% de descuento');
    expect(formatDigest([benefit])).toContain('sin tope');
    benefit.benefit.rules.offer = { type: 'installments', installments: 6 };
    expect(formatDigest([benefit])).toContain('6 cuotas');
    expect(formatDigest([benefit])).not.toContain('sin interés');
  });
});
