import { describe, expect, it } from 'vitest';
import { FinancialOnboardingSchema } from './financial-onboarding.schema';

const input = {
  goal: {
    type: 'emergency_fund',
    name: 'Fondo de emergencia',
    targetAmount: '0',
    currency: 'USD',
    desiredMonth: '',
    priority: 'high',
    strategy: 'save',
    annualReturnRate: '0',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [],
  },
  incomes: [
    {
      source: { kind: 'salary' },
      concept: 'Sueldo principal',
      amount: '500000.00',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08',
    },
  ],
  expenses: [
    {
      source: { kind: 'housing' },
      concept: 'Alquiler',
      amount: '250000.00',
      currency: 'ARS',
      recurring: true,
    },
  ],
};

describe('FinancialOnboardingSchema', () => {
  it('accepts recurring incomes and expenses', () => {
    expect(FinancialOnboardingSchema.parse(input)).toMatchObject({
      incomes: [{ concept: 'Sueldo principal' }],
      expenses: [{ concept: 'Alquiler' }],
    });
  });

  it('rejects empty lists and non-recurring rows with Spanish messages', () => {
    const issues = (value: unknown) => FinancialOnboardingSchema.safeParse(value);

    expect(issues({ ...input, incomes: [] }).error?.issues[0]?.message).toBe(
      'Agregá al menos un ingreso recurrente.',
    );
    expect(issues({ ...input, expenses: [] }).error?.issues[0]?.message).toBe(
      'Agregá al menos un gasto recurrente.',
    );
    expect(
      issues({ ...input, incomes: [{ ...input.incomes[0], recurring: false }] })
        .error?.issues[0]?.message,
    ).toBe('Los ingresos deben ser recurrentes.');
    expect(
      issues({ ...input, expenses: [{ ...input.expenses[0], recurring: false }] })
        .error?.issues[0]?.message,
    ).toBe('Los gastos deben ser recurrentes.');
  });

  it('reports goal shape issues before incomes and expenses, as the original validator did', () => {
    const issue = (value: unknown) => FinancialOnboardingSchema.safeParse(value).error?.issues[0]?.message;

    expect(issue({ ...input, goal: { ...input.goal, name: '' }, incomes: [] })).toBe('Ingresá un nombre.');
    expect(issue({ ...input, goal: { ...input.goal, name: 'x'.repeat(121) }, expenses: [] })).toBe('Usá hasta 120 caracteres.');
    expect(
      issue({
        ...input,
        goal: { ...input.goal, allocations: [{ goalId: 'goal-1', percentage: '100.001' }] },
        incomes: [],
      }),
    ).toBe('Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.');
  });

  it('rejects unknown top-level keys', () => {
    expect(FinancialOnboardingSchema.safeParse({ ...input, userId: 'attacker' }).success).toBe(false);
  });
});
