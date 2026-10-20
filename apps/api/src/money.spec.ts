import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { normalizeMoneyAmount } from './money';

describe('normalizeMoneyAmount', () => {
  it('rejects positive inputs whose canonical rounded value is zero', () => {
    expect(() => normalizeMoneyAmount('0.0001')).toThrow(BadRequestException);
    expect(() => normalizeMoneyAmount('0.0001')).toThrow(
      'Ingresá un monto mayor a cero.',
    );
  });

  it('rejects amounts that round to zero', () => {
    expect(() => normalizeMoneyAmount('0,001')).toThrow(
      'Ingresá un monto mayor a cero.',
    );
  });

  it('accepts a positive amount at the rounding boundary', () => {
    expect(normalizeMoneyAmount('0,005')).toBe('0.01');
  });
});
