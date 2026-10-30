import type { BenefitRules } from '@repo/shared-types';

export function estimateSaving(
  rules: BenefitRules,
  purchase: { amountMinor: number },
): { estimatedSavingMinor: number | null; assumptions: string[] } {
  if (!Number.isSafeInteger(purchase.amountMinor) || purchase.amountMinor < 0)
    throw new RangeError('amountMinor debe ser un entero seguro no negativo');
  if (rules.offer.type !== 'discount' && rules.offer.type !== 'cashback')
    return { estimatedSavingMinor: null, assumptions: ['Oferta no monetaria'] };
  if (rules.minimumSpendMinor === null)
    return {
      estimatedSavingMinor: null,
      assumptions: ['Compra mínima desconocida'],
    };
  if (purchase.amountMinor < rules.minimumSpendMinor)
    return {
      estimatedSavingMinor: 0,
      assumptions: ['Compra inferior al mínimo'],
    };
  if (
    rules.capState === 'unknown' ||
    rules.caps.some((cap) => cap.amountMinor === null)
  )
    return { estimatedSavingMinor: null, assumptions: ['Tope desconocido'] };
  const gross = Number(
    (BigInt(purchase.amountMinor) * BigInt(rules.offer.percentageBps)) / 10000n,
  );
  return {
    estimatedSavingMinor: Math.min(
      gross,
      ...rules.caps.map((cap) => cap.amountMinor!),
    ),
    assumptions: rules.caps.length
      ? ['suponiendo que no consumiste el tope']
      : [],
  };
}
