import { describe, expect, it, vi } from 'vitest';
import {
  allocationPlanEntries,
  financialGoals,
  financialProfiles,
  goalCompletionWithdrawals,
} from '../profile/profile.schema';
import {
  confirmGoalCompletionInRepository,
  createGoalCompletionPreviewToken,
  getGoalCompletionState,
  GoalCompletionStateInvalidError,
  StaleGoalCompletionPreviewError,
} from './goal-creation.repository';
import type { GoalCompletionDraft } from './goal-completion';

const draft: GoalCompletionDraft = {
  goalId: 'g',
  withdrawals: [
    { placeId: 'bank', amount: '700.00' },
    { placeId: 'cash', amount: '300.00' },
  ],
  allocations: [{ goalId: 'o', percentage: '100.00' }],
};

function goalRows() {
  return [
    {
      id: 'g',
      userId: 'u',
      name: 'Notebook',
      type: 'purchase',
      targetAmount: '1000.00',
      currency: 'ARS',
      priority: 'high',
      strategy: 'save',
      status: 'active',
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'o',
      userId: 'u',
      name: 'Viaje',
      type: 'other',
      targetAmount: '5000.00',
      currency: 'ARS',
      priority: 'medium',
      strategy: 'save',
      status: 'active',
      createdAt: new Date('2026-02-01'),
    },
  ];
}

function completionQueries(goals = goalRows()) {
  return {
    financialProfiles: {
      findFirst: vi.fn().mockResolvedValue({
        userId: 'u',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        goalDedicationPercentage: '90.00',
        onboardingCompleted: true,
      }),
    },
    financialGoals: { findMany: vi.fn().mockResolvedValue(goals) },
    goalSavingsPositions: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'sp',
          goalId: 'g',
          amount: '1000.00',
          currency: 'ARS',
          location: 'Banco',
        },
      ]),
    },
    goalInvestmentPositions: { findMany: vi.fn().mockResolvedValue([]) },
    incomes: { findMany: vi.fn().mockResolvedValue([]) },
    expenses: { findMany: vi.fn().mockResolvedValue([]) },
    allocationPlanSnapshots: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: 'current', userId: 'u', effectiveMonth: '2026-08-01' },
        ]),
    },
    allocationPlanEntries: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'a1', snapshotId: 'current', goalId: 'g', percentage: '60.00' },
        { id: 'a2', snapshotId: 'current', goalId: 'o', percentage: '40.00' },
      ]),
    },
    savingsPlaces: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'bank', userId: 'u', name: 'Banco' },
        { id: 'cash', userId: 'u', name: 'Efectivo' },
      ]),
    },
    savingContributions: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'c1',
          userId: 'u',
          placeId: 'bank',
          amount: '700.00',
          currency: 'ARS',
        },
        {
          id: 'c2',
          userId: 'u',
          placeId: 'cash',
          amount: '500.00',
          currency: 'ARS',
        },
      ]),
    },
    savingsPlaceTransfers: { findMany: vi.fn().mockResolvedValue([]) },
    goalCompletionWithdrawals: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

function completionTx(
  queries: ReturnType<typeof completionQueries>,
  writes: Array<{ table: unknown; values: unknown }>,
) {
  const lockRow = (table: unknown) => {
    if (table === financialProfiles)
      return [{ userId: 'u', plannedMonthlyContribution: '60000.00' }];
    return [{ id: 'g' }];
  };
  return {
    query: queries,
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          for: () => Promise.resolve(lockRow(table)),
          limit: () => Promise.resolve([]),
        }),
      }),
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: () => {
          writes.push({ table, values });
          return Object.assign(Promise.resolve(), {
            returning: () => Promise.resolve([{ id: 'g' }]),
          });
        },
      }),
    }),
    delete: () => ({ where: () => Promise.resolve([]) }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ table, values });
        return Object.assign(Promise.resolve([{ id: 'new-snapshot' }]), {
          returning: () => Promise.resolve([{ id: 'new-snapshot' }]),
        });
      },
    }),
  };
}

