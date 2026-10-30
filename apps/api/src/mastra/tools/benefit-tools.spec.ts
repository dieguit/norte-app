import { RequestContext } from '@mastra/core/request-context';
import { expect, it, vi } from 'vitest';
import { createBenefitTools } from './benefit-tools';
const ctx = (userId?: string) => {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
};
it('searches top 10 for context user and preserves verification', async () => {
  const search = vi
    .fn()
    .mockResolvedValue({
      items: [
        { id: 'b', verifyUrl: 'https://example.com', verifyHint: 'Buscá Coto' },
      ],
      total: 15,
      profileConfigured: true,
      staleBanks: [],
    });
  const tools = createBenefitTools({ benefits: { search } as never });
  const result = await tools.searchBenefits.execute!(
    { day: 'today' },
    ctx('u'),
  );
  expect(search).toHaveBeenCalledWith('u', {
    day: 'today',
    page: 1,
    pageSize: 10,
  });
  expect(result).toMatchObject({
    total: 15,
    profileConfigured: true,
    items: [{ verifyHint: 'Buscá Coto' }],
  });
  await tools.searchBenefits.execute!({ day: 'today' }, ctx());
  expect(search).toHaveBeenCalledTimes(1);
});
it('patches declared facts and gets bank codes', async () => {
  const updateProfile = vi.fn().mockResolvedValue({});
  const banks = vi.fn().mockResolvedValue({ banks: [] });
  const tools = createBenefitTools({
    benefits: { updateProfile, banks } as never,
  });
  await tools.updateBenefitProfile.execute!({ usesModo: true }, ctx('u'));
  expect(updateProfile).toHaveBeenCalledWith('u', { usesModo: true });
  await tools.getBenefitBanks.execute!({}, ctx('u'));
  expect(banks).toHaveBeenCalledOnce();
});
