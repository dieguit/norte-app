import { createTool } from '@mastra/core/tools';
import {
  ExpenseDraftSchema,
  FIXED_INCOME_SOURCES,
  IncomeDraftSchema,
  ONE_TIME_EXPENSE_SOURCES,
  RECURRING_EXPENSE_SOURCES,
} from '@repo/shared-types';
import { z } from 'zod';
import type { NorteServices } from '../services';
import { todayInArgentina } from './date';
import type { ActionStores } from './pending-actions';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

const MonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Ingresá un mes válido.')
  .describe('Month as YYYY-MM');
const IdSchema = z
  .string()
  .uuid()
  .describe('Record id from getFinancesSummary');

const ToolExpenseDraftSchema = ExpenseDraftSchema.extend({
  currency: z.enum(['ARS', 'USD']).default('ARS'),
  recurring: z.boolean().default(false),
});

const ToolIncomeDraftSchema = IncomeDraftSchema.extend({
  currency: z.enum(['ARS', 'USD']).default('ARS'),
  recurring: z.boolean().default(false),
  effectiveMonth: MonthSchema.optional(),
});

type FinanceServices = Pick<NorteServices, 'expenses' | 'incomes' | 'finances'>;

const staged = (preview: unknown) => ({ needsConfirmation: true, preview });

const toKindLabels = (sources: Record<string, string>) =>
  Object.entries(sources).map(([kind, label]) => ({ kind, label }));

const toCustomList = (sources: Array<{ id: string; name: string }>) =>
  sources.map((s) => ({ sourceId: s.id, name: s.name }));

