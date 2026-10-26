import { describe, expect, it, vi } from 'vitest';
import type { FinancesWorkspace, GoalsWorkspace } from '@repo/shared-types';
import { HomeService } from './home.service';

const sampleGoalEligible = {
  id: 'goal-1',
  name: 'Colchón de 3 meses',
  type: 'emergency_fund',
  currency: 'ARS' as const,
  priority: 'high' as const,
  strategy: 'save' as const,
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  targetAmount: { amount: '3000000.00', currency: 'ARS' as const },
  savingsValue: { amount: '0.00', currency: 'ARS' as const },
  investmentValue: { amount: '0.00', currency: 'ARS' as const },
  actualValue: { amount: '0.00', currency: 'ARS' as const },
  funding: [],
  projection: { status: 'available' as const, completionMonth: '2027-03' },
  usesPlanningRate: false,
  completionEligible: true,
};

const sampleGoalIneligible = {
  ...sampleGoalEligible,
  id: 'goal-2',
  completionEligible: false,
};

const presentGoalsWorkspace: GoalsWorkspace = {
  profile: 'present',
  workspace: {
    financialSummary: {
      month: '2026-08',
      income: { amount: '3000000.00', currency: 'ARS' },
      expenses: { amount: '900000.00', currency: 'ARS' },
      balance: { amount: '2100000.00', currency: 'ARS' },
      dedicationPercentage: '90.00',
      contribution: { amount: '1890000.00', currency: 'ARS' },
    },
    groups: [
      {
        status: 'active',
        goals: [sampleGoalEligible, sampleGoalIneligible],
      },
    ],
  },
};

const presentFinancesWorkspace: FinancesWorkspace = {
  goalDedicationPercentage: '90.00',
  month: '2026-08',
  summary: {
    income: { amount: '3000000.00', currency: 'ARS' },
    expenses: { amount: '900000.00', currency: 'ARS' },
    balance: { amount: '2100000.00', currency: 'ARS' },
    contribution: { amount: '1890000.00', currency: 'ARS' },
  },
  incomes: { sources: [], incomes: [] },
  expenses: { sources: [], expenses: [] },
  savings: { places: [], movements: [] },
};

describe('HomeService', () => {
  it('projects timestamped finance entries into the strict roadmap contract', async () => {
    const income = {
      id: 'salary', sourceKind: 'salary', sourceId: null, sourceName: 'Sueldo',
      concept: null, amount: '3000000.00', currency: 'ARS' as const,
      recurring: true, effectiveMonth: '2026-07-01', arsEquivalent: null,
      createdAt: '2026-07-01T12:00:00.000Z',
    };
    const expense = { ...income, id: 'rent', sourceKind: 'housing', endMonth: '2026-08-01' };
    const service = new HomeService(
      { getWorkspace: async () => presentGoalsWorkspace } as any,
      { getWorkspace: async () => ({
        ...presentFinancesWorkspace,
        incomes: { sources: [], incomes: [income] },
        expenses: { sources: [], expenses: [expense] },
      }) } as any,
    );

    const result = await service.getHome('user-1', '2026-08');
    if (!('roadmap' in result)) throw new Error('Expected roadmap');
    expect(result.roadmap.currentMonth.recurringIncomes[0]).toMatchObject({ id: 'salary', amount: '3000000.00' });
    expect(result.roadmap.currentMonth.endingExpenses[0]).toMatchObject({ id: 'rent', endMonth: '2026-08-01' });
    expect(result.roadmap.historyMonths[0].month).toBe('2026-07');
    expect(result.roadmap.currentMonth.recurringIncomes[0]).not.toHaveProperty('createdAt');
    expect(result.roadmap.currentMonth.endingExpenses[0]).not.toHaveProperty('createdAt');
  });

  it('returns missing profile if goals workspace profile is missing', async () => {
    const goalsService = {
      getWorkspace: vi.fn().mockResolvedValue({ profile: 'missing' }),
    };
    const financesService = {
      getWorkspace: vi.fn().mockResolvedValue(presentFinancesWorkspace),
    };
    const service = new HomeService(
      goalsService as any,
      financesService as any,
    );

    const result = await service.getHome('user-1', '2026-08');
    expect(result).toEqual({ profile: 'missing' });
  });

  it('returns missing profile if finances workspace is null', async () => {
    const goalsService = {
      getWorkspace: vi.fn().mockResolvedValue(presentGoalsWorkspace),
    };
    const financesService = { getWorkspace: vi.fn().mockResolvedValue(null) };
    const service = new HomeService(
      goalsService as any,
      financesService as any,
    );

    const result = await service.getHome('user-1', '2026-08');
    expect(result).toEqual({ profile: 'missing' });
  });

  it('builds roadmap and extracts completion eligible goals when profile is present', async () => {
    const goalsService = {
      getWorkspace: vi.fn().mockResolvedValue(presentGoalsWorkspace),
    };
    const financesService = {
      getWorkspace: vi.fn().mockResolvedValue(presentFinancesWorkspace),
    };
    const service = new HomeService(
      goalsService as any,
      financesService as any,
    );

    const result = await service.getHome('user-1', '2026-08');
    expect(result).toHaveProperty('roadmap');
    expect(result).toHaveProperty('completionGoals');
    if (!('roadmap' in result) || !('completionGoals' in result))
      throw new Error('Expected roadmap and completionGoals');
    expect(result.completionGoals).toEqual([sampleGoalEligible]);
    expect(result.roadmap.currentMonth.month).toBe('2026-08');
    expect(goalsService.getWorkspace).toHaveBeenCalledWith('user-1', '2026-08');
    expect(financesService.getWorkspace).toHaveBeenCalledWith(
      'user-1',
      '2026-08',
    );
  });

  it('forwards requested non-current month to both goals and finances workspaces', async () => {
    const goalsService = {
      getWorkspace: vi.fn().mockResolvedValue(presentGoalsWorkspace),
    };
    const financesService = {
      getWorkspace: vi.fn().mockResolvedValue(presentFinancesWorkspace),
    };
    const service = new HomeService(
      goalsService as any,
      financesService as any,
    );

    await service.getHome('user-1', '2026-11');
    expect(goalsService.getWorkspace).toHaveBeenCalledWith('user-1', '2026-11');
    expect(financesService.getWorkspace).toHaveBeenCalledWith(
      'user-1',
      '2026-11',
    );
  });

  it('throws when roadmap or workspace data violates schema contract', async () => {
    const invalidGoalsWorkspace = {
      profile: 'present',
      workspace: {
        ...presentGoalsWorkspace.workspace,
        groups: [
          {
            status: 'active',
            goals: [
              { ...sampleGoalEligible, priority: 'invalid-priority' as never },
            ],
          },
        ],
      },
    };
    const goalsService = {
      getWorkspace: vi.fn().mockResolvedValue(invalidGoalsWorkspace),
    };
    const financesService = {
      getWorkspace: vi.fn().mockResolvedValue(presentFinancesWorkspace),
    };
    const service = new HomeService(
      goalsService as any,
      financesService as any,
    );

    await expect(service.getHome('user-1', '2026-08')).rejects.toThrow();
  });
});
