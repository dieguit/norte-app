import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import { createGoalTools } from './goal-tools';
import { UserActionStore } from './pending-actions';

function ctx(userId?: string) {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
}

const GOAL_ID = '7b0c1f3e-4a2d-4c8e-9a1b-2f3d4e5f6a7b';
const TOKEN_A = 'a'.repeat(64);
const TOKEN_B = 'b'.repeat(64);
const draft = {
  type: 'purchase',
  name: 'Viaje',
  targetAmount: '2000',
  currency: 'USD',
  desiredMonth: '2027-06',
  priority: 'medium',
  strategy: 'save',
  annualReturnRate: '',
  availability: 'available_now',
  availableFromMonth: '',
  allocations: [{ goalId: 'pending-goal', percentage: '100' }],
};
const proposal = (n: number) => ({
  impacts: [{ goalName: 'Viaje', n }],
  proposedSource: { huge: true },
});

function setup() {
  const goals = {
    getWorkspace: vi.fn(),
    getPlanContext: vi.fn(),
    getLifecyclePlanContext: vi.fn(),
    getCompletionContext: vi.fn(),
    previewCreation: vi
      .fn()
      .mockResolvedValue({ proposal: proposal(1), previewToken: TOKEN_A }),
    confirmCreation: vi.fn(),
    previewEdit: vi.fn(),
    confirmEdit: vi.fn(),
    previewAllocationChange: vi.fn(),
    confirmAllocationChange: vi.fn(),
    previewLifecycle: vi
      .fn()
      .mockResolvedValue({ proposal: proposal(1), previewToken: TOKEN_A }),
    confirmLifecycle: vi.fn().mockResolvedValue({ status: 'updated' }),
    previewCompletion: vi.fn(),
    confirmCompletion: vi.fn(),
  };
  const stores = {
    pending: new UserActionStore(),
    undo: new UserActionStore(),
  };
  return { goals, stores, tools: createGoalTools({ goals } as never, stores) };
}

describe('goal tools', () => {
  it('previews creation without proposedSource and confirms with the stored token', async () => {
    const { goals, stores, tools } = setup();
    goals.confirmCreation.mockResolvedValue({
      status: 'created',
      goalId: GOAL_ID,
    });
    const result = await tools.previewGoalCreation.execute!(
      { draft } as never,
      ctx('u1'),
    );
    expect(result).toEqual({
      needsConfirmation: true,
      preview: { impacts: [{ goalName: 'Viaje', n: 1 }] },
    });
    expect(goals.confirmCreation).not.toHaveBeenCalled();
    await expect(stores.pending.take('u1')!.run()).resolves.toEqual({
      status: 'created',
      goalId: GOAL_ID,
    });
    expect(goals.confirmCreation).toHaveBeenCalledWith('u1', {
      draft: expect.objectContaining({ name: 'Viaje' }),
      previewToken: TOKEN_A,
    });
  });

  it('re-stages a stale creation with the refreshed token', async () => {
    const { goals, stores, tools } = setup();
    goals.confirmCreation
      .mockResolvedValueOnce({
        status: 'stale',
        preview: { proposal: proposal(2), previewToken: TOKEN_B },
      })
      .mockResolvedValueOnce({ status: 'created', goalId: GOAL_ID });
    await tools.previewGoalCreation.execute!({ draft } as never, ctx('u1'));
    await expect(stores.pending.take('u1')!.run()).resolves.toMatchObject({
      status: 'stale',
      preview: { impacts: [{ goalName: 'Viaje', n: 2 }] },
    });
    await stores.pending.take('u1')!.run();
    expect(goals.confirmCreation).toHaveBeenLastCalledWith('u1', {
      draft: expect.anything(),
      previewToken: TOKEN_B,
    });
  });

  it('confirms lifecycle with the same allocations used in the preview', async () => {
    const { goals, stores, tools } = setup();
    const allocations = [{ goalId: GOAL_ID, percentage: '100' }];
    await tools.previewGoalLifecycle.execute!(
      { goalId: GOAL_ID, lifecycle: 'pause', allocations } as never,
      ctx('u1'),
    );
    expect(goals.previewLifecycle).toHaveBeenCalledWith('u1', GOAL_ID, {
      lifecycle: 'pause',
      allocations,
    });
    await stores.pending.take('u1')!.run();
    expect(goals.confirmLifecycle).toHaveBeenCalledWith('u1', GOAL_ID, {
      lifecycle: 'pause',
      allocations,
      previewToken: TOKEN_A,
    });
  });

  it('returns preview errors without staging anything', async () => {
    const { goals, stores, tools } = setup();
    const { BadRequestException } = await import('@nestjs/common');
    goals.previewCreation.mockRejectedValue(
      new BadRequestException('La distribución debe sumar 100%.'),
    );
    await expect(
      tools.previewGoalCreation.execute!({ draft } as never, ctx('u1')),
    ).resolves.toEqual({ error: 'La distribución debe sumar 100%.' });
    expect(stores.pending.take('u1')).toBeUndefined();
  });

  it('lists goals compactly', async () => {
    const { goals, tools } = setup();
    goals.getWorkspace.mockResolvedValue({
      profile: 'present',
      workspace: {
        financialSummary: { month: '2026-10' },
        groups: [
          {
            status: 'active',
            goals: [
              {
                id: GOAL_ID,
                name: 'Viaje',
                status: 'active',
                contributions: [{ id: 'c1' }],
                funding: [],
              },
            ],
          },
        ],
      },
    });
    const result = await tools.listGoals.execute!({}, ctx('u1'));
    expect(result).toMatchObject({
      financialSummary: { month: '2026-10' },
      goals: [{ id: GOAL_ID, name: 'Viaje', status: 'active' }],
    });
    expect(JSON.stringify(result)).not.toContain('funding');
  });
});
