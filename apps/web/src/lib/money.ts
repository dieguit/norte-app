export {
  createMoney,
  isPositiveMoney,
  parseMoneyInput,
  type CurrencyCode,
  type Money,
} from '@repo/finance-utils';

const integerFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export function formatMoneyInput(input: string): string {
  const [integer, decimal] = input.replace(/[^\d,]/g, '').split(',', 2);
  const formattedInteger = integer ? integerFormatter.format(BigInt(integer)) : '';
  return decimal === undefined ? formattedInteger : `${formattedInteger || '0'},${decimal.slice(0, 2)}`;
}