describe('goal completion repository', () => {
  it('loads positive same-currency savings places net of contributions, transfers, and prior withdrawals', async () => {
    const queries = completionQueries();
    queries.goalCompletionWithdrawals.findMany.mockResolvedValue([
      {
        id: 'w1',
        goalId: 'o',
        placeId: 'cash',
        amount: '100.00',
        currency: 'ARS',
        createdAt: new Date('2026-07-01'),
      },
    ]);
    const state = await getGoalCompletionState(
      { query: queries } as never,
      'u',
      '2026-08',
      'g',
    );
    expect(state?.source.goals.map(({ id }) => id)).toEqual(['g', 'o']);
    expect(state?.savingsPlaces).toEqual([
      {
        id: 'bank',
        name: 'Banco',
        balance: { amount: '700.00', currency: 'ARS' },
      },
      {
        id: 'cash',
        name: 'Efectivo',
        balance: { amount: '400.00', currency: 'ARS' },
      },
    ]);
    expect(state?.source.completionWithdrawals).toEqual([
      expect.objectContaining({
        id: 'w1',
        placeName: 'Efectivo',
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
    ]);
  });

  it('rejects a completion target not owned by the user', async () => {
    await expect(
      getGoalCompletionState(
        { query: completionQueries() } as never,
        'u',
        '2026-08',
        'foreign',
      ),
    ).rejects.toThrow('Objetivo no encontrado.');
  });

  it('binds the preview token to the draft and loaded state', async () => {
    const state = await getGoalCompletionState(
      { query: completionQueries() } as never,
      'u',
      '2026-08',
      'g',
    );
    const token = createGoalCompletionPreviewToken(state!, '2026-08', draft);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(
      createGoalCompletionPreviewToken(state!, '2026-08', {
        ...draft,
        withdrawals: [{ placeId: 'bank', amount: '1000.00' }],
      }),
    ).not.toBe(token);
    expect(createGoalCompletionPreviewToken(state!, '2026-09', draft)).not.toBe(
      token,
    );
  });

  it('confirms under the profile and goal locks with withdrawals, goal completion, and pause in one executor', async () => {
    const queries = completionQueries();
    const preview = await getGoalCompletionState(
      { query: queries } as never,
      'u',
      '2026-08',
      'g',
    );
    const token = createGoalCompletionPreviewToken(preview!, '2026-08', draft);
    const writes: Array<{ table: unknown; values: unknown }> = [];
    const tx = completionTx(queries, writes);
    const db = {
      query: queries,
      transaction: <T>(callback: (executor: typeof tx) => Promise<T>) =>
        callback(tx),
    };

    await expect(
      confirmGoalCompletionInRepository(db as never, {
        userId: 'u',
        currentMonth: '2026-08',
        draft,
        previewToken: token,
      }),
    ).resolves.toMatchObject({ completedAt: expect.any(String) as never });

    expect(writes).toContainEqual({
      table: goalCompletionWithdrawals,
      values: expect.arrayContaining([
        expect.objectContaining({
          goalId: 'g',
          placeId: 'bank',
          amount: '700.00',
        }),
        expect.objectContaining({
          goalId: 'g',
          placeId: 'cash',
          amount: '300.00',
        }),
      ]) as never,
    });
    expect(writes).toContainEqual({
      table: financialGoals,
      values: expect.objectContaining({ status: 'completed' }) as never,
    });
    expect(writes.some(({ table }) => table === financialProfiles)).toBe(false);
    expect(writes).toContainEqual({
      table: allocationPlanEntries,
      values: [expect.objectContaining({ goalId: 'o', percentage: '100.00' })],
    });
  });

  it('returns a refreshed stale preview with zero writes when loaded source changes after preview', async () => {
    const goals = goalRows();
    const queries = completionQueries(goals);
    const preview = await getGoalCompletionState(
      { query: queries } as never,
      'u',
      '2026-08',
      'g',
    );
    const token = createGoalCompletionPreviewToken(preview!, '2026-08', draft);
    goals[1].name = 'Changed after preview';
    const writes: Array<{ table: unknown; values: unknown }> = [];
    const tx = completionTx(queries, writes);
    const db = {
      query: queries,
      transaction: <T>(callback: (executor: typeof tx) => Promise<T>) =>
        callback(tx),
    };

    const error = await confirmGoalCompletionInRepository(db as never, {
      userId: 'u',
      currentMonth: '2026-08',
      draft,
      previewToken: token,
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(StaleGoalCompletionPreviewError);
    expect(
      (error as StaleGoalCompletionPreviewError).refreshedPreview.previewToken,
    ).not.toBe(token);
    expect(writes).toEqual([]);
  });

  it('keeps original status-drift domain rejection with zero writes when the target is no longer completable', async () => {
    const goals = goalRows();
    const queries = completionQueries(goals);
    const preview = await getGoalCompletionState(
      { query: queries } as never,
      'u',
      '2026-08',
      'g',
    );
    const token = createGoalCompletionPreviewToken(preview!, '2026-08', draft);
    goals[0].status = 'completed';
    const writes: Array<{ table: unknown; values: unknown }> = [];
    const tx = completionTx(queries, writes);
    const db = {
      query: queries,
      transaction: <T>(callback: (executor: typeof tx) => Promise<T>) =>
        callback(tx),
    };

    await expect(
      confirmGoalCompletionInRepository(db as never, {
        userId: 'u',
        currentMonth: '2026-08',
        draft,
        previewToken: token,
      }),
    ).rejects.toBeInstanceOf(GoalCompletionStateInvalidError);
    expect(writes).toEqual([]);
  });
});
