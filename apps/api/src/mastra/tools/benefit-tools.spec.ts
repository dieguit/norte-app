import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import { createBenefitTools } from './benefit-tools';

function ctx(userId?: string) {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
}

describe('benefit tools', () => {
  it('returns today benefits for the context user', async () => {
    const findMatching = vi.fn().mockResolvedValue([{ merchant: 'Coto' }]);
    const { getTodayBenefits } = createBenefitTools({
      benefits: { findMatching } as never,
    });
    await expect(getTodayBenefits.execute!({}, ctx('u1'))).resolves.toEqual([
      { merchant: 'Coto' },
    ]);
    expect(findMatching).toHaveBeenCalledWith('u1');
  });

  it('refuses without a user in context', async () => {
    const findMatching = vi.fn();
    const { getTodayBenefits } = createBenefitTools({
      benefits: { findMatching } as never,
    });
    const result = await getTodayBenefits.execute!({}, ctx());
    expect(result).toHaveProperty('error');
    expect(findMatching).not.toHaveBeenCalled();
  });
});
