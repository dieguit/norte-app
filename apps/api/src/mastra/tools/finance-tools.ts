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
  source: ExpenseDraftSchema.shape.source.refine(
    (source) => source.kind !== 'uncategorized',
    {
      message:
        'Elegí una categoría existente; si no podés deducirla, preguntale al usuario antes de registrar.',
    },
  ),
  currency: z.enum(['ARS', 'USD']).default('ARS'),
  recurring: z.boolean().default(false),
});

const ToolIncomeDraftSchema = IncomeDraftSchema.extend({
  source: IncomeDraftSchema.shape.source.refine(
    (source) => source.kind !== 'uncategorized',
    {
      message:
        'Elegí una categoría existente; si no podés deducirla, preguntale al usuario antes de registrar.',
    },
  ),
  currency: z.enum(['ARS', 'USD']).default('ARS'),
  recurring: z.boolean().default(false),
  effectiveMonth: MonthSchema.optional(),
});

type FinanceServices = Pick<NorteServices, 'expenses' | 'incomes' | 'finances'>;

const staged = (preview: unknown) => ({ needsConfirmation: true, preview });

const toKindLabels = (sources: Record<string, string>) =>
  Object.entries(sources)
    .filter(([kind]) => kind !== 'uncategorized')
    .map(([kind, label]) => ({ kind, label }));

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
    const month = todayInArgentina().month;
    const workspace = await finances.getWorkspace(
      requireUserId(context?.requestContext as never),
      month,
    );
    if (!workspace) return { profile: 'missing' as const };
    return fn(workspace);
  };

  return {
    listCategories: createTool({
      id: 'list-categories',
      description:
        "Lists available fixed and custom categories for expenses and incomes. Always use before recording or editing an income or expense to map to an existing fixed category or custom sourceId. Never choose uncategorized. If unclear or no match, ask the user before writing. Only use { kind: 'custom', name } if the user explicitly requests or approves creating a new category.",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult('list-categories', context?.requestContext, () =>
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
        toolResult('get-finances-summary', context?.requestContext, () =>
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
        'Records an expense. Currency defaults to ARS and effectiveMonth to current month. recurring=false is a one-time expense for effectiveMonth (written immediately, undoable). recurring=true is monthly from effectiveMonth (stages a preview; execute via confirmPendingAction). Use listCategories to pick an existing category; never uncategorized. If unsure, ask before recording. Use custom name only if user explicitly requested or approved a new category.',
      inputSchema: z.object({
        draft: ToolExpenseDraftSchema,
        effectiveMonth: MonthSchema.optional(),
      }),
      execute: (input, context) =>
        toolResult('record-expense', context?.requestContext, async () => {
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
              actionType: 'record-expense',
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
            actionType: 'record-expense',
            summary: 'Gasto eliminado',
            run: () => expenses.delete(userId, created.id, effectiveMonth),
          });
          return { created, undoAvailable: true };
        }),
    }),

    recordIncome: createTool({
      id: 'record-income',
      description:
        'Records an income. Currency defaults to ARS and effectiveMonth to current month. recurring=false is one-time for draft.effectiveMonth (written immediately, undoable). recurring=true is monthly from draft.effectiveMonth (stages a preview; execute via confirmPendingAction). Use listCategories to pick an existing category; never uncategorized. If unsure, ask before recording. Use custom name only if user explicitly requested or approved a new category.',
      inputSchema: z.object({ draft: ToolIncomeDraftSchema }),
      execute: (input, context) =>
        toolResult('record-income', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const draft = {
            ...input.draft,
            effectiveMonth:
              input.draft.effectiveMonth ?? todayInArgentina().month,
          };
          const write = () => incomes.create(userId, { draft });
          if (draft.recurring) {
            pending.set(userId, {
              actionType: 'record-income',
              summary: 'Ingreso mensual registrado',
              run: write,
            });
            return staged({ type: 'income', draft });
          }
          const created = await write();
          undo.set(userId, {
            actionType: 'record-income',
            summary: 'Ingreso eliminado',
            run: () => incomes.delete(userId, created.id),
          });
          return { created, undoAvailable: true };
        }),
    }),

    updateExpense: createTool({
      id: 'update-expense',
      description:
        'Stages replacing an expense (execute via confirmPendingAction). Currency defaults to ARS and effectiveMonth to current month. For recurring expenses, effectiveMonth is the month the change applies from (history before it is kept). Use listCategories to pick an existing category; never uncategorized. If unsure, ask before updating.',
      inputSchema: z.object({
        id: IdSchema,
        draft: ToolExpenseDraftSchema,
        effectiveMonth: MonthSchema.optional(),
      }),
      execute: ({ id, draft, effectiveMonth }, context) =>
        toolResult('update-expense', context?.requestContext, () => {
          const userId = requireUserId(context?.requestContext);
          const month = effectiveMonth ?? todayInArgentina().month;
          pending.set(userId, {
            actionType: 'update-expense',
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
        'Stages deleting an expense (execute via confirmPendingAction). effectiveMonth defaults to current month. For recurring expenses it stops from effectiveMonth (past months are kept).',
      inputSchema: z.object({
        id: IdSchema,
        effectiveMonth: MonthSchema.optional(),
      }),
      execute: ({ id, effectiveMonth }, context) =>
        toolResult('delete-expense', context?.requestContext, () => {
          const userId = requireUserId(context?.requestContext);
          const month = effectiveMonth ?? todayInArgentina().month;
          pending.set(userId, {
            actionType: 'delete-expense',
            summary: 'Gasto eliminado',
            run: () => expenses.delete(userId, id, month),
          });
          return staged({ type: 'expense-delete', id, effectiveMonth: month });
        }),
    }),

    updateIncome: createTool({
      id: 'update-income',
      description:
        'Stages replacing an income record (execute via confirmPendingAction). Currency defaults to ARS and effectiveMonth to current month. Use listCategories to pick an existing category; never uncategorized. If unsure, ask before updating.',
      inputSchema: z.object({ id: IdSchema, draft: ToolIncomeDraftSchema }),
      execute: ({ id, draft: rawDraft }, context) =>
        toolResult('update-income', context?.requestContext, () => {
          const userId = requireUserId(context?.requestContext);
          const draft = {
            ...rawDraft,
            effectiveMonth: rawDraft.effectiveMonth ?? todayInArgentina().month,
          };
          pending.set(userId, {
            actionType: 'update-income',
            summary: 'Ingreso actualizado',
            run: () => incomes.update(userId, id, { draft }),
          });
          return staged({ type: 'income-update', id, draft });
        }),
    }),

    deleteIncome: createTool({
      id: 'delete-income',
      description:
        'Stages deleting an income record (execute via confirmPendingAction).',
      inputSchema: z.object({ id: IdSchema }),
      execute: ({ id }, context) =>
        toolResult('delete-income', context?.requestContext, () => {
          const userId = requireUserId(context?.requestContext);
          pending.set(userId, {
            actionType: 'delete-income',
            summary: 'Ingreso eliminado',
            run: () => incomes.delete(userId, id),
          });
          return staged({ type: 'income-delete', id });
        }),
    }),
  };
}
