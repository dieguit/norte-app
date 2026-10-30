import { expect, it } from 'vitest';
import type { BenefitResult } from '@repo/shared-types';
import { formatDigest, offerText } from './digest';

const item: BenefitResult = {
  id: '00000000-0000-4000-8000-000000000001',
  source: 'galicia',
  validity: { from: null, to: null, weekdays: null },
  nextDate: '2026-10-30',
  tierLabels: [],
  variants: [],
  verifyUrl: 'https://example.com',
  verifyHint: null,
  updatedAt: '2026-10-30T00:00:00Z',
  brandName: 'Coto',
  title: 'Coto',
  categories: ['supermercados'],
  offers: [{ kind: 'percent', percentageBps: 2000, mode: 'cashback' }],
  capState: 'known',
  caps: [{ amountMinor: 1500000, period: 'month', scope: null }],
  usableWith: [
    {
      bankName: 'Galicia',
      bankSlug: 'galicia',
      card: { network: 'visa', type: 'credit' },
    },
  ],
  requiresModo: true,
  match: 'eligible',
  purchaseConditions: [],
  minimumSpendMinor: 0,
  channels: [],
  where: null,
};
it('formats offers, caps, category limit and deep link; skips empty/ineligible', () => {
  const text = formatDigest(
    Array.from({ length: 5 }, () => item),
    ['supermercados'],
    'https://app.test/',
  );
  expect(text).toBe(
    'Beneficios de hoy 🧭\nSupermercados\n' +
      Array(3)
        .fill(
          '• Coto · 20% de reintegro · Galicia Visa crédito + MODO · tope $15.000/mes',
        )
        .join('\n') +
      '\ny 2 más en Supermercados\nMirá todos en la app o pedime la lista: https://app.test/app/finances/benefits?category=supermercados',
  );
  expect(formatDigest([], ['supermercados'], '')).toBeNull();
  expect(
    formatDigest([{ ...item, match: 'needs_tier' }], ['supermercados'], ''),
  ).toBeNull();
  expect(
    formatDigest([{ ...item, capState: 'unknown' }], ['supermercados'], ''),
  ).toContain('tope sin confirmar');
  expect(
    formatDigest([{ ...item, capState: 'none' }], ['supermercados'], ''),
  ).not.toContain('tope');
  expect(
    offerText({
      offers: [
        { kind: 'percent', percentageBps: 1500, mode: 'discount' },
        { kind: 'installments', count: 6, upTo: true },
      ],
    }),
  ).toBe('15% de descuento y hasta 6 cuotas sin interés');
  expect(
    offerText({
      offers: [
        { kind: 'percent', percentageBps: 1000, mode: 'unspecified' },
        { kind: 'installments', count: 3, upTo: false },
      ],
    }),
  ).toBe('10% de ahorro y 3 cuotas sin interés');
});

it('includes structured conditional requirements without losing polarity or unknowns', () => {
  const conditional: BenefitResult = {
    ...item,
    match: 'conditional',
    minimumSpendMinor: null,
    channels: ['online'],
    where: 'CABA',
    purchaseConditions: [
      {
        kind: 'participating_locations',
        instruction: 'ver locales en la fuente',
        evidence: 'locales',
      },
      {
        kind: 'acquirer',
        mode: 'exclude',
        names: ['Payway'],
        evidence: 'excepto',
      },
      {
        kind: 'daily_time',
        from: '10:00:00',
        to: '12:30:00',
        timezone: 'America/Argentina/Buenos_Aires',
        evidence: 'horario',
      },
      {
        kind: 'coupon',
        code: 'AHORRO',
        instruction: 'ingresarlo al pagar',
        evidence: 'cupón',
      },
    ],
  };
  const text = formatDigest([conditional], ['supermercados'], '');
  for (const qualifier of [
    'locales adheridos: ver locales en la fuente',
    'excepto cobros por Payway',
    '10:00:00–12:30:00 (hora Argentina)',
    'cupón AHORRO: ingresarlo al pagar',
    'mínimo sin confirmar',
    'online',
    'CABA',
  ]) {
    expect(text).toContain(qualifier);
  }
  expect(
    formatDigest(
      [{ ...conditional, minimumSpendMinor: 100000 }],
      ['supermercados'],
      '',
    ),
  ).toContain('compra mínima $1.000');
});

it('skips legal and oversized qualifiers before counting the three-item limit', () => {
  const legal: BenefitResult = {
    ...item,
    match: 'conditional',
    purchaseConditions: [
      { kind: 'legal_purchase', text: 'Restricción', evidence: 'legal' },
    ],
  };
  const long: BenefitResult = {
    ...item,
    match: 'conditional',
    purchaseConditions: [
      {
        kind: 'participating_locations',
        instruction: 'x'.repeat(500),
        evidence: 'locales',
      },
    ],
  };
  expect(formatDigest([legal, long], ['supermercados'], '')).toBeNull();
  const text = formatDigest(
    [legal, long, ...Array.from({ length: 4 }, () => item)],
    ['supermercados'],
    '',
  );
  expect(text).toContain('y 1 más en Supermercados');
  expect(text?.match(/• /g)).toHaveLength(3);
});
