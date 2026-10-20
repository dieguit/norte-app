import { z } from 'zod';

const IdSchema = z.uuid();
const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const DateSchema = z.iso.date();
const SourceSchema = z.object({ id: IdSchema, name: z.string(), normalizedName: z.string() });
const IncomeSchema = z.object({
  id: IdSchema, sourceKind: z.string(), sourceId: IdSchema.nullable(), sourceName: z.string(),
  concept: z.string().nullable(), amount: z.string(), currency: z.enum(['ARS', 'USD']), recurring: z.boolean(), effectiveMonth: DateSchema, arsEquivalent: z.string().nullable(),
});
const ExpenseSchema = IncomeSchema.extend({ endMonth: DateSchema.nullable() });
const MoneySchema = z.object({ amount: z.string(), currency: z.literal('ARS') });
const MovementSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('contribution'), id: IdSchema, placeId: IdSchema, placeName: z.string(), amount: z.string(), currency: z.enum(['ARS', 'USD']), createdAt: z.iso.datetime() }),
  z.object({ kind: z.literal('completion'), id: IdSchema, goalId: IdSchema, goalName: z.string(), placeId: IdSchema, placeName: z.string(), amount: z.string(), currency: z.enum(['ARS', 'USD']), createdAt: z.iso.datetime() }),
  z.object({ kind: z.literal('transfer'), id: IdSchema, fromPlaceId: IdSchema, fromPlaceName: z.string(), toPlaceId: IdSchema, toPlaceName: z.string(), amount: z.string(), currency: z.enum(['ARS', 'USD']), createdAt: z.iso.datetime() }),
]);

export const FinancesWorkspaceSchema = z.object({
  goalDedicationPercentage: z.string(),
  month: MonthSchema,
  summary: z.object({ income: MoneySchema, expenses: MoneySchema, balance: MoneySchema, contribution: MoneySchema }),
  incomes: z.object({ sources: z.array(SourceSchema), incomes: z.array(IncomeSchema) }),
  expenses: z.object({ sources: z.array(SourceSchema), expenses: z.array(ExpenseSchema) }),
  savings: z.object({ places: z.array(z.object({ id: IdSchema, name: z.string(), balances: z.object({ ARS: z.string(), USD: z.string() }), hasMovements: z.boolean() })), movements: z.array(MovementSchema) }),
});
export type FinancesWorkspace = z.infer<typeof FinancesWorkspaceSchema>;

export function isExpenseIncludedInMonth(
  expense: { recurring: boolean; effectiveMonth: string; endMonth?: string | null },
  month: string,
): boolean {
  const targetMonth = month.slice(0, 7);
  const effectiveMonth = expense.effectiveMonth.slice(0, 7);
  const endMonth = expense.endMonth?.slice(0, 7);
  return expense.recurring
    ? effectiveMonth <= targetMonth &&
        (endMonth === undefined || targetMonth < endMonth)
    : effectiveMonth === targetMonth;
}

export function isIncomeIncludedInMonth(
  income: { recurring: boolean; effectiveMonth: string },
  month: string,
): boolean {
  const effectiveMonth = income.effectiveMonth.slice(0, 7);
  return income.recurring ? effectiveMonth <= month : effectiveMonth === month;
}

