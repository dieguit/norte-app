import { describe, expect, it, vi } from 'vitest';
import {
  financialProfiles,
  goalInvestmentPositions,
  goalSavingsPositions,
  investmentContributionAllocations,
  investmentContributions,
  savingContributionAllocations,
  savingContributions,
  savingsPlaces,
} from '../profile/profile.schema';
import type { Database } from '../database/database.types';
import {
  createSavingContributionInRepository,
  createSavingContributionPreviewToken,
  deleteSavingContributionInRepository,
  getSavingContributionState,
  previewSavingContribution,
  StaleSavingContributionPreviewError,
  updateSavingContributionInRepository,
} from './saving-contribution.repository';
import type { SavingDraftInput } from './saving-contribution';

const draft: SavingDraftInput = {
  currency: 'ARS',
  amount: '300.00',
  place: { kind: 'existing', placeId: 'bank' },
};
const investmentDraft: SavingDraftInput = {
  kind: 'investment',
  currency: 'ARS',
  amount: '200.00',
};

function goalRows() {
  return [
    {
      id: 'g1',
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
      id: 'g2',
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
    {
      id: 'g3',
      userId: 'u',
      name: 'Fondo',
      type: 'retirement',
      targetAmount: '9000.00',
      currency: 'ARS',
      priority: 'medium',
      strategy: 'invest',
      status: 'active',
      createdAt: new Date('2026-03-01'),
    },
  ];
}

const planEntries = [
  { id: 'a1', snapshotId: 'snap', goalId: 'g1', percentage: '60.00' },
  { id: 'a2', snapshotId: 'snap', goalId: 'g2', percentage: '40.00' },
  { id: 'a3', snapshotId: 'snap', goalId: 'g3', percentage: '100.00' },
];

function contributionQueries(
  overrides: {
    goals?: ReturnType<typeof goalRows>;
    investmentPositions?: unknown[];
  } = {},
) {
  return {
    financialProfiles: {
      findFirst: vi.fn().mockResolvedValue({
        userId: 'u',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '600.00',
        goalDedicationPercentage: '90.00',
        onboardingCompleted: true,
      }),
    },
    financialGoals: {
      findMany: vi.fn().mockResolvedValue(overrides.goals ?? goalRows()),
    },
    incomes: { findMany: vi.fn().mockResolvedValue([]) },
    expenses: { findMany: vi.fn().mockResolvedValue([]) },
    allocationPlanSnapshots: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: 'snap', userId: 'u', effectiveMonth: '2026-08-01' },
        ]),
    },
    allocationPlanEntries: { findMany: vi.fn().mockResolvedValue(planEntries) },
    goalSavingsPositions: { findMany: vi.fn().mockResolvedValue([]) },
    goalInvestmentPositions: {
      findMany: vi.fn().mockResolvedValue(
        overrides.investmentPositions ?? [
          {
            id: 'ip3',
            goalId: 'g3',
            currentValue: '1000.00',
            currency: 'ARS',
          },
        ],
      ),
      findFirst: vi.fn().mockResolvedValue(undefined),
    },
    savingContributions: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(undefined),
    },
    investmentContributions: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(undefined),
    },
    savingContributionAllocations: { findMany: vi.fn().mockResolvedValue([]) },
    investmentContributionAllocations: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    savingsPlaces: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'bank',
        userId: 'u',
        name: 'Banco',
        normalizedName: 'banco',
      }),
    },
  };
}

type Log = { writes: Array<{ table: unknown; values: any }>; locks: unknown[] };

function contributionTx(
  queries: ReturnType<typeof contributionQueries>,
  log: Log,
  options: { profileMissing?: boolean } = {},
) {
  return {
    query: queries,
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          for: () => {
            log.locks.push(table);
            if (table === financialProfiles)
              return Promise.resolve(
                options?.profileMissing ? [] : [{ userId: 'u' }],
              );
            return Promise.resolve([{ id: 'bank' }]);
          },
        }),
      }),
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: () => {
          log.writes.push({ table, values });
          return Object.assign(Promise.resolve([]), {
            returning: () => Promise.resolve([{ id: 'updated' }]),
          });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: () => {
        log.writes.push({ table, values: 'delete' });
        return Promise.resolve([]);
      },
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        log.writes.push({ table, values });
        return Object.assign(Promise.resolve([]), {
          returning: () =>
            Promise.resolve([{ id: `new-${log.writes.length}` }]),
        });
      },
    }),
  };
}

function makeDb(
  queries: ReturnType<typeof contributionQueries>,
  log: Log,
  options?: { profileMissing?: boolean },
) {
  const tx = contributionTx(queries, log, options);
  return {
    query: queries,
    transaction: <T>(callback: (executor: typeof tx) => Promise<T>) =>
      callback(tx),
  } as unknown as Database;
}