export function createFinanceTools(
  { expenses, incomes, finances }: FinanceServices,
  { pending, undo }: ActionStores,
) {
  const withWorkspace = async <T>(
    context: { requestContext?: unknown } | undefined,
    fn: (
      workspace: NonNullable<
        Awaited<ReturnType<FinanceServices['finances']['getWorkspace']>>
      >,
    ) => T,
  ) => {
    const workspace = await finances.getWorkspace(
      requireUserId(context?.requestContext as never),
    );
    if (!workspace) return { profile: 'missing' as const };
    return fn(workspace);
  };

  return {
    listCategories: createTool({
      id: 'list-categories',
      description:
        "Lists available fixed and custom categories for expenses and incomes. Use before recording or editing an income or expense to map the user's words to a category; reuse a custom one with { kind: 'custom', sourceId }; if nothing fits create { kind: 'custom', name } with a short Spanish name (e.g. 'Supermercado').",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(() =>
          withWorkspace(context, (workspace) => ({
            expense: {
              recurring: toKindLabels(RECURRING_EXPENSE_SOURCES),
              oneTime: toKindLabels(ONE_TIME_EXPENSE_SOURCES),
              custom: toCustomList(workspace.expenses.sources),
            },
            income: {
              fixed: toKindLabels(FIXED_INCOME_SOURCES),
              custom: toCustomList(workspace.incomes.sources),
            },
          })),
        ),
    }),

    getFinancesSummary: createTool({
      id: 'get-finances-summary',
      description:
        "Current month income, expenses, estimated margin and contributions, plus the user's income/expense records with ids and savings places.",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(() =>
          withWorkspace(context, (workspace) => ({
            month: workspace.month,
            goalDedicationPercentage: workspace.goalDedicationPercentage,
            summary: workspace.summary,
            incomes: workspace.incomes.incomes,
            expenses: workspace.expenses.expenses,
            savingsPlaces: workspace.savings.places,
            recentMovements: workspace.savings.movements.slice(0, 10),
          })),
        ),
    }),

    recordExpense: createTool({
      id: 'record-expense',
      description:
        'Records an expense. Currency defaults to ARS and effectiveMonth to current month. recurring=false is a one-time expense for effectiveMonth (written immediately, undoable). recurring=true is monthly from effectiveMonth (returns a preview that needs confirmation). Use listCategories to pick or create a category.',
      inputSchema: z.object({
        draft: ToolExpenseDraftSchema,
        effectiveMonth: MonthSchema.optional(),
      }),
      execute: (input, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          const effectiveMonth =
            input.effectiveMonth ?? todayInArgentina().month;
          const write = () =>
            expenses.create(userId, {
              draft: input.draft,
              effectiveMonth,
            });
          if (input.draft.recurring) {
            pending.set(userId, {
              summary: 'Gasto mensual registrado',
              run: write,
            });
            return staged({
              type: 'expense',
              draft: input.draft,
              effectiveMonth,
            });
          }
          const created = await write();
          undo.set(userId, {
            summary: 'Gasto eliminado',
            run: () => expenses.delete(userId, created.id, effectiveMonth),
          });
          return { created, undoAvailable: true };
        }),
    }),

    recordIncome: createTool({
      id: 'record-income',
      description:
        'Records an income. Currency defaults to ARS and effectiveMonth to current month. recurring=false is one-time for draft.effectiveMonth (written immediately, undoable). recurring=true is monthly from draft.effectiveMonth (returns a preview that needs confirmation). Use listCategories to pick or create a category.',
      inputSchema: z.object({ draft: ToolIncomeDraftSchema }),
      execute: (input, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          const draft = {
            ...input.draft,
            effectiveMonth:
              input.draft.effectiveMonth ?? todayInArgentina().month,
          };
          const write = () => incomes.create(userId, { draft });
          if (draft.recurring) {
            pending.set(userId, {
              summary: 'Ingreso mensual registrado',
              run: write,
            });
            return staged({ type: 'income', draft });
          }
          const created = await write();
          undo.set(userId, {
            summary: 'Ingreso eliminado',
            run: () => incomes.delete(userId, created.id),
          });
          return { created, undoAvailable: true };
        }),
    }),

    updateExpense: createTool({
      id: 'update-expense',
      description:
        'Previews replacing an expense. Currency defaults to ARS and effectiveMonth to current month. For recurring expenses, effectiveMonth is the month the change applies from (history before it is kept). Needs confirmation.',
      inputSchema: z.object({
        id: IdSchema,
        draft: ToolExpenseDraftSchema,
        effectiveMonth: MonthSchema.optional(),
      }),
      execute: ({ id, draft, effectiveMonth }, context) =>
        toolResult(() => {
          const userId = requireUserId(context?.requestContext);
          const month = effectiveMonth ?? todayInArgentina().month;
          pending.set(userId, {
            summary: 'Gasto actualizado',
            run: () =>
              expenses.update(userId, id, {
                draft,
                effectiveMonth: month,
              }),
          });
          return staged({
            type: 'expense-update',
            id,
            draft,
            effectiveMonth: month,
          });
        }),
    }),

    deleteExpense: createTool({
      id: 'delete-expense',
      description:
        'Previews deleting an expense. effectiveMonth defaults to current month. For recurring expenses it stops from effectiveMonth (past months are kept). Needs confirmation.',
      inputSchema: z.object({
        id: IdSchema,
        effectiveMonth: MonthSchema.optional(),
      }),
      execute: ({ id, effectiveMonth }, context) =>
        toolResult(() => {
          const userId = requireUserId(context?.requestContext);
          const month = effectiveMonth ?? todayInArgentina().month;
          pending.set(userId, {
            summary: 'Gasto eliminado',
            run: () => expenses.delete(userId, id, month),
          });
          return staged({ type: 'expense-delete', id, effectiveMonth: month });
        }),
    }),

    updateIncome: createTool({
      id: 'update-income',
      description:
        'Previews replacing an income record. Currency defaults to ARS and effectiveMonth to current month. Needs confirmation.',
      inputSchema: z.object({ id: IdSchema, draft: ToolIncomeDraftSchema }),
      execute: ({ id, draft: rawDraft }, context) =>
        toolResult(() => {
          const userId = requireUserId(context?.requestContext);
          const draft = {
            ...rawDraft,
            effectiveMonth: rawDraft.effectiveMonth ?? todayInArgentina().month,
          };
          pending.set(userId, {
            summary: 'Ingreso actualizado',
            run: () => incomes.update(userId, id, { draft }),
          });
          return staged({ type: 'income-update', id, draft });
        }),
    }),

    deleteIncome: createTool({
      id: 'delete-income',
      description: 'Previews deleting an income record. Needs confirmation.',
      inputSchema: z.object({ id: IdSchema }),
      execute: ({ id }, context) =>
        toolResult(() => {
          const userId = requireUserId(context?.requestContext);
          pending.set(userId, {
            summary: 'Ingreso eliminado',
            run: () => incomes.delete(userId, id),
          });
          return staged({ type: 'income-delete', id });
        }),
    }),
  };
}
