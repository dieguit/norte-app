import { RequestContext } from '@mastra/core/request-context';
import { expect, it, vi } from 'vitest';
import { createBenefitTools } from './benefit-tools';
const ctx = (userId?: string) => {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
};
it('searches top 10 for context user and preserves verification', async () => {
  const variant = {
    id: '00000000-0000-4000-8000-000000000002',
    variantKey: 'alternate-bank',
    offers: [{ kind: 'percent', percentageBps: 3000, mode: 'discount' }],
    tierLabels: ['Premium'],
    match: 'needs_tier',
    purchaseConditions: [
      {
        kind: 'coupon',
        code: 'OTHER',
        instruction: 'Ingresar OTHER',
        evidence: 'Cupón OTHER',
      },
    ],
    usableWith: [
      {
        bankSlug: 'other',
        bankName: 'Otro banco',
        card: { network: 'mastercard', type: 'debit' },
      },
    ],
    channels: ['instore'],
    minimumSpendMinor: 500000,
    where: 'Rosario',
    capState: 'known',
    caps: [{ amountMinor: 100000, period: 'month', scope: null }],
    requiresModo: true,
    validity: { from: '2026-10-01', to: '2026-10-31', weekdays: [5] },
    nextDate: '2026-10-30',
  };
  const search = vi.fn().mockResolvedValue({
    items: [
      {
        id: '00000000-0000-4000-8000-000000000001',
        title: 'Coto',
        brandName: 'Coto',
        offers: [{ kind: 'percent', percentageBps: 2000, mode: 'cashback' }],
        validity: { from: null, to: null, weekdays: null },
        nextDate: '2026-10-30',
        usableWith: [],
        requiresModo: false,
        tierLabels: [],
        verifyUrl: 'https://example.com',
        verifyHint: 'Buscá Coto',
        match: 'conditional',
        purchaseConditions: [
          {
            kind: 'coupon',
            code: 'SAVE',
            instruction: 'Aplicar',
            evidence: 'Cupón',
          },
        ],
        variants: [variant],
        channels: ['online'],
        where: 'CABA',
        minimumSpendMinor: null,
        capState: 'unknown',
        caps: [],
      },
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
    items: [
      {
        verifyHint: 'Buscá Coto',
        match: 'conditional',
        purchaseConditions: [{ kind: 'coupon', code: 'SAVE' }],
        variants: [variant],
        channels: ['online'],
        where: 'CABA',
        minimumSpendMinor: null,
        capState: 'unknown',
        caps: [],
      },
    ],
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
