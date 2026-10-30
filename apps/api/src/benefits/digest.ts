import {
  BENEFIT_CATEGORY_LABELS,
  type BenefitCap,
  type BenefitRules,
} from '@repo/shared-types';
import type { MatchedBenefit } from './benefits.types';

const money = (minor: number) =>
  `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(minor / 100)}`;
const periods: Record<BenefitCap['period'], string> = {
  transaction: 'por compra',
  day: 'por día',
  week: 'por semana',
  month: 'por mes',
  campaign: 'por campaña',
};
const channelLabel = (channel: string) =>
  ({ modo: 'MODO', 'app-macro': 'App Macro' })[channel] ?? channel;

function offerLabel(offer: BenefitRules['offer']): string {
  switch (offer.type) {
    case 'discount':
      return `${offer.percentageBps / 100}% de descuento`;
    case 'cashback':
      return `${offer.percentageBps / 100}% de reintegro`;
    case 'installments':
      return `${offer.installments} cuotas`;
    default:
      return offer.description;
  }
}

function capLabels(rules: BenefitRules): string[] {
  if (rules.capState === 'unknown') return ['tope sin confirmar'];
  if (rules.capState === 'none') return ['sin tope'];
  return rules.caps.map(
    (cap) =>
      `${cap.amountMinor === null ? 'tope sin confirmar' : `tope ${money(cap.amountMinor)}`} ${periods[cap.period]}`,
  );
}

function channelLabels(
  channels: MatchedBenefit['match']['channels'],
): string[] {
  const parts: string[] = [];
  if (channels.allowed.length)
    parts.push(`pagando con ${channels.allowed.map(channelLabel).join(' o ')}`);
  if (channels.excluded.length)
    parts.push(`excluye ${channels.excluded.map(channelLabel).join(', ')}`);
  return parts;
}

function digestLine({
  benefit,
  match,
  instrumentLabels,
}: MatchedBenefit): string {
  const { rules } = benefit;
  const parts = [
    `${offerLabel(rules.offer)} en ${benefit.merchant ?? BENEFIT_CATEGORY_LABELS[benefit.category]}${instrumentLabels.length ? ` con ${instrumentLabels.join(' + ')}` : ''}`,
  ];
  parts.push(...channelLabels(match.channels), ...match.requiredActions);
  if (rules.minimumSpendMinor !== null && rules.minimumSpendMinor > 0)
    parts.push(`compra mínima ${money(rules.minimumSpendMinor)}`);
  parts.push(...capLabels(rules));
  if (rules.validity.to) parts.push(`hasta ${rules.validity.to}`);
  return `• ${parts.join(' · ')}`;
}

export function formatDigest(items: MatchedBenefit[]): string | null {
  if (!items.length) return null;
  return ['Beneficios de hoy 🧭', ...items.map(digestLine)].join('\n');
}
