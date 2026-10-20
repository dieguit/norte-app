import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ExpensesService } from '../expenses/expenses.service';
import { IncomesService } from '../incomes/incomes.service';
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  expenses,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
  incomes,
} from '../profile/profile.schema';
import { FinancialOnboardingService } from './financial-onboarding.service';

const standardInput = {
  goal: {
    type: 'emergency_fund' as const,
    name: 'Fondo de emergencia',
    targetAmount: '0',
    currency: 'USD' as const,
    desiredMonth: '',
    priority: 'high' as const,
    strategy: 'save' as const,
    annualReturnRate: '0',
    availability: 'available_now' as const,
    availableFromMonth: '',
    allocations: [],
  },
  incomes: [
    {
      source: { kind: 'salary' as const },
      concept: 'Sueldo principal',
      amount: '500000.00',
      currency: 'ARS' as const,
      recurring: true,
      effectiveMonth: '2026-08',
    },
  ],
  expenses: [
    {
      source: { kind: 'housing' as const },
      concept: 'Alquiler',
      amount: '250000.00',
      currency: 'ARS' as const,
      recurring: true,
    },
  ],
};

function createHarness() {
  const persisted = {
    profile: null as any,
    incomes: [] as any[],
    expenses: [] as any[],
    goal: null as any,
    investment: null as any,
    snapshot: null as any,
    allocation: null as any,
  };
  const tx = {
    insert: vi.fn((table: unknown) => {
      if (table === financialProfiles) {
        return {
          values: (val: any) => {
            persisted.profile = val;
            return {
              onConflictDoNothing: () => ({
                returning: () => [{ userId: val.userId }],
              }),
            };
          },
        };
      }
      if (table === incomes) {
        return {
          values: (val: any) => {
            persisted.incomes.push(val);
            return {
              returning: () => [
                { id: `inc_${persisted.incomes.length}`, ...val },
              ],
            };
          },
        };
      }
      if (table === expenses) {
        return {
          values: (val: any) => {
            persisted.expenses.push(val);
            return {
              returning: () => [
                { id: `exp_${persisted.expenses.length}`, ...val },
              ],
            };
          },
        };
      }
      if (table === financialGoals) {
        return {
          values: (val: any) => {
            persisted.goal = val;
            return {
              returning: () => [{ id: 'goal_1', ...val }],
            };
          },
        };
      }
      if (table === goalInvestmentPositions) {
        return {
          values: (val: any) => {
            persisted.investment = val;
            return { returning: vi.fn() };
          },
        };
      }
      if (table === allocationPlanSnapshots) {
        return {
          values: (val: any) => {
            persisted.snapshot = val;
            return {
              returning: () => [{ id: 'snapshot_1', ...val }],
            };
          },
        };
      }
      if (table === allocationPlanEntries) {
        return {
          values: (val: any) => {
            persisted.allocation = val;
            return {
              returning: () => [{ id: 'entry_1', ...val }],
            };
          },
        };
      }
      throw new Error(`Unexpected table insert: ${String(table)}`);
    }),
    query: {
      incomeSources: { findFirst: vi.fn() },
      expenseSources: { findFirst: vi.fn() },
    },
  };
  const db = {
    transaction: vi.fn((callback: (executor: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const service = new FinancialOnboardingService(
    db as never,
    new IncomesService(db as never),
    new ExpensesService(db as never),
  );
  return { db, tx, persisted, service };
}

describe('FinancialOnboardingService', () => {
  it('persists profile, goal, snapshot, entries, incomes, and expenses in one transaction with 90% positive balance', async () => {
    const { db, persisted, service } = createHarness();

    const result = await service.complete('user_1', standardInput);

    expect(result).toEqual({ created: true });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(persisted.profile).toMatchObject({
      userId: 'user_1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '225000.00',
      goalDedicationPercentage: '90.00',
      onboardingCompleted: true,
    });
    expect(persisted.goal).toMatchObject({
      name: 'Fondo de emergencia',
      type: 'emergency_fund',
      targetAmount: '500.00',
      currency: 'USD',
      emergencyFundMonths: 3,
      strategy: 'save',
      status: 'active',
    });
    expect(persisted.snapshot).toMatchObject({
      userId: 'user_1',
      effectiveMonth: expect.stringMatching(/^\d{4}-\d{2}-01$/),
      plannedMonthlyContribution: '225000.00',
    });
    expect(persisted.allocation).toEqual({
      snapshotId: 'snapshot_1',
      goalId: 'goal_1',
      percentage: '100.00',
    });
    expect(persisted.incomes).toHaveLength(1);
    expect(persisted.incomes[0]).toMatchObject({
      userId: 'user_1',
      concept: 'Sueldo principal',
      amount: '500000.00',
      currency: 'ARS',
      recurring: true,
    });
    expect(persisted.expenses).toHaveLength(1);
    expect(persisted.expenses[0]).toMatchObject({
      userId: 'user_1',
      concept: 'Alquiler',
      amount: '250000.00',
      currency: 'ARS',
      recurring: true,
      endMonth: null,
    });
  });

  it('uses the server month for income, expense, and snapshot effective dates', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));
    try {
      const { persisted, service } = createHarness();
      await service.complete('user_1', {
        ...standardInput,
        incomes: [{ ...standardInput.incomes[0], effectiveMonth: '2020-01' }],
      });

      expect(persisted.incomes[0].effectiveMonth).toBe('2026-08-01');
      expect(persisted.expenses[0].effectiveMonth).toBe('2026-08-01');
      expect(persisted.snapshot.effectiveMonth).toBe('2026-08-01');
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles USD conversion for income and expenses at the planning rate', async () => {
    const { persisted, service } = createHarness();

    const result = await service.complete('user_1', {
      ...standardInput,
      incomes: [
        {
          source: { kind: 'independent' as const },
          concept: 'Consultoría',
          amount: '200.00',
          currency: 'USD' as const,
          recurring: true,
          effectiveMonth: '2026-08',
        },
      ],
      expenses: [
        {
          source: { kind: 'subscriptions' as const },
          concept: 'Suscripciones',
          amount: '100.00',
          currency: 'USD' as const,
          recurring: true,
        },
      ],
    });

    expect(result).toEqual({ created: true });
    expect(persisted.profile.plannedMonthlyContribution).toBe('135000.00');
    expect(persisted.goal.targetAmount).toBe('300.00');
    expect(persisted.snapshot.plannedMonthlyContribution).toBe('135000.00');
  });

  it('persists non-emergency goal target and desired date', async () => {
    const { persisted, service } = createHarness();

    const result = await service.complete('user_1', {
      ...standardInput,
      goal: {
        type: 'purchase' as const,
        name: 'Auto nuevo',
        targetAmount: '5000000.00',
        currency: 'ARS' as const,
        desiredMonth: '2027-12',
        priority: 'high' as const,
        strategy: 'save' as const,
        annualReturnRate: '0',
        availability: 'available_now' as const,
        availableFromMonth: '',
        allocations: [],
      },
    });

    expect(result).toEqual({ created: true });
    expect(persisted.goal).toMatchObject({
      type: 'purchase',
      name: 'Auto nuevo',
      targetAmount: '5000000.00',
      currency: 'ARS',
      desiredDate: '2027-12-01',
      emergencyFundMonths: null,
    });
  });

  it('sets contribution to zero when expenses exceed income', async () => {
    const { persisted, service } = createHarness();

    const result = await service.complete('user_1', {
      ...standardInput,
      incomes: [{ ...standardInput.incomes[0], amount: '200000.00' }],
      expenses: [{ ...standardInput.expenses[0], amount: '300000.00' }],
    });

    expect(result).toEqual({ created: true });
    expect(persisted.profile.plannedMonthlyContribution).toBe('0.00');
    expect(persisted.snapshot.plannedMonthlyContribution).toBe('0.00');
  });

  it('persists an investment goal with availability details', async () => {
    const { persisted, service } = createHarness();

    const result = await service.complete('user_1', {
      ...standardInput,
      goal: {
        ...standardInput.goal,
        type: 'purchase' as const,
        targetAmount: '1000000.00',
        currency: 'ARS' as const,
        strategy: 'invest' as const,
        availability: 'available_from' as const,
        availableFromMonth: '2027-01',
      },
    });

    expect(result).toEqual({ created: true });
    expect(persisted.goal.targetAmount).toBe('1000000.00');
    expect(persisted.investment).toMatchObject({
      goalId: 'goal_1',
      currentValue: '0.00',
      currency: 'ARS',
      annualReturnRate: '0',
      availability: 'available_from',
      availableFrom: '2027-01-01',
    });
  });

  it('returns created: false on retry when financial profile already exists without other writes', async () => {
    const { tx, service } = createHarness();
    tx.insert.mockImplementation((table: unknown) => {
      if (table === financialProfiles) {
        return {
          values: () => ({
            onConflictDoNothing: () => ({ returning: () => [] }),
          }),
        };
      }
      throw new Error('Should not reach other inserts');
    });

    const result = await service.complete('user_1', standardInput);

    expect(result).toEqual({ created: false });
  });

  it('propagates error and rolls back when an insert fails inside transaction', async () => {
    const { tx, service } = createHarness();
    tx.insert.mockImplementation((table: unknown) => {
      if (table === financialProfiles) {
        return {
          values: () => ({
            onConflictDoNothing: () => ({
              returning: () => [{ userId: 'user_1' }],
            }),
          }),
        };
      }
      if (table === incomes) {
        throw new Error('Database disk error');
      }
      return { values: () => ({ returning: () => [{ id: '1' }] }) };
    });

    await expect(service.complete('user_1', standardInput)).rejects.toThrow(
      'Database disk error',
    );
  });

  it('rejects an incomplete submission with the first Spanish validation issue before writing', async () => {
    const { db, service } = createHarness();

    await expect(
      service.complete('user_1', { ...standardInput, incomes: [] }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.complete('user_1', { ...standardInput, incomes: [] }),
    ).rejects.toThrow('Agregá al menos un ingreso recurrente.');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects an invalid goal with the first Spanish goal issue before writing', async () => {
    const { db, service } = createHarness();

    await expect(
      service.complete('user_1', {
        ...standardInput,
        goal: { ...standardInput.goal, name: '' },
      }),
    ).rejects.toThrow('Ingresá un nombre.');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('reports goal name before an empty income list, matching the original first issue', async () => {
    const { db, service } = createHarness();

    await expect(
      service.complete('user_1', {
        ...standardInput,
        goal: { ...standardInput.goal, name: '' },
        incomes: [],
      }),
    ).rejects.toThrow('Ingresá un nombre.');
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
