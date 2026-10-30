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
    const findMatching = vi.fn().mockResolvedValue([
      {
        benefit: { id: 'b', merchant: 'Coto', rules: {} },
        match: { eligibility: 'eligible', missingFacts: [] },
        instrumentLabels: [],
      },
      {
        benefit: { id: 'c', rules: {} },
        match: {
          eligibility: 'needs_information',
          missingFacts: ['salaryAccount'],
        },
        instrumentLabels: [],
      },
    ]);
    const { getTodayBenefits } = createBenefitTools({
      benefits: { findMatching } as never,
    });
    const result = await getTodayBenefits.execute!({}, ctx('u1'));
    expect(result).toMatchObject({
      eligible: [{ merchant: 'Coto' }],
      needs_information: [{ questions: ['¿Podés confirmar salaryAccount?'] }],
    });
    expect(findMatching).toHaveBeenCalledWith('u1');
  });

  it('updates the context user profile and returns preferences', async () => {
    const updateProfile = vi
      .fn()
      .mockResolvedValue({ instrumentSlugs: ['modo'], enabled: false });
    const { updateBenefitProfile } = createBenefitTools({
      benefits: { updateProfile } as never,
    });
    await expect(
      updateBenefitProfile.execute!(
        { addInstrumentSlugs: ['modo'] },
        ctx('u1'),
      ),
    ).resolves.toEqual({ instrumentSlugs: ['modo'], enabled: false });
    expect(updateProfile).toHaveBeenCalledWith('u1', {
      addInstrumentSlugs: ['modo'],
    });
  });

  it('provides catalog labels and slugs', async () => {
    const catalog = vi.fn().mockReturnValue({ providers: [] });
    const { getBenefitCatalog } = createBenefitTools({
      benefits: { catalog } as never,
    });
    await expect(getBenefitCatalog.execute!({}, ctx('u1'))).resolves.toEqual({
      providers: [],
    });
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