function emptyLog(): Log {
  return { writes: [], locks: [] };
}

describe('saving contribution repository', () => {
  it('previews from owned loader rows with plan-weighted amounts and a token bound to draft and month', async () => {
    const queries = contributionQueries();
    const db = makeDb(queries, emptyLog());
    const result = await previewSavingContribution(db, 'u', '2026-08', draft);
    expect(
      result.preview.allocations.map(({ goalId, amount }) => [
        goalId,
        amount.amount,
      ]),
    ).toEqual([
      ['g1', '180.00'],
      ['g2', '120.00'],
    ]);
    expect(result.previewToken).toMatch(/^[a-f0-9]{64}$/);
    const state = await getSavingContributionState(db, 'u', '2026-08');
    expect(createSavingContributionPreviewToken(state!, '2026-08', draft)).toBe(
      result.previewToken,
    );
    expect(
      createSavingContributionPreviewToken(state!, '2026-08', {
        ...draft,
        amount: '301.00',
      }),
    ).not.toBe(result.previewToken);
    expect(
      createSavingContributionPreviewToken(state!, '2026-09', draft),
    ).not.toBe(result.previewToken);
  });

  it('rejects a preview when the profile is missing', async () => {
    const queries = contributionQueries();
    queries.financialProfiles.findFirst.mockResolvedValue(undefined);
    await expect(
      previewSavingContribution(
        makeDb(queries, emptyLog()),
        'u',
        '2026-08',
        draft,
      ),
    ).rejects.toThrow(
      'Completá tu perfil financiero antes de registrar un ahorro.',
    );
  });

  it('confirms under the profile lock with contribution, positions, and allocations', async () => {
    const queries = contributionQueries();
    const { previewToken } = await previewSavingContribution(
      makeDb(queries, emptyLog()),
      'u',
      '2026-08',
      draft,
    );
    const log = emptyLog();
    await expect(
      createSavingContributionInRepository(makeDb(queries, log), {
        userId: 'u',
        currentMonth: '2026-08',
        draft,
        previewToken,
      }),
    ).resolves.toMatchObject({ contributionId: expect.any(String) as never });
    expect(log.locks).toContain(financialProfiles);
    expect(log.writes).toContainEqual({
      table: savingContributions,
      values: expect.objectContaining({
        amount: '300.00',
        currency: 'ARS',
        placeId: 'bank',
      }) as never,
    });
    expect(
      log.writes
        .filter(({ table }) => table === goalSavingsPositions)
        .map(({ values }) => (values as { amount?: string }).amount),
    ).toEqual(['180.00', '120.00']);
    expect(
      log.writes
        .filter(({ table }) => table === savingContributionAllocations)
        .map(({ values }) => (values as { percentage?: string }).percentage),
    ).toEqual(['60.00', '40.00']);
    expect(log.writes.some(({ table }) => table === financialProfiles)).toBe(
      false,
    );
  });

  it('passes a catch-up created date through to the saved contribution row', async () => {
    const queries = contributionQueries();
    const { previewToken } = await previewSavingContribution(
      makeDb(queries, emptyLog()),
      'u',
      '2026-08',
      draft,
    );
    const log = emptyLog();
    const createdAt = new Date(Date.UTC(2026, 7, 0, 12));
    await createSavingContributionInRepository(makeDb(queries, log), {
      userId: 'u',
      currentMonth: '2026-08',
      draft,
      previewToken,
      createdAt,
    });
    expect(log.writes).toContainEqual({
      table: savingContributions,
      values: expect.objectContaining({ createdAt }) as never,
    });
  });

  it('returns a refreshed stale preview with zero writes when real loader rows change after preview', async () => {
    const goals = goalRows();
    const queries = contributionQueries({ goals });
    const db = makeDb(queries, emptyLog());
    const { previewToken } = await previewSavingContribution(
      db,
      'u',
      '2026-08',
      draft,
    );
    goals[1].name = 'Changed after preview';
    const log = emptyLog();
    const error = await createSavingContributionInRepository(
      makeDb(queries, log),
      { userId: 'u', currentMonth: '2026-08', draft, previewToken },
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(StaleSavingContributionPreviewError);
    const stale = error as StaleSavingContributionPreviewError;
    expect(stale.refreshedPreview.previewToken).not.toBe(previewToken);
    expect(
      stale.refreshedPreview.preview.allocations.map(
        ({ goalName }) => goalName,
      ),
    ).toEqual(['Notebook', 'Changed after preview']);
    expect(log.writes).toEqual([]);
  });

  it('rejects confirm with zero writes when the locked profile row is missing', async () => {
    const queries = contributionQueries();
    const { previewToken } = await previewSavingContribution(
      makeDb(queries, emptyLog()),
      'u',
      '2026-08',
      draft,
    );
    const log = emptyLog();
    await expect(
      createSavingContributionInRepository(
        makeDb(queries, log, { profileMissing: true }),
        { userId: 'u', currentMonth: '2026-08', draft, previewToken },
      ),
    ).rejects.toThrow('Financial profile not found.');
    expect(log.writes).toEqual([]);
  });

  it('previews investment kind from investment-strategy plan goals', async () => {
    const queries = contributionQueries();
    const result = await previewSavingContribution(
      makeDb(queries, emptyLog()),
      'u',
      '2026-08',
      investmentDraft,
    );
    expect(
      result.preview.allocations.map(({ goalId, amount }) => [
        goalId,
        amount.amount,
      ]),
    ).toEqual([['g3', '200.00']]);
  });

  it('confirms investment kind by moving the goal position value and writing investment rows', async () => {
    const queries = contributionQueries();
    const { previewToken } = await previewSavingContribution(
      makeDb(queries, emptyLog()),
      'u',
      '2026-08',
      investmentDraft,
    );
    const log = emptyLog();
    await createSavingContributionInRepository(makeDb(queries, log), {
      userId: 'u',
      currentMonth: '2026-08',
      draft: investmentDraft,
      previewToken,
    });
    expect(log.writes).toContainEqual({
      table: investmentContributions,
      values: expect.objectContaining({
        amount: '200.00',
        currency: 'ARS',
      }) as never,
    });
    expect(log.writes).toContainEqual({
      table: goalInvestmentPositions,
      values: { currentValue: '1200.00' },
    });
    expect(log.writes).toContainEqual({
      table: investmentContributionAllocations,
      values: [
        expect.objectContaining({
          goalId: 'g3',
          amount: '200.00',
          investmentPositionId: 'ip3',
        }),
      ],
    });
    expect(log.writes.some(({ table }) => table === savingContributions)).toBe(
      false,
    );
  });

  it('returns a stale investment preview with zero writes when the investment position changes after preview', async () => {
    const positions = [
      { id: 'ip3', goalId: 'g3', currentValue: '1000.00', currency: 'ARS' },
    ];
    const queries = contributionQueries({ investmentPositions: positions });
    const { previewToken } = await previewSavingContribution(
      makeDb(queries, emptyLog()),
      'u',
      '2026-08',
      investmentDraft,
    );
    positions[0].currentValue = '5000.00';
    const log = emptyLog();
    const error = await createSavingContributionInRepository(
      makeDb(queries, log),
      {
        userId: 'u',
        currentMonth: '2026-08',
        draft: investmentDraft,
        previewToken,
      },
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(StaleSavingContributionPreviewError);
    expect(log.writes).toEqual([]);
  });

  const savedContribution = {
    id: 'c1',
    userId: 'u',
    placeId: 'bank',
    currency: 'ARS',
    amount: '300.00',
  };
  const savedAllocations = [
    {
      id: 'al1',
      contributionId: 'c1',
      goalId: 'g1',
      amount: '180.00',
      percentage: '60.00',
      savingPositionId: 'p1',
    },
    {
      id: 'al2',
      contributionId: 'c1',
      goalId: 'g2',
      amount: '120.00',
      percentage: '40.00',
      savingPositionId: 'p2',
    },
  ];

  it('updates owned contribution amounts and allocation rows with the place locked', async () => {
    const queries = contributionQueries();
    queries.savingContributions.findFirst.mockResolvedValue(savedContribution);
    queries.savingContributionAllocations.findMany.mockResolvedValue(
      savedAllocations,
    );
    const log = emptyLog();
    await updateSavingContributionInRepository(makeDb(queries, log), {
      userId: 'u',
      contributionId: 'c1',
      draft: { ...draft, amount: '500.00' },
    });
    expect(log.locks).toContain(savingsPlaces);
    expect(
      log.writes
        .filter(({ table }) => table === goalSavingsPositions)
        .map(({ values }) => (values as { amount?: string }).amount),
    ).toEqual(['300.00', '200.00']);
    expect(log.writes).toContainEqual({
      table: savingContributions,
      values: expect.objectContaining({
        amount: '500.00',
        placeId: 'bank',
      }) as never,
    });
  });

  it('updates investment contribution amounts by the position delta', async () => {
    const queries = contributionQueries();
    queries.investmentContributions.findFirst.mockResolvedValue({
      id: 'ic1',
      userId: 'u',
      currency: 'ARS',
      amount: '200.00',
    });
    queries.investmentContributionAllocations.findMany.mockResolvedValue([
      {
        id: 'ial1',
        contributionId: 'ic1',
        goalId: 'g3',
        amount: '200.00',
        percentage: '100.00',
        investmentPositionId: 'ip3',
      },
    ]);
    queries.goalInvestmentPositions.findFirst.mockResolvedValue({
      id: 'ip3',
      currentValue: '1200.00',
    });
    const log = emptyLog();
    await updateSavingContributionInRepository(makeDb(queries, log), {
      userId: 'u',
      contributionId: 'ic1',
      draft: { kind: 'investment', currency: 'ARS', amount: '300.00' },
    });
    expect(log.writes).toContainEqual({
      table: goalInvestmentPositions,
      values: { currentValue: '1300.00' },
    });
    expect(log.writes).toContainEqual({
      table: investmentContributionAllocations,
      values: { amount: '300.00' },
    });
    expect(log.writes).toContainEqual({
      table: investmentContributions,
      values: expect.objectContaining({ amount: '300.00' }) as never,
    });
  });

  it('rejects update of a contribution not owned by the user with zero writes', async () => {
    const queries = contributionQueries();
    const log = emptyLog();
    await expect(
      updateSavingContributionInRepository(makeDb(queries, log), {
        userId: 'u',
        contributionId: 'foreign',
        draft,
      }),
    ).rejects.toThrow('Contribution not found or not owned by user.');
    expect(log.writes).toEqual([]);
  });

  it('rejects update when a target goal is completed, with zero writes', async () => {
    const queries = contributionQueries();
    queries.savingContributions.findFirst.mockResolvedValue(savedContribution);
    queries.savingContributionAllocations.findMany.mockResolvedValue(
      savedAllocations,
    );
    queries.financialGoals.findMany.mockResolvedValue(
      goalRows().map((goal) => ({ ...goal, status: 'completed' })),
    );
    const log = emptyLog();
    await expect(
      updateSavingContributionInRepository(makeDb(queries, log), {
        userId: 'u',
        contributionId: 'c1',
        draft,
      }),
    ).rejects.toThrow(
      'No se pueden modificar aportes de objetivos completados.',
    );
    expect(log.writes).toEqual([]);
  });

  it('deletes owned saving contribution, its allocations positions, and the contribution row', async () => {
    const queries = contributionQueries();
    queries.savingContributions.findFirst.mockResolvedValue(savedContribution);
    queries.savingContributionAllocations.findMany.mockResolvedValue(
      savedAllocations,
    );
    const log = emptyLog();
    await deleteSavingContributionInRepository(makeDb(queries, log), {
      userId: 'u',
      contributionId: 'c1',
    });
    expect(log.writes).toContainEqual({
      table: goalSavingsPositions,
      values: 'delete',
    });
    expect(log.writes).toContainEqual({
      table: savingContributions,
      values: 'delete',
    });
  });

  it('deletes owned investment contribution by reversing the position delta', async () => {
    const queries = contributionQueries();
    queries.investmentContributions.findFirst.mockResolvedValue({
      id: 'ic1',
      userId: 'u',
      currency: 'ARS',
      amount: '200.00',
    });
    queries.investmentContributionAllocations.findMany.mockResolvedValue([
      {
        id: 'ial1',
        contributionId: 'ic1',
        goalId: 'g3',
        amount: '200.00',
        percentage: '100.00',
        investmentPositionId: 'ip3',
      },
    ]);
    queries.goalInvestmentPositions.findFirst.mockResolvedValue({
      id: 'ip3',
      currentValue: '1200.00',
    });
    const log = emptyLog();
    await deleteSavingContributionInRepository(makeDb(queries, log), {
      userId: 'u',
      contributionId: 'ic1',
    });
    expect(log.writes).toContainEqual({
      table: goalInvestmentPositions,
      values: { currentValue: '1000.00' },
    });
    expect(log.writes).toContainEqual({
      table: investmentContributions,
      values: 'delete',
    });
  });

  it('rejects delete when a target goal is completed, with zero writes', async () => {
    const queries = contributionQueries();
    queries.savingContributions.findFirst.mockResolvedValue(savedContribution);
    queries.savingContributionAllocations.findMany.mockResolvedValue(
      savedAllocations,
    );
    queries.financialGoals.findMany.mockResolvedValue(
      goalRows().map((goal) => ({ ...goal, status: 'completed' })),
    );
    const log = emptyLog();
    await expect(
      deleteSavingContributionInRepository(makeDb(queries, log), {
        userId: 'u',
        contributionId: 'c1',
      }),
    ).rejects.toThrow(
      'No se pueden modificar aportes de objetivos completados.',
    );
    expect(log.writes).toEqual([]);
  });
});
