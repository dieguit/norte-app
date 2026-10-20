import { BadRequestException } from '@nestjs/common';
import { isPositiveMoney, parseMoneyInput } from '@repo/finance-utils';

export function normalizeMoneyAmount(input: string) {
  const money = parseMoneyInput(input, 'ARS');
  if (!money || !isPositiveMoney(money))
    throw new BadRequestException('Ingresá un monto mayor a cero.');
  return money.amount;
}
