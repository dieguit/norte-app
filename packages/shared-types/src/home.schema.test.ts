import { describe, expect, it } from 'vitest';
import {
  HomeQuerySchema,
  HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema,
  HomeRoadmapResponseSchema,
  RoadmapDataSchema,
  RoadmapExpenseSchema,
  RoadmapFinancesSchema,
  RoadmapIncomeSchema,
  RoadmapMonthSchema,
} from './home.schema';

const sampleGoal = {
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

const sampleMonth = {
  month: '2026-08',
  objectives: [sampleGoal],
  oneTimeExpenses: [],
  recurringExpenses: [],
  endingExpenses: [],
  oneTimeIncomes: [],
  recurringIncomes: [],
  contributions: [],
};

const sampleRoadmap = {
  undatedObjectives: [],
  futureMonths: [sampleMonth],
  currentMonth: sampleMonth,
  historyMonths: [],
};

const sampleFinances = {
  incomes: {
    sources: [{ id: 'src-1', name: 'Sueldo', normalizedName: 'sueldo' }],
    incomes: [
      {
        id: 'inc-1',
        sourceKind: 'salary',
        sourceId: 'src-1',
        sourceName: 'Sueldo',
        concept: null,
        amount: '100000.00',
        currency: 'ARS' as const,
        recurring: true,
        effectiveMonth: '2026-01-01',
        arsEquivalent: null,
      },
    ],
  },
  expenses: {
    sources: [],
    expenses: [
      {
        id: 'exp-1',
        sourceKind: 'rent',
        sourceId: null,
        sourceName: 'Alquiler',
        concept: null,
        amount: '50000.00',
        currency: 'ARS' as const,
        recurring: true,
        effectiveMonth: '2026-01-01',
        endMonth: null,
        arsEquivalent: null,
      },
    ],
  },
};

describe('home.schema', () => {
  it('validates RoadmapFinancesSchema', () => {
    expect(RoadmapFinancesSchema.parse(sampleFinances)).toEqual(sampleFinances);
  });

  it('validates RoadmapMonthSchema and RoadmapDataSchema', () => {
    expect(RoadmapMonthSchema.parse(sampleMonth)).toEqual(sampleMonth);
    expect(RoadmapDataSchema.parse(sampleRoadmap)).toEqual(sampleRoadmap);
  });

  it('validates HomeRoadmapResponseSchema with missing profile', () => {
    const missing = { profile: 'missing' as const };
    expect(HomeRoadmapMissingSchema.parse(missing)).toEqual(missing);
    expect(HomeRoadmapResponseSchema.parse(missing)).toEqual(missing);
  });

  it('validates HomeRoadmapResponseSchema with present profile roadmap', () => {
    const presentWithoutProfileProp = {
      roadmap: sampleRoadmap,
      completionGoals: [sampleGoal],
    };
    expect(HomeRoadmapPresentSchema.parse(presentWithoutProfileProp)).toEqual(presentWithoutProfileProp);
    expect(HomeRoadmapResponseSchema.parse(presentWithoutProfileProp)).toEqual(presentWithoutProfileProp);

    const presentWithProfileProp = {
      profile: 'present' as const,
      roadmap: sampleRoadmap,
      completionGoals: [sampleGoal],
    };
    expect(HomeRoadmapPresentSchema.parse(presentWithProfileProp)).toEqual(presentWithProfileProp);
    expect(HomeRoadmapResponseSchema.parse(presentWithProfileProp)).toEqual(presentWithProfileProp);
  });

  it('validates HomeQuerySchema', () => {
    expect(HomeQuerySchema.parse({})).toEqual({});
    expect(HomeQuerySchema.parse({ currentMonth: '2026-08' })).toEqual({ currentMonth: '2026-08' });
    expect(HomeQuerySchema.safeParse({ currentMonth: '2026-13' }).success).toBe(false);
  });

  it('rejects extra properties in strict schemas', () => {
    expect(HomeRoadmapMissingSchema.safeParse({ profile: 'missing', extra: true }).success).toBe(false);
    expect(RoadmapDataSchema.safeParse({ ...sampleRoadmap, extra: 123 }).success).toBe(false);
    expect(HomeRoadmapResponseSchema.safeParse({ profile: 'missing', secret: 'unexpected' }).success).toBe(false);
    expect(HomeRoadmapResponseSchema.safeParse({ profile: 'present', roadmap: sampleRoadmap, completionGoals: [sampleGoal], extra: 1 }).success).toBe(false);
    expect(HomeRoadmapResponseSchema.safeParse({ roadmap: sampleRoadmap, completionGoals: [sampleGoal], extra: 1 }).success).toBe(false);
  });

  it('rejects invalid month and date formats in roadmap schemas', () => {
    expect(RoadmapMonthSchema.safeParse({ ...sampleMonth, month: 'not-a-month' }).success).toBe(false);
    expect(RoadmapMonthSchema.safeParse({ ...sampleMonth, month: '2026-13' }).success).toBe(false);
    expect(RoadmapIncomeSchema.safeParse({ ...sampleFinances.incomes.incomes[0], effectiveMonth: 'not-an-ISO-date' }).success).toBe(false);
    expect(RoadmapExpenseSchema.safeParse({ ...sampleFinances.expenses.expenses[0], endMonth: 'not-an-ISO-date' }).success).toBe(false);
  });
});
