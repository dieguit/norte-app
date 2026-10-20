import { describe, expect, it, vi } from 'vitest';
import { ProfileService } from './profile.service';

describe('ProfileService.getProfile', () => {
  it('returns missing unless the authenticated user has an initialized plan', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const service = new ProfileService({
      query: { financialProfiles: { findFirst } },
    } as never);

    await expect(service.getProfile('clerk-user')).resolves.toEqual({
      profile: 'missing',
    });
    expect(findFirst).toHaveBeenCalledOnce();
    expect(
      (
        findFirst.mock.calls[0][0].where as {
          queryChunks: Array<{ value?: unknown }>;
        }
      ).queryChunks.some((chunk) => chunk.value === 'clerk-user'),
    ).toBe(true);
  });

  it.each(['snapshot', 'allocation', 'goal'] as const)(
    'returns missing when the initialized plan has no %s',
    async (missing) => {
      const query = {
        financialProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            expensesKnowledge: 'unknown',
            plannedMonthlyContribution: '100.00',
            baseCurrency: 'ARS',
          }),
        },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue(
            missing === 'snapshot'
              ? undefined
              : {
                  id: 'snapshot-1',
                  effectiveMonth: '2026-10-01',
                  plannedMonthlyContribution: '100.00',
                },
          ),
        },
        allocationPlanEntries: {
          findFirst: vi
            .fn()
            .mockResolvedValue(
              missing === 'allocation'
                ? undefined
                : { goalId: 'goal-1', percentage: '100.00' },
            ),
        },
        financialGoals: {
          findFirst: vi.fn().mockResolvedValue(
            missing === 'goal'
              ? undefined
              : {
                  id: 'goal-1',
                  type: 'emergency_fund',
                  name: 'Fondo',
                  strategy: 'save',
                  currency: 'USD',
                  targetAmount: null,
                },
          ),
        },
      };
      const service = new ProfileService({ query } as never);
      await expect(service.getProfile('clerk-user')).resolves.toEqual({
        profile: 'missing',
      });
    },
  );

  it('serializes the full present home state using user-scoped reads', async () => {
    const findFirstProfile = vi.fn().mockResolvedValue({
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '100.00',
      baseCurrency: 'ARS',
    });
    const findMany = vi.fn().mockResolvedValue([]);
    const incomeFindMany = vi.fn().mockResolvedValue([
      {
        amount: '100.10',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-10-01',
      },
      {
        amount: '1.23',
        currency: 'USD',
        recurring: true,
        effectiveMonth: '2026-09-01',
      },
      {
        amount: '500.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-10-01',
      },
      {
        amount: '500.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-11-01',
      },
    ]);
    const expenseFindMany = vi.fn().mockResolvedValue([
      {
        amount: '50.10',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-09-01',
        endMonth: null,
      },
      {
        amount: '1.10',
        currency: 'USD',
        recurring: true,
        effectiveMonth: '2026-10-01',
        endMonth: '2026-11-01',
      },
      {
        amount: '200.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-10-01',
        endMonth: null,
      },
      {
        amount: '9.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-09-01',
        endMonth: '2026-10-01',
      },
    ]);
    const service = new ProfileService({
      query: {
        financialProfiles: { findFirst: findFirstProfile },
        incomes: { findMany: incomeFindMany },
        expenses: { findMany: expenseFindMany },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'snapshot-1',
            effectiveMonth: '2026-10-01',
            plannedMonthlyContribution: '100.00',
          }),
          findMany: findMany,
        },
        allocationPlanEntries: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ goalId: 'goal-1', percentage: '100.00' }),
          findMany,
        },
        financialGoals: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'goal-1',
            type: 'emergency_fund',
            name: 'Fondo',
            strategy: 'save',
            targetAmount: null,
            currency: 'USD',
            emergencyFundMonths: 3,
          }),
          findMany,
        },
        savingContributions: { findMany },
        investmentContributions: { findMany },
      },
    } as never);

    const result = await service.getProfile(
      'clerk-user',
      new Date('2026-10-19T12:00:00Z'),
    );

    expect(result).toMatchObject({
      profile: 'present',
      home: {
        income: { amount: '1945.10', currency: 'ARS' },
        expensesKnowledge: 'known',
        expenses: { amount: '1900.10', currency: 'ARS' },
        plan: {
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          monthlyCommitment: { amount: '100.00', currency: 'ARS' },
          destinationAmount: { amount: '0.07', currency: 'USD' },
          effectiveMonth: '2026-10',
          allocationPercentage: '100.00',
        },
        goal: {
          type: 'emergency_fund',
          name: 'Fondo',
          targetAmount: { amount: '3.80', currency: 'USD' },
          currentAmount: { amount: '0.00', currency: 'USD' },
          emergencyFundMonths: 3,
        },
        previousMonthShortfalls: [],
      },
    });
    expect(
      (
        findFirstProfile.mock.calls[0][0].where as {
          queryChunks: Array<{ value?: unknown }>;
        }
      ).queryChunks.some((chunk) => chunk.value === 'clerk-user'),
    ).toBe(true);
    expect(incomeFindMany).toHaveBeenCalledOnce();
    expect(expenseFindMany).toHaveBeenCalledOnce();
  });

  it('preserves prior UTC month shortfalls and ignores invalid historical amounts', async () => {
    const goal = {
      id: 'goal-1',
      userId: 'clerk-user',
      type: 'purchase',
      name: 'Auto',
      strategy: 'save',
      targetAmount: '1000.00',
      currency: 'ARS',
      emergencyFundMonths: null,
    };
    const service = new ProfileService({
      query: {
        financialProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            expensesKnowledge: 'unknown',
            plannedMonthlyContribution: '100.00',
            baseCurrency: 'ARS',
          }),
        },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
        allocationPlanSnapshots: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: 'current', effectiveMonth: '2026-10-01' }),
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'prior',
              effectiveMonth: '2026-09-01',
              plannedMonthlyContribution: '100000.00',
            },
          ]),
        },
        allocationPlanEntries: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ goalId: 'goal-1', percentage: '50.00' }),
          findMany: vi
            .fn()
            .mockResolvedValue([{ goalId: 'goal-1', percentage: '50.00' }]),
        },
        financialGoals: {
          findFirst: vi.fn().mockResolvedValue(goal),
          findMany: vi.fn().mockResolvedValue([goal]),
        },
        savingContributions: {
          findMany: vi.fn().mockResolvedValue([
            {
              amount: '-5000.00',
              currency: 'ARS',
              createdAt: '2026-09-10T00:00:00.000Z',
            },
            {
              amount: 'invalid',
              currency: 'ARS',
              createdAt: '2026-09-11T00:00:00.000Z',
            },
            {
              amount: '5000.00',
              currency: 'ARS',
              createdAt: '2026-09-12T00:00:00.000Z',
            },
          ]),
        },
        investmentContributions: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as never);

    const result = await service.getProfile(
      'clerk-user',
      new Date('2026-10-01T00:30:00-03:00'),
    );

    expect(result).toMatchObject({
      profile: 'present',
      home: {
        expensesKnowledge: 'unknown',
        goal: { targetAmount: { amount: '1000.00', currency: 'ARS' } },
        previousMonthShortfalls: [
          {
            kind: 'saving',
            currency: 'ARS',
            amount: { amount: '45000.00', currency: 'ARS' },
          },
        ],
      },
    });
    expect(JSON.parse(JSON.stringify(result)).home).not.toHaveProperty(
      'expenses',
    );
  });

  it('returns empty previousMonthShortfalls for a legacy snapshot with null plannedMonthlyContribution', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z');
    const service = new ProfileService({
      query: {
        financialProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            userId: 'user_legacy',
            baseCurrency: 'ARS',
            expensesKnowledge: 'unknown',
            plannedMonthlyContribution: '50000.00',
          }),
        },
        financialGoals: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'goal_legacy',
            userId: 'user_legacy',
            name: 'Colchón financiero',
            type: 'emergency_fund',
            targetAmount: null,
            currency: 'USD',
            emergencyFundMonths: 6,
            strategy: 'save',
          }),
        },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'snapshot_legacy',
            userId: 'user_legacy',
            effectiveMonth: '2026-06-01',
            plannedMonthlyContribution: null,
          }),
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'snapshot_legacy',
              userId: 'user_legacy',
              effectiveMonth: '2026-06-01',
              plannedMonthlyContribution: null,
            },
          ]),
        },
        allocationPlanEntries: {
          findFirst: vi.fn().mockResolvedValue({
            snapshotId: 'snapshot_legacy',
            goalId: 'goal_legacy',
            percentage: '100.00',
          }),
        },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as never);

    const legacyHome = await service.getProfile('user_legacy', fixedNow);
    expect(legacyHome).toMatchObject({
      profile: 'present',
      home: {
        previousMonthShortfalls: [],
      },
    });
  });

  it('returns empty previousMonthShortfalls when no snapshot is effective on or before closed month', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z');
    const service = new ProfileService({
      query: {
        financialProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            userId: 'user_future',
            baseCurrency: 'ARS',
            expensesKnowledge: 'unknown',
            plannedMonthlyContribution: '50000.00',
          }),
        },
        financialGoals: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'goal_1',
            userId: 'user_future',
            name: 'Colchón financiero',
            type: 'emergency_fund',
            targetAmount: null,
            currency: 'USD',
            emergencyFundMonths: 6,
            strategy: 'save',
          }),
        },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'snapshot_future',
            userId: 'user_future',
            effectiveMonth: '2026-08-01',
            plannedMonthlyContribution: '50000.00',
          }),
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'snapshot_future',
              userId: 'user_future',
              effectiveMonth: '2026-08-01',
              plannedMonthlyContribution: '50000.00',
            },
          ]),
        },
        allocationPlanEntries: {
          findFirst: vi.fn().mockResolvedValue({
            snapshotId: 'snapshot_future',
            goalId: 'goal_1',
            percentage: '100.00',
          }),
        },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as never);

    const home = await service.getProfile('user_future', fixedNow);
    expect(home).toMatchObject({
      profile: 'present',
      home: {
        previousMonthShortfalls: [],
      },
    });
  });

  it('uses recurring incomes in the current month instead of the onboarding approximation', async () => {
    const fixedNow = new Date('2026-08-15T12:00:00Z');
    const service = new ProfileService({
      query: {
        financialProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            userId: 'user_income',
            baseCurrency: 'ARS',
            expensesKnowledge: 'unknown',
            plannedMonthlyContribution: '50000.00',
          }),
        },
        financialGoals: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'goal_income',
            userId: 'user_income',
            name: 'Meta',
            type: 'fixed_savings',
            targetAmount: '1000000.00',
            currency: 'ARS',
            emergencyFundMonths: null,
            strategy: 'save',
          }),
        },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'snapshot_income',
            userId: 'user_income',
            effectiveMonth: '2026-08-01',
            plannedMonthlyContribution: '50000.00',
          }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        allocationPlanEntries: {
          findFirst: vi.fn().mockResolvedValue({
            snapshotId: 'snapshot_income',
            goalId: 'goal_income',
            percentage: '100.00',
          }),
        },
        incomes: {
          findMany: vi.fn().mockResolvedValue([
            {
              amount: '100000.00',
              currency: 'ARS',
              recurring: true,
              effectiveMonth: '2026-08-01',
            },
            {
              amount: '100.00',
              currency: 'USD',
              recurring: true,
              effectiveMonth: '2026-08-01',
            },
            {
              amount: '900000.00',
              currency: 'ARS',
              recurring: false,
              effectiveMonth: '2026-08-01',
            },
          ]),
        },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as never);

    const home = await service.getProfile('user_income', fixedNow);
    expect(home).toMatchObject({
      profile: 'present',
      home: {
        income: { amount: '250000.00', currency: 'ARS' },
      },
    });
  });

  it('returns missing when the user has no goal, snapshot, or allocation', async () => {
    const profile = {
      userId: 'user_missing_data',
      baseCurrency: 'ARS',
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '50000.00',
    };
    const goal = {
      id: 'goal_missing_data',
      userId: 'user_missing_data',
      name: 'Meta',
      type: 'purchase',
      targetAmount: '1000000.00',
      currency: 'ARS',
      emergencyFundMonths: null,
      strategy: 'save',
    };
    const snapshot = {
      id: 'snapshot_missing_data',
      userId: 'user_missing_data',
      effectiveMonth: '2026-08-01',
      plannedMonthlyContribution: '50000.00',
    };
    const allocation = {
      goalId: 'goal_missing_data',
      percentage: '100.00',
    };

    let service = new ProfileService({
      query: {
        financialProfiles: { findFirst: vi.fn().mockResolvedValue(profile) },
        financialGoals: { findFirst: vi.fn().mockResolvedValue(undefined) },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue(snapshot),
        },
        allocationPlanEntries: {
          findFirst: vi.fn().mockResolvedValue(allocation),
        },
      },
    } as never);
    await expect(service.getProfile('user_missing_data')).resolves.toEqual({
      profile: 'missing',
    });

    service = new ProfileService({
      query: {
        financialProfiles: { findFirst: vi.fn().mockResolvedValue(profile) },
        financialGoals: { findFirst: vi.fn().mockResolvedValue(goal) },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
        allocationPlanEntries: {
          findFirst: vi.fn().mockResolvedValue(allocation),
        },
      },
    } as never);
    await expect(service.getProfile('user_missing_data')).resolves.toEqual({
      profile: 'missing',
    });

    service = new ProfileService({
      query: {
        financialProfiles: { findFirst: vi.fn().mockResolvedValue(profile) },
        financialGoals: { findFirst: vi.fn().mockResolvedValue(goal) },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue(snapshot),
        },
        allocationPlanEntries: {
          findFirst: vi.fn().mockResolvedValue(undefined),
        },
      },
    } as never);
    await expect(service.getProfile('user_missing_data')).resolves.toEqual({
      profile: 'missing',
    });
  });

  it('uses an explicit non-emergency goal target in the home projection', async () => {
    const service = new ProfileService({
      query: {
        financialProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            userId: 'user_target',
            baseCurrency: 'ARS',
            expensesKnowledge: 'unknown',
            plannedMonthlyContribution: '50000.00',
          }),
        },
        financialGoals: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'goal_target',
            userId: 'user_target',
            name: 'Meta',
            type: 'purchase',
            targetAmount: '1000000.00',
            currency: 'ARS',
            emergencyFundMonths: null,
            strategy: 'save',
          }),
        },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'snapshot_target',
            userId: 'user_target',
            effectiveMonth: '2026-08-01',
            plannedMonthlyContribution: '50000.00',
          }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        allocationPlanEntries: {
          findFirst: vi.fn().mockResolvedValue({
            snapshotId: 'snapshot_target',
            goalId: 'goal_target',
            percentage: '100.00',
          }),
        },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as never);

    const home = await service.getProfile(
      'user_target',
      new Date('2026-08-15T12:00:00Z'),
    );

    expect(home).toMatchObject({
      profile: 'present',
      home: {
        goal: {
          targetAmount: { amount: '1000000.00', currency: 'ARS' },
        },
      },
    });
  });

  it('uses the goal still allocated by the latest snapshot when the oldest goal is completed', async () => {
    const oldestCompletedGoal = {
      id: 'goal_completed',
      userId: 'user_snapshot_goal',
      name: 'Objetivo completado',
      type: 'purchase',
      targetAmount: '1000000.00',
      currency: 'ARS',
      emergencyFundMonths: null,
      strategy: 'save',
      status: 'completed',
    };
    const latestGoal = {
      ...oldestCompletedGoal,
      id: 'goal_active',
      name: 'Objetivo vigente',
      status: 'active',
      targetAmount: '2000000.00',
    };
    let allocationQueried = false;

    const service = new ProfileService({
      query: {
        financialProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            userId: 'user_snapshot_goal',
            baseCurrency: 'ARS',
            expensesKnowledge: 'unknown',
            plannedMonthlyContribution: '50000.00',
          }),
        },
        allocationPlanSnapshots: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'snapshot_latest',
            userId: 'user_snapshot_goal',
            effectiveMonth: '2026-08-01',
            plannedMonthlyContribution: '50000.00',
          }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        allocationPlanEntries: {
          findFirst: vi.fn().mockImplementation(async () => {
            allocationQueried = true;
            return {
              snapshotId: 'snapshot_latest',
              goalId: latestGoal.id,
              percentage: '100.00',
            };
          }),
        },
        financialGoals: {
          findFirst: vi.fn().mockImplementation(async () => {
            return allocationQueried ? latestGoal : oldestCompletedGoal;
          }),
        },
        incomes: { findMany: vi.fn().mockResolvedValue([]) },
        expenses: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as never);

    const home = await service.getProfile(
      'user_snapshot_goal',
      new Date('2026-08-15T12:00:00Z'),
    );

    expect(home).toMatchObject({
      profile: 'present',
      home: {
        goal: {
          name: 'Objetivo vigente',
          targetAmount: { amount: '2000000.00', currency: 'ARS' },
        },
      },
    });
  });
});
