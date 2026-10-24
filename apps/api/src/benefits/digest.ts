import {
  BENEFIT_CATEGORY_LABELS,
  type BenefitCapPeriod,
  type BenefitCategory,
  type BenefitKind,
} from '@repo/shared-types';

export type MatchedBenefit = {
  title: string;
  merchant: string | null;
  category: BenefitCategory;
  kind: BenefitKind;
  value: number;
  maxAmount: number | null;
  maxAmountPeriod: BenefitCapPeriod | null;
  conditions: string | null;
  sourceUrl: string;
  instrumentLabel: string;
};

const KIND_RANK: Record<BenefitKind, number> = {
  nxm: 0,
  discount: 1,
  cashback: 1,
  installments: 2,
};
const PERIOD_SUFFIX: Record<BenefitCapPeriod, string> = {
  transaction: ' por compra',
  day: '/día',
  week: '/semana',
  month: '/mes',
};
const ars = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export const rankBenefits = <T extends { kind: BenefitKind; value: number }>(
  rows: T[],
): T[] =>
  [...rows].sort(
    (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.value - a.value,
  );

function valueLabel({ kind, value }: MatchedBenefit): string {
  switch (kind) {
    case 'discount':
      return `${value}%`;
    case 'cashback':
      return `${value}% de reintegro`;
    case 'installments':
      return `${value} cuotas sin interés`;
    case 'nxm':
      return `${value}x${value - 1}`;
  }
}

function capLabel({ maxAmount, maxAmountPeriod }: MatchedBenefit): string {
  if (maxAmount === null) return '';
  return ` (tope $${ars.format(maxAmount)}${maxAmountPeriod ? PERIOD_SUFFIX[maxAmountPeriod] : ''})`;
}

export function formatDigest(items: MatchedBenefit[]): string | null {
  if (!items.length) return null;
  const lines = rankBenefits(items).map(
    (b) =>
      `• ${valueLabel(b)} en ${b.merchant ?? BENEFIT_CATEGORY_LABELS[b.category]} con ${b.instrumentLabel}${capLabel(b)}`,
  );
  return ['Beneficios de hoy 🧭', ...lines].join('\n');
}
