import { z } from 'zod';
import { ContributionSummarySchema, GoalWorkspaceItemSchema } from './goals.schema';

const CurrencySchema = z.enum(['ARS', 'USD']);
const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const MonthOrDateSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/);

export const HomeQuerySchema = z.object({
  currentMonth: MonthSchema.optional(),
}).strict();

export const RoadmapIncomeSchema = z.object({
  id: z.string(),
  sourceKind: z.string(),
  sourceId: z.string().nullable(),
  sourceName: z.string(),
  concept: z.string().nullable(),
  amount: z.string(),
  currency: CurrencySchema,
  recurring: z.boolean(),
  effectiveMonth: MonthOrDateSchema,
  arsEquivalent: z.string().nullable().optional(),
}).strict();

export const RoadmapExpenseSchema = RoadmapIncomeSchema.extend({
  endMonth: MonthOrDateSchema.nullable(),
}).strict();

export const RoadmapFinancesSchema = z.object({
  incomes: z.object({
    sources: z.array(z.object({
      id: z.string(),
      name: z.string(),
      normalizedName: z.string(),
    }).strict()).optional(),
    incomes: z.array(RoadmapIncomeSchema),
  }).strict(),
  expenses: z.object({
    sources: z.array(z.object({
      id: z.string(),
      name: z.string(),
      normalizedName: z.string(),
    }).strict()).optional(),
    expenses: z.array(RoadmapExpenseSchema),
  }).strict(),
}).strict();

export const RoadmapMonthSchema = z.object({
  month: MonthSchema,
  objectives: z.array(GoalWorkspaceItemSchema),
  oneTimeExpenses: z.array(RoadmapExpenseSchema),
  recurringExpenses: z.array(RoadmapExpenseSchema),
  endingExpenses: z.array(RoadmapExpenseSchema),
  oneTimeIncomes: z.array(RoadmapIncomeSchema),
  recurringIncomes: z.array(RoadmapIncomeSchema),
  contributions: z.array(ContributionSummarySchema),
}).strict();

export const RoadmapDataSchema = z.object({
  undatedObjectives: z.array(GoalWorkspaceItemSchema),
  futureMonths: z.array(RoadmapMonthSchema),
  currentMonth: RoadmapMonthSchema,
  historyMonths: z.array(RoadmapMonthSchema),
}).strict();

export const HomeRoadmapMissingSchema = z.object({
  profile: z.literal('missing'),
}).strict();

export const HomeRoadmapPresentSchema = z.object({
  profile: z.literal('present').optional(),
  roadmap: RoadmapDataSchema,
  completionGoals: z.array(GoalWorkspaceItemSchema),
}).strict();

export const HomeRoadmapResponseSchema = z.discriminatedUnion('profile', [
  HomeRoadmapMissingSchema,
  HomeRoadmapPresentSchema,
]);

export type HomeQuery = z.infer<typeof HomeQuerySchema>;
export type RoadmapIncome = z.infer<typeof RoadmapIncomeSchema>;
export type RoadmapExpense = z.infer<typeof RoadmapExpenseSchema>;
export type RoadmapFinances = z.infer<typeof RoadmapFinancesSchema>;
export type RoadmapMonth = z.infer<typeof RoadmapMonthSchema>;
export type RoadmapData = z.infer<typeof RoadmapDataSchema>;
export type HomeRoadmapResponse = z.infer<typeof HomeRoadmapResponseSchema>;
export type HomeRoadmapPresent = z.infer<typeof HomeRoadmapPresentSchema>;
export type HomeRoadmapMissing = z.infer<typeof HomeRoadmapMissingSchema>;
