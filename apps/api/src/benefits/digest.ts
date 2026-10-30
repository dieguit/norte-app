import {
  CATALOG_CATEGORY_LABELS,
  type BenefitResult,
  type DigestCategory,
} from '@repo/shared-types';

export function offerText(item: Pick<BenefitResult, 'offers'>): string {
  return item.offers
    .map((offer) =>
      offer.kind === 'percent'
        ? `${offer.percentageBps / 100}% de ${offer.mode === 'discount' ? 'descuento' : offer.mode === 'cashback' ? 'reintegro' : 'ahorro'}`
        : `${offer.upTo ? 'hasta ' : ''}${offer.count} cuotas sin interés`,
    )
    .join(' y ');
}

function capText(item: BenefitResult): string {
  if (item.capState === 'none') return '';
  if (item.capState === 'unknown') return 'tope sin confirmar';
  const periods: Record<string, string> = {
    month: '/mes',
    week: '/semana',
    day: '/día',
    transaction: '/compra',
    campaign: '/promoción',
  };
  return item.caps
    .map((cap) =>
      cap.amountMinor === null
        ? 'tope sin confirmar'
        : `tope $${(cap.amountMinor / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}${periods[cap.period] ?? ''}`,
    )
    .join(', ');
}

export function formatDigest(
  items: BenefitResult[],
  categories: DigestCategory[],
  appUrl: string,
): string | null {
  const sections: string[] = [];
  let first: DigestCategory | undefined;
  for (const category of categories) {
    const matches = items.filter(
      (item) => item.match === 'eligible' && item.categories.includes(category),
    );
    if (!matches.length) continue;
    first ??= category;
    const label = CATALOG_CATEGORY_LABELS[category];
    const lines = matches.slice(0, 3).map((item) => {
      const cards = [
        ...new Set(
          item.usableWith.map(
            (u) =>
              `${u.bankName}${u.card ? ` ${{ visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', cabal: 'Cabal' }[u.card.network]} ${{ credit: 'crédito', debit: 'débito', prepaid: 'prepaga' }[u.card.type]}` : ''}`,
          ),
        ),
      ].join(' / ');
      return `• ${[item.brandName ?? item.title, offerText(item), `${cards}${item.requiresModo ? `${cards ? ' + ' : ''}MODO` : ''}`, capText(item)].filter(Boolean).join(' · ')}`;
    });
    sections.push(
      [
        label,
        ...lines,
        ...(matches.length > 3
          ? [`y ${matches.length - 3} más en ${label}`]
          : []),
      ].join('\n'),
    );
  }
  return first
    ? `Beneficios de hoy 🧭\n${sections.join('\n')}\nMirá todos en la app o pedime la lista: ${appUrl.replace(/\/$/, '')}/app/finances/benefits?category=${first}`
    : null;
}
