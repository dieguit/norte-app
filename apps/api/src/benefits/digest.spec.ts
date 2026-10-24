import { describe, expect, it } from 'vitest';
import { formatDigest, rankBenefits, type MatchedBenefit } from './digest';

const item = (over: Partial<MatchedBenefit>): MatchedBenefit => ({
  title: 't',
  merchant: null,
  category: 'supermercado',
  kind: 'discount',
  value: 10,
  maxAmount: null,
  maxAmountPeriod: null,
  conditions: null,
  sourceUrl: 'u',
  instrumentLabel: 'Galicia Visa crédito',
  ...over,
});

describe('formatDigest', () => {
  it('returns null when nothing matches', () => {
    expect(formatDigest([])).toBeNull();
  });

  it('renders each kind and cap variant, ranked', () => {
    const text = formatDigest([
      item({
        kind: 'installments',
        value: 6,
        merchant: 'Garbarino',
        instrumentLabel: 'Santander Mastercard',
      }),
      item({
        kind: 'discount',
        value: 20,
        merchant: 'Coto',
        maxAmount: 15000,
        maxAmountPeriod: 'month',
      }),
      item({
        kind: 'nxm',
        value: 2,
        merchant: 'Cinemark',
        category: 'cine',
        instrumentLabel: 'Clarín 365',
      }),
      item({
        kind: 'cashback',
        value: 25,
        category: 'combustible',
        maxAmount: 5000,
        maxAmountPeriod: 'transaction',
      }),
      item({
        kind: 'discount',
        value: 10,
        merchant: 'Farmacity',
        category: 'farmacia',
        maxAmount: 3000,
      }),
    ]);
    expect(text).toBe(
      [
        'Beneficios de hoy 🧭',
        '• 2x1 en Cinemark con Clarín 365',
        '• 25% de reintegro en Combustible con Galicia Visa crédito (tope $5.000 por compra)',
        '• 20% en Coto con Galicia Visa crédito (tope $15.000/mes)',
        '• 10% en Farmacity con Galicia Visa crédito (tope $3.000)',
        '• 6 cuotas sin interés en Garbarino con Santander Mastercard',
      ].join('\n'),
    );
  });

  it('appends conditions at the end of the line when present', () => {
    const text = formatDigest([
      item({
        value: 20,
        merchant: 'Coto',
        conditions: 'mínimo $20.000, pagando con MODO',
      }),
      item({
        value: 10,
        merchant: 'Farmacity',
        maxAmount: 5000,
        maxAmountPeriod: 'month',
        conditions: 'online',
      }),
      item({
        value: 5,
        merchant: 'Jumbo',
        conditions: '   ',
      }),
    ]);
    expect(text).toBe(
      [
        'Beneficios de hoy 🧭',
        '• 20% en Coto con Galicia Visa crédito · mínimo $20.000, pagando con MODO',
        '• 10% en Farmacity con Galicia Visa crédito (tope $5.000/mes) · online',
        '• 5% en Jumbo con Galicia Visa crédito',
      ].join('\n'),
    );
  });
});

describe('rankBenefits', () => {
  it('orders nxm, then discount/cashback by value, then installments', () => {
    const ranked = rankBenefits([
      { kind: 'installments' as const, value: 12 },
      { kind: 'discount' as const, value: 10 },
      { kind: 'cashback' as const, value: 30 },
      { kind: 'nxm' as const, value: 2 },
    ]);
    expect(ranked.map((r) => `${r.kind}:${r.value}`)).toEqual([
      'nxm:2',
      'cashback:30',
      'discount:10',
      'installments:12',
    ]);
  });
});
