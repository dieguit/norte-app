import { RequestContext } from '@mastra/core/request-context';
import { getPreviousCalendarMonth } from '@repo/finance-utils';
import { describe, expect, it, vi } from 'vitest';
import { createRoadmapTools } from './roadmap-tools';

function ctx(userId?: string) {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
}

describe('roadmap tools', () => {
  it('returns a compact digest with current targets and catch-up shortfalls', async () => {
    const month = new Date().toISOString().slice(0, 7);
    const goal = {
      id: 'g1',
      name: 'Viaje',
      status: 'active',
      type: 'purchase',
      strategy: 'save',
      currency: 'ARS',
      actualValue: { amount: '30.00', currency: 'ARS' },
      projection: { status: 'projected', completionMonth: '2027-01' },
      completionEligible: false,
      funding: [
        {
          effectiveMonth: '2000-01',
          allocatedDestinationAmount: { amount: '100.00', currency: 'ARS' },
        },
        {
          effectiveMonth: '2001-01',
          allocatedDestinationAmount: { amount: '200.00', currency: 'ARS' },
        },
        {
          effectiveMonth: '2099-01',
          allocatedDestinationAmount: { amount: '900.00', currency: 'ARS' },
        },
      ],
    };
    const home = {
      getHome: vi.fn().mockResolvedValue({
        roadmap: {
          currentMonth: {
            month,
            objectives: [goal],
            contributions: [
              { kind: 'saving', currency: 'ARS', amount: '30' },
              { kind: 'saving', currency: 'ARS', amount: '-10' },
            ],
          },
          historyMonths: [
            {
              month: '2000-01',
              objectives: [
                { ...goal, id: 'completed', name: 'Auto', status: 'completed' },
              ],
              contributions: [
                { kind: 'saving', currency: 'ARS', amount: '10' },
                { kind: 'saving', currency: 'ARS', amount: '20' },
                { kind: 'saving', currency: 'ARS', amount: '-5' },
              ],
            },
          ],
          futureMonths: [],
          undatedObjectives: [goal],
        },
        completionGoals: [],
      }),
    };
    const profile = {
      getPreviousMonthShortfalls: vi.fn().mockResolvedValue([
        {
          kind: 'saving',
          currency: 'ARS',
          amount: { amount: '50.00', currency: 'ARS' },
        },
      ]),
    };
    const { getRoadmap } = createRoadmapTools(
      { home, profile } as never,
      'https://app.test',
    );
    await expect(getRoadmap.execute!({}, ctx('u1'))).resolves.toEqual({
      currentMonth: month,
      monthTargets: [
        {
          kind: 'saving',
          currency: 'ARS',
          target: '200.00',
          contributed: '30.00',
          missing: '170.00',
        },
      ],
      previousMonth: {
        month: getPreviousCalendarMonth(new Date()),
        shortfalls: [{ kind: 'saving', currency: 'ARS', amount: '50.00' }],
      },
      goals: [
        expect.objectContaining({ id: 'completed', name: 'Auto' }),
        expect.objectContaining({ id: 'g1', name: 'Viaje' }),
      ],
      recentMonths: [
        {
          month: '2000-01',
          contributed: [{ kind: 'saving', currency: 'ARS', amount: '30.00' }],
          completedGoals: ['Auto'],
        },
      ],
      appUrl: 'https://app.test/app',
    });
    expect(home.getHome).toHaveBeenCalledWith('u1', month);
  });

  it('points to onboarding when the profile is missing', async () => {
    const home = { getHome: vi.fn().mockResolvedValue({ profile: 'missing' }) };
    const profile = {
      getPreviousMonthShortfalls: vi.fn().mockResolvedValue([]),
    };
    const { getRoadmap } = createRoadmapTools(
      { home, profile } as never,
      'https://app.test',
    );
    await expect(getRoadmap.execute!({}, ctx('u1'))).resolves.toEqual({
      profile: 'missing',
      appUrl: 'https://app.test/onboarding',
    });
  });
});
