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

function purchaseQualifiers(item: BenefitResult): string[] | null {
  const qualifiers: string[] = [];
  for (const condition of item.purchaseConditions) {
    switch (condition.kind) {
      case 'legal_purchase':
        return null;
      case 'participating_locations':
        qualifiers.push(`locales adheridos: ${condition.instruction}`);
        break;
      case 'acquirer':
        qualifiers.push(
          `${condition.mode === 'exclude' ? 'excepto' : 'sólo'} cobros por ${condition.names.join(', ')}`,
        );
        break;
      case 'daily_time':
        qualifiers.push(`${condition.from}–${condition.to} (hora Argentina)`);
        break;
      case 'coupon':
        qualifiers.push(
          `cupón${condition.code ? ` ${condition.code}` : ''}: ${condition.instruction}`,
        );
        break;
    }
  }
  return qualifiers;
}

function minimumText(amount: number | null): string {
  if (amount === null) return 'mínimo sin confirmar';
  return amount > 0
    ? `compra mínima $${(amount / 100).toLocaleString('es-AR')}`
    : '';
}

function digestLine(item: BenefitResult): string | null {
  if (item.match !== 'eligible' && item.match !== 'conditional') return null;
  const qualifiers = purchaseQualifiers(item);
  if (qualifiers === null) return null;
  const cards = [
    ...new Set(
      item.usableWith.map(
        (u) =>
          `${u.bankName}${u.card ? ` ${{ visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', cabal: 'Cabal' }[u.card.network]} ${{ credit: 'crédito', debit: 'débito', prepaid: 'prepaga' }[u.card.type]}` : ''}`,
      ),
    ),
  ].join(' / ');
  const minimum = minimumText(item.minimumSpendMinor);
  const line = `• ${[item.brandName ?? item.title, offerText(item), `${cards}${item.requiresModo ? `${cards ? ' + ' : ''}MODO` : ''}`, capText(item), minimum, item.channels.join(' / '), item.where, ...qualifiers].filter(Boolean).join(' · ')}`;
  // Keep every purchase qualifier intact; oversized items belong in the app.
  return line.length <= 500 ? line : null;
}

export function formatDigest(
  items: BenefitResult[],
  categories: DigestCategory[],
  appUrl: string,
): string | null {
  const sections: string[] = [];
  let first: DigestCategory | undefined;
  for (const category of categories) {
    const matches = items
      .filter((item) => item.categories.includes(category))
      .map(digestLine)
      .filter((line): line is string => line !== null);
    if (!matches.length) continue;
    first ??= category;
    const label = CATALOG_CATEGORY_LABELS[category];
    const lines = matches.slice(0, 3);
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
