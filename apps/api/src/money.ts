import { BadRequestException } from '@nestjs/common';
import BigNumber from 'bignumber.js';

export function normalizeMoneyAmount(input: string) {
  const clean = input.replace(/[$]|US[$]|USD|ARS|\s/gi, '').trim();
  let normalized = clean;
  if (clean.includes(',') && clean.includes('.'))
    normalized = clean.replace(/\./g, '').replace(',', '.');
  else if (clean.includes(',')) normalized = clean.replace(',', '.');
  else if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length > 2 || parts[1].length === 3)
      normalized = clean.replace(/\./g, '');
  }
  try {
    const amount = new BigNumber(normalized);
    if (!amount.isFinite() || !amount.isGreaterThan(0)) throw new Error();
    const rounded = amount.toFixed(2, BigNumber.ROUND_HALF_UP);
    if (!new BigNumber(rounded).isGreaterThan(0)) throw new Error();
    return rounded;
  } catch {
    throw new BadRequestException('Ingresá un monto mayor a cero.');
  }
}
