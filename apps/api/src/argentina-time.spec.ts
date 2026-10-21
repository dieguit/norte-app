import { describe, expect, it } from 'vitest';
import {
  argentinaInstant,
  previousDay,
  todayInArgentina,
} from './argentina-time';

describe('argentina time', () => {
  it('resolves the BA date near midnight UTC', () => {
    expect(todayInArgentina(new Date('2026-10-22T02:59:59Z'))).toEqual({
      today: '2026-10-21',
      month: '2026-10',
    });
    expect(todayInArgentina(new Date('2026-10-22T03:00:00Z')).today).toBe(
      '2026-10-22',
    );
  });

  it('builds a UTC instant from a BA day and time', () => {
    expect(argentinaInstant('2026-10-21', '21:30').toISOString()).toBe(
      '2026-10-22T00:30:00.000Z',
    );
    expect(argentinaInstant('2026-10-21').toISOString()).toBe(
      '2026-10-21T03:00:00.000Z',
    );
  });

  it('returns the previous BA day across month boundaries', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
  });
});
