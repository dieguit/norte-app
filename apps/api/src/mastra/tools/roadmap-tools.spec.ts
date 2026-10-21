import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import { createRoadmapTools } from './roadmap-tools';

function ctx(userId?: string) {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
}

describe('roadmap tools', () => {
  it('returns the roadmap with an app link', async () => {
    const home = { getHome: vi.fn().mockResolvedValue({ roadmap: { months: [] }, completionGoals: [] }) };
    const { getRoadmap } = createRoadmapTools({ home } as never, 'https://app.test');
    await expect(getRoadmap.execute!({} as never, ctx('u1'))).resolves.toEqual({
      roadmap: { months: [] },
      completionGoals: [],
      appUrl: 'https://app.test/app',
    });
    expect(home.getHome).toHaveBeenCalledWith('u1');
  });

  it('points to onboarding when the profile is missing', async () => {
    const home = { getHome: vi.fn().mockResolvedValue({ profile: 'missing' }) };
    const { getRoadmap } = createRoadmapTools({ home } as never, 'https://app.test');
    await expect(getRoadmap.execute!({} as never, ctx('u1'))).resolves.toEqual({
      profile: 'missing',
      appUrl: 'https://app.test/onboarding',
    });
  });
});
