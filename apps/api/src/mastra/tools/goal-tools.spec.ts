import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import { createGoalTools, createContributionTools } from './goal-tools';
import { UserActionStore, createPendingActionTools } from './pending-actions';

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
    getPlanContext: vi.fn().mockResolvedValue({
      profile: 'present',
      allocationContext: {
        activeGoals: [{ id: GOAL_ID }],
        currentAllocation: {
          entries: [{ goalId: GOAL_ID, percentage: '100.00' }],
        },
        financialSummary: { dedicationPercentage: '20' },
      },
    }),
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
  return {
    goals,
    stores,
    tools: createGoalTools({ goals } as never, stores),
    pendingTools: createPendingActionTools(stores),
  };
}

describe('goal tools', () => {
  it.each([undefined, '25'])(
    'derives creation allocations with share %s and confirms the derived draft',
    async (share) => {
      const { goals, tools, stores } = setup();
      const input = {
        ...draft,
        allocations: undefined,
        desiredMonth: undefined,
      };
      await tools.previewGoalCreation.execute!(
        { draft: input, share } as never,
        ctx('u1'),
      );
      const derived = {
        ...draft,
        desiredMonth: '',
        allocations: [
          { goalId: GOAL_ID, percentage: share ? '75.00' : '50.00' },
          { goalId: 'pending-goal', percentage: share ? '25.00' : '50.00' },
        ],
      };
      expect(goals.previewCreation).toHaveBeenCalledWith('u1', derived);
      await stores.pending.take('u1')!.run();
      expect(goals.confirmCreation).toHaveBeenCalledWith('u1', {
        draft: derived,
        previewToken: TOKEN_A,
      });
    },
  );

  it('resumes with equal share and redistributes zero-total entries', async () => {
    const { goals, tools } = setup();
    goals.getPlanContext.mockResolvedValue({
      profile: 'present',
      allocationContext: {
        activeGoals: [{ id: 'other' }],
        pendingAllocation: {
          entries: [
            { goalId: 'other', percentage: '0' },
            { goalId: 'stale', percentage: '100' },
          ],
        },
      },
    });
    await tools.previewGoalLifecycle.execute!(
      { goalId: GOAL_ID, lifecycle: 'resume' },
      ctx('u1'),
    );
    expect(goals.previewLifecycle).toHaveBeenCalledWith('u1', GOAL_ID, {
      lifecycle: 'resume',
      allocations: [
        { goalId: 'other', percentage: '50.00' },
        { goalId: GOAL_ID, percentage: '50.00' },
      ],
    });
  });

  it('merges editable changes over the fetched draft', async () => {
    const { goals, tools, stores } = setup();
    goals.getPlanContext.mockResolvedValue({
      profile: 'present',
      editContext: { draft },
    });
    goals.previewEdit.mockResolvedValue({
      proposal: proposal(1),
      previewToken: TOKEN_A,
    });
    await tools.previewGoalEdit.execute!(
      { goalId: GOAL_ID, changes: { name: 'Auto' } },
      ctx('u1'),
    );
    expect(goals.previewEdit).toHaveBeenCalledWith('u1', GOAL_ID, {
      ...draft,
      name: 'Auto',
    });
    await stores.pending.take('u1')!.run();
    expect(goals.confirmEdit).toHaveBeenCalledWith('u1', GOAL_ID, {
      draft: { ...draft, name: 'Auto' },
      previewToken: TOKEN_A,
    });
  });

  it('defaults dedication and rebalances a requested share', async () => {
    const { goals, tools } = setup();
    goals.getPlanContext.mockResolvedValue({
      profile: 'present',
      allocationContext: {
        activeGoals: [{ id: GOAL_ID }, { id: 'other' }],
        financialSummary: { dedicationPercentage: '20' },
        currentAllocation: {
          entries: [
            { goalId: GOAL_ID, percentage: '50' },
            { goalId: 'other', percentage: '50' },
          ],
        },
      },
    });
    goals.previewAllocationChange.mockResolvedValue({
      proposal: proposal(1),
      previewToken: TOKEN_A,
    });
    await tools.previewAllocationChange.execute!(
      { share: { goalId: GOAL_ID, percentage: '30' } },
      ctx('u1'),
    );
    expect(goals.previewAllocationChange).toHaveBeenCalledWith('u1', {
      dedicationPercentage: 20,
      allocations: [
        { goalId: GOAL_ID, percentage: '30.00' },
        { goalId: 'other', percentage: '70.00' },
      ],
    });
  });

  it('lists detail with current share and latest contribution allocations', async () => {
    const { goals, tools } = setup();
    const contributions = Array.from({ length: 22 }, (_, i) => ({
      id: `c${i}`,
      kind: 'saving',
      amount: '100',
      currency: 'ARS',
      placeName: 'Banco',
      createdAt: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      allocations: [{ goalId: GOAL_ID, amount: '25' }],
    }));
    goals.getWorkspace.mockResolvedValue({
      profile: 'present',
      workspace: {
        financialSummary: { month: '2026-10' },
        groups: [
          {
            goals: [
              {
                id: GOAL_ID,
                funding: [
                  { effectiveMonth: '2026-09-01', percentage: '25' },
                  { effectiveMonth: '2026-11-01', percentage: '80' },
                ],
                savingContributions: contributions,
                completionWithdrawals: [],
              },
              { id: 'other', funding: [] },
            ],
          },
        ],
      },
    });
    const result = await tools.listGoals.execute!(
      { goalId: GOAL_ID },
      ctx('u1'),
    );
    expect(result).toMatchObject({
      goals: [
        {
          id: GOAL_ID,
          share: '25',
          contributions: expect.arrayContaining([
            expect.objectContaining({ id: 'c21', allocationAmount: '25' }),
          ]) as unknown,
          completionWithdrawals: [],
        },
      ],
    });
    expect(
      (result as { goals: { contributions: unknown[] }[] }).goals[0]
        .contributions,
    ).toHaveLength(20);
  });

  it('defaults completion withdrawals and redistributes allocations, including confirm', async () => {
    const { goals, tools, stores } = setup();
    goals.getCompletionContext.mockResolvedValue({
      profile: 'present',
      context: {
        targetAmount: { amount: '100.00', currency: 'ARS' },
        savingsPlaces: [
          { id: 'p1', balance: { amount: '120.00', currency: 'ARS' } },
        ],
        activeGoals: [{ id: GOAL_ID }, { id: 'other' }],
        currentAllocation: {
          entries: [
            { goalId: GOAL_ID, percentage: '40' },
            { goalId: 'other', percentage: '60' },
          ],
        },
      },
    });
    goals.previewCompletion.mockResolvedValue({
      proposal: proposal(1),
      previewToken: TOKEN_A,
    });
    await tools.previewGoalCompletion.execute!({ goalId: GOAL_ID }, ctx('u1'));
    const body = {
      withdrawals: [{ placeId: 'p1', amount: '100.00' }],
      allocations: [{ goalId: 'other', percentage: '100.00' }],
    };
    expect(goals.previewCompletion).toHaveBeenCalledWith('u1', GOAL_ID, body);
    await stores.pending.take('u1')!.run();
    expect(goals.confirmCompletion).toHaveBeenCalledWith('u1', GOAL_ID, {
      ...body,
      previewToken: TOKEN_A,
    });
    expect(goals.getCompletionContext).toHaveBeenCalledTimes(1);
  });

  it('asks for withdrawals when more than one place covers the target', async () => {
    const { goals, tools, stores } = setup();
    const targetAmount = { amount: '100', currency: 'ARS' };
    const savingsPlaces = ['p1', 'p2'].map((id) => ({
      id,
      balance: targetAmount,
    }));
    goals.getCompletionContext.mockResolvedValue({
      profile: 'present',
      context: { targetAmount, savingsPlaces },
    });
    await expect(
      tools.previewGoalCompletion.execute!(
        { goalId: GOAL_ID, allocations: [] },
        ctx('u1'),
      ),
    ).resolves.toEqual({
      error: 'Elegí de qué lugares sacar el dinero (deben sumar el objetivo).',
      targetAmount,
      savingsPlaces,
    });
    expect(stores.pending.has('u1')).toBe(false);
    expect(goals.previewCompletion).not.toHaveBeenCalled();
  });
  it('previews creation without proposedSource and confirms via confirmPendingAction', async () => {
    const { goals, stores, tools, pendingTools } = setup();
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
    expect(stores.pending.has('u1')).toBe(true);
    expect(goals.confirmCreation).not.toHaveBeenCalled();

    const confirmResult = await pendingTools.confirmPendingAction.execute!(
      {},
      ctx('u1'),
    );
    expect(confirmResult).toEqual({
      done: 'Objetivo creado',
      result: { status: 'created', goalId: GOAL_ID },
    });
    expect(stores.pending.has('u1')).toBe(false);
    expect(goals.confirmCreation).toHaveBeenCalledWith('u1', {
      draft: expect.objectContaining({ name: 'Viaje' }) as unknown,
      previewToken: TOKEN_A,
    });
  });

  it('returns stale outcome via confirmPendingAction without claiming done and keeps refreshed preview pending', async () => {
    const { goals, stores, tools, pendingTools } = setup();
    goals.confirmCreation.mockResolvedValue({
      status: 'stale',
      preview: { proposal: proposal(2), previewToken: TOKEN_B },
    });
    await tools.previewGoalCreation.execute!({ draft } as never, ctx('u1'));
    expect(stores.pending.has('u1')).toBe(true);

    const confirmResult = await pendingTools.confirmPendingAction.execute!(
      {},
      ctx('u1'),
    );
    expect(confirmResult).toEqual({
      status: 'stale',
      message:
        'Los datos cambiaron. Mostrá esta nueva vista previa y pedí confirmación otra vez.',
      preview: { impacts: [{ goalName: 'Viaje', n: 2 }] },
    });
    expect(confirmResult).not.toHaveProperty('done');
    expect(stores.pending.has('u1')).toBe(true);
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
      draft: expect.anything() as unknown,
      previewToken: TOKEN_B,
    });
  });

  it('confirms lifecycle with the same allocations used in the preview', async () => {
    const { goals, stores, tools } = setup();
    const allocations = [{ goalId: GOAL_ID, percentage: '0.00' }];
    await tools.previewGoalLifecycle.execute!(
      { goalId: GOAL_ID, lifecycle: 'pause' },
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

  it('applies defaults to previewGoalCreation draft when omitted', async () => {
    const { goals, tools } = setup();
    const input = {
      draft: {
        name: 'Auto',
        targetAmount: '10000',
        desiredMonth: '2027-01',
        type: 'purchase',
        allocations: [{ goalId: 'pending-goal', percentage: '100' }],
      },
    };

    await tools.previewGoalCreation.execute!(input as never, ctx('u1'));
    expect(goals.previewCreation).toHaveBeenCalledWith('u1', {
      name: 'Auto',
      targetAmount: '10000',
      desiredMonth: '2027-01',
      type: 'purchase',
      currency: 'ARS',
      priority: 'medium',
      strategy: 'save',
      availability: 'available_now',
      annualReturnRate: '',
      availableFromMonth: '',
      allocations: [{ goalId: 'pending-goal', percentage: '100' }],
    });
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

describe('contribution tools', () => {
  const CONTRIBUTION_ID = '1b0c1f3e-4a2d-4c8e-9a1b-2f3d4e5f6a7b';
  const savingDraft = {
    kind: 'saving',
    currency: 'ARS',
    amount: '50000',
    place: { kind: 'new', name: 'Mercado Pago' },
  };

  function setupContributions() {
    const contributions = {
      getContext: vi.fn().mockResolvedValue({ profile: 'missing' }),
      previewSaving: vi.fn().mockResolvedValue({
        preview: { allocations: [] },
        previewToken: TOKEN_A,
      }),
      confirmSaving: vi.fn().mockResolvedValue({
        status: 'created',
        contributionId: CONTRIBUTION_ID,
      }),
      previewSavingEdit: vi
        .fn()
        .mockResolvedValue({ preview: { allocations: [] } }),
      updateSaving: vi.fn().mockResolvedValue({ status: 'updated' }),
      deleteSaving: vi.fn().mockResolvedValue({ status: 'deleted' }),
    };
    const stores = {
      pending: new UserActionStore(),
      undo: new UserActionStore(),
    };
    return {
      contributions,
      stores,
      tools: createContributionTools({ contributions } as never, stores),
    };
  }

  it('previews and confirms a saving with the stored token', async () => {
    const { contributions, stores, tools } = setupContributions();
    await expect(
      tools.previewSaving.execute!({ draft: savingDraft } as never, ctx('u1')),
    ).resolves.toEqual({
      needsConfirmation: true,
      preview: { allocations: [] },
    });
    expect(contributions.confirmSaving).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(contributions.confirmSaving).toHaveBeenCalledWith('u1', {
      draft: expect.objectContaining({ amount: '50000' }) as unknown,
      previewToken: TOKEN_A,
    });
  });

  it('passes previous-month catch-up through confirmation', async () => {
    const { getPreviousCalendarMonth } = await import('@repo/finance-utils');
    const catchUpMonth = getPreviousCalendarMonth(new Date());
    const { contributions, stores, tools } = setupContributions();
    await tools.previewSaving.execute!(
      { draft: savingDraft, catchUpPreviousMonth: true } as never,
      ctx('u1'),
    );
    const pending = stores.pending.take('u1')!;
    expect(pending.summary).toBe(
      `Ahorro registrado (regularización ${catchUpMonth})`,
    );
    await pending.run();
    expect(contributions.confirmSaving).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ catchUpMonth, previewToken: TOKEN_A }),
    );
  });

  it('stages edits and deletes', async () => {
    const { contributions, stores, tools } = setupContributions();
    await tools.previewSavingEdit.execute!(
      { contributionId: CONTRIBUTION_ID, draft: savingDraft } as never,
      ctx('u1'),
    );
    await stores.pending.take('u1')!.run();
    expect(contributions.updateSaving).toHaveBeenCalledWith(
      'u1',
      CONTRIBUTION_ID,
      {
        draft: expect.objectContaining({ amount: '50000' }) as unknown,
      },
    );

    await tools.previewSavingDelete.execute!(
      { contributionId: CONTRIBUTION_ID },
      ctx('u1'),
    );
    expect(contributions.deleteSaving).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(contributions.deleteSaving).toHaveBeenCalledWith(
      'u1',
      CONTRIBUTION_ID,
    );
  });

  it('asks for a place when saving without one', async () => {
    const { contributions, tools } = setupContributions();
    const noPlace = { ...savingDraft, place: undefined };
    const result = await tools.previewSaving.execute!(
      { draft: noPlace } as never,
      ctx('u1'),
    );
    expect(JSON.stringify(result)).toContain('Elegí un lugar para tu ahorro.');
    expect(contributions.previewSaving).not.toHaveBeenCalled();
  });

  it('defaults currency to ARS in previewSaving when omitted', async () => {
    const { contributions, tools } = setupContributions();
    const draftWithoutCurrency = {
      kind: 'saving',
      amount: '30000',
      place: { kind: 'new', name: 'Mercado Pago' },
    };

    await tools.previewSaving.execute!(
      { draft: draftWithoutCurrency } as never,
      ctx('u1'),
    );
    expect(contributions.previewSaving).toHaveBeenCalledWith('u1', {
      kind: 'saving',
      currency: 'ARS',
      amount: '30000',
      place: { kind: 'new', name: 'Mercado Pago' },
    });
  });

  it('auto-selects single existing savings place when place is omitted for saving', async () => {
    const { contributions, tools } = setupContributions();
    const PLACE_ID = '3b0c1f3e-4a2d-4c8e-9a1b-2f3d4e5f6a7b';
    contributions.getContext.mockResolvedValueOnce({
      profile: 'present',
      context: {
        places: [{ id: PLACE_ID, name: 'Caja de Ahorro' }],
      },
    });

    const draftWithoutPlace = {
      kind: 'saving',
      amount: '15000',
    };

    await tools.previewSaving.execute!(
      { draft: draftWithoutPlace } as never,
      ctx('u1'),
    );
    expect(contributions.previewSaving).toHaveBeenCalledWith('u1', {
      kind: 'saving',
      currency: 'ARS',
      amount: '15000',
      place: { kind: 'existing', placeId: PLACE_ID },
    });
  });

  it('propagates errors from contributions.getContext when resolving savings place', async () => {
    const { contributions, tools } = setupContributions();
    const { BadRequestException } = await import('@nestjs/common');
    contributions.getContext.mockRejectedValue(
      new BadRequestException('Context error'),
    );

    const result = await tools.previewSaving.execute!(
      { draft: { amount: '1000' } } as never,
      ctx('u1'),
    );
    expect(result).toEqual({ error: 'Context error' });
  });
});
