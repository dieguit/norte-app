import { describe, expect, it } from 'vitest';
import { createDateTools, todayInArgentina } from './date';

describe('date tools', () => {
  it('converts a UTC instant near midnight into Argentina date and month', () => {
    const instant = new Date('2026-11-01T02:00:00Z');
    expect(todayInArgentina(instant)).toEqual({
      today: '2026-10-31',
      month: '2026-10',
    });
  });

  it('provides a getCurrentDate tool returning today and month', async () => {
    const tools = createDateTools();
    expect(tools.getCurrentDate.id).toBe('get-current-date');
    const result = await tools.getCurrentDate.execute!({}, {} as never);
    expect(result).toHaveProperty('today');
    expect(result).toHaveProperty('month');
    expect((result as { today: string }).today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((result as { month: string }).month).toMatch(/^\d{4}-\d{2}$/);
  });
});
