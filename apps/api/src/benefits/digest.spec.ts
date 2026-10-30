import { expect, it } from 'vitest';
import type { BenefitResult } from '@repo/shared-types';
import { formatDigest, offerText } from './digest';

const item = {
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
} as BenefitResult;
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
