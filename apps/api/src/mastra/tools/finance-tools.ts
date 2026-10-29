import { createTool } from '@mastra/core/tools';
import {
  ExpenseDraftSchema,
  FIXED_INCOME_SOURCES,
  IncomeDraftSchema,
  ONE_TIME_EXPENSE_SOURCES,
  RECURRING_EXPENSE_SOURCES,
} from '@repo/shared-types';
import { z } from 'zod';
import BigNumber from 'bignumber.js';
import { normalizeMoneyAmount } from '../../money';
import type { NorteServices } from '../services';
import { todayInArgentina } from '../../argentina-time';
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

const categorized = <T extends z.ZodType<{ kind: string }>>(source: T) =>
  source.refine((source) => source.kind !== 'uncategorized', {
    message:
      'Elegí una categoría existente; si no podés deducirla, preguntale al usuario antes de registrar.',
  });
const toolDefaults = {
  currency: z.enum(['ARS', 'USD']).default('ARS'),
  recurring: z.boolean().default(false),
};
const ToolExpenseDraftSchema = ExpenseDraftSchema.extend(toolDefaults);

const ToolIncomeDraftSchema = IncomeDraftSchema.extend({
  ...toolDefaults,
  source: categorized(IncomeDraftSchema.shape.source),
  effectiveMonth: MonthSchema.optional(),
});

type FinanceServices = Pick<
  NorteServices,
  'expenses' | 'incomes' | 'finances' | 'savingsPlaces'
>;

const staged = (preview: unknown) => ({ needsConfirmation: true, preview });

const toKindLabels = (sources: Record<string, string>) =>
  Object.entries(sources)
    .filter(([kind]) => kind !== 'uncategorized')
    .map(([kind, label]) => ({ kind, label }));

// Emit the exact `source` shape the write tools accept; models dropped `kind` when given bare sourceIds.
const toCustomList = (sources: Array<{ id: string; name: string }>) =>
  sources.map((s) => ({ kind: 'custom', sourceId: s.id, label: s.name }));

export async function listCategoriesFor(
  finances: FinanceServices['finances'],
  userId: string,
) {
  const workspace = await finances.getWorkspace(
    userId,
    todayInArgentina().month,
  );
  if (!workspace) return { profile: 'missing' as const };
  return {
    expense: {
      recurring: toKindLabels(RECURRING_EXPENSE_SOURCES),
      oneTime: toKindLabels(ONE_TIME_EXPENSE_SOURCES),
      custom: toCustomList(workspace.expenses.sources),
    },
    income: {
      fixed: toKindLabels(FIXED_INCOME_SOURCES),
      custom: toCustomList(workspace.incomes.sources),
    },
  };
}

export function createFinanceTools(
  { expenses, incomes, finances, savingsPlaces }: FinanceServices,
  { pending, undo }: ActionStores,
) {
  const stage = (
    userId: string,
    actionType: string,
    summary: string,
    preview: unknown,
    run: () => Promise<unknown>,
  ) => {
    pending.set(userId, { actionType, summary, run });
    return staged(preview);
  };
  const record = async <T>(
    userId: string,
    actionType: string,
    recurring: boolean,
    preview: unknown,
    write: () => Promise<T>,
    remove: (created: T) => Promise<unknown>,
    summary: string,
  ) => {
    const run = async () => {
      const created = await write();
      undo.set(userId, { actionType, summary, run: () => remove(created) });
      return { ...(preview as object), undoAvailable: true };
    };
    return recurring
      ? stage(userId, actionType, 'Registros guardados', preview, run)
      : run();
  };
  const withWorkspace = async <T>(
    context: { requestContext?: unknown } | undefined,
    fn: (
      workspace: NonNullable<
        Awaited<ReturnType<FinanceServices['finances']['getWorkspace']>>
      >,
    ) => T,
    month = todayInArgentina().month,
  ) => {
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
        "Lists fixed and custom expense/income categories with the exact source shape to pass. Only needed if 'Categorías del usuario' is not already in context. Only use { kind: 'custom', name } if the user explicitly requests or approves creating a new category.",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult('list-categories', context?.requestContext, () =>
          listCategoriesFor(finances, requireUserId(context?.requestContext)),
        ),
    }),

    getFinancesSummary: createTool({
      id: 'get-finances-summary',
      description:
        "Any month's totals, income/expense records and savingsPlaces ids. Defaults to current Argentina month.",
      inputSchema: z.object({ month: MonthSchema.optional() }),
      execute: ({ month }, context) =>
        toolResult('get-finances-summary', context?.requestContext, () =>
          withWorkspace(
            context,
            (workspace) => ({
              month: workspace.month,
              goalDedicationPercentage: workspace.goalDedicationPercentage,
              summary: workspace.summary,
              incomes: workspace.incomes.incomes,
              expenses: workspace.expenses.expenses,
              savingsPlaces: workspace.savings.places,
              recentMovements: workspace.savings.movements.slice(0, 10),
            }),
            month,
          ),
        ),
    }),

    recordExpenses: createTool({
      id: 'record-expenses',
      description:
        'Record 1..100 expenses atomically. Defaults ARS/current Argentina month. All one-time writes immediately with one undo; any recurring stages the whole batch for confirmPendingAction. Use listCategories; uncategorized allowed only in batches. Custom name only with user approval.',
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              draft: ToolExpenseDraftSchema,
              effectiveMonth: MonthSchema.optional(),
            }),
          )
          .min(1)
          .max(100),
      }),
      execute: (input, context) =>
        toolResult('record-expenses', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          // Statements have unmappable merchants; asking per line defeats bulk entry.
          if (input.items.length === 1)
            categorized(ExpenseDraftSchema.shape.source).parse(
              input.items[0].draft.source,
            );
          const items = input.items.map((item) => ({
            ...item,
            effectiveMonth: item.effectiveMonth ?? todayInArgentina().month,
          }));
          const total = Object.fromEntries(
            ['ARS', 'USD'].map((currency) => [
              currency,
              items
                .filter((item) => item.draft.currency === currency)
                .reduce(
                  (sum, item) =>
                    sum.plus(normalizeMoneyAmount(item.draft.amount)),
                  new BigNumber(0),
                )
                .toFixed(2),
            ]),
          );
          return record(
            userId,
            'record-expenses',
            items.some((item) => item.draft.recurring),
            { created: items.length, total },
            () => expenses.createMany(userId, items),
            async (created) => {
              for (const [index, row] of created.entries())
                await expenses.delete(
                  userId,
                  row.id,
                  items[index].effectiveMonth,
                );
            },
            items.length === 1 ? 'Gasto eliminado' : 'Gastos eliminados',
          );
        }),
    }),

    recordIncome: createTool({
      id: 'record-income',
      description:
        'Records an income. Currency defaults to ARS and effectiveMonth to current month. recurring=false is one-time for draft.effectiveMonth (written immediately, undoable). recurring=true is monthly from draft.effectiveMonth (stages a preview; execute via confirmPendingAction). Use listCategories to pick an existing category; never uncategorized. Pass source exactly as listed: { kind } for fixed categories, { kind: "custom", sourceId } for the user’s own. If unsure, ask before recording. Use custom name only if user explicitly requested or approved a new category.',
      inputSchema: z.object({ draft: ToolIncomeDraftSchema }),
      execute: (input, context) =>
        toolResult('record-income', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const draft = {
            ...input.draft,
            effectiveMonth:
              input.draft.effectiveMonth ?? todayInArgentina().month,
          };
          return record(
            userId,
            'record-income',
            draft.recurring,
            { created: 1, draft },
            () => incomes.create(userId, { draft }),
            (created) => incomes.delete(userId, created.id),
            'Ingreso eliminado',
          );
        }),
    }),

    updateExpense: createTool({
      id: 'update-expense',
      description:
        'Stage partial expense changes; omitted fields stay unchanged. confirmPendingAction executes. effectiveMonth defaults to current Argentina month; recurring history is preserved.',
      inputSchema: z.object({
        id: IdSchema,
        changes: ExpenseDraftSchema.partial(),
        effectiveMonth: MonthSchema.optional(),
      }),
      execute: ({ id, changes, effectiveMonth }, context) =>
        toolResult('update-expense', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const month = effectiveMonth ?? todayInArgentina().month;
          const workspace = await finances.getWorkspace(userId, month);
          const existing = workspace?.expenses.expenses.find(
            (row) => row.id === id,
          );
          if (!existing) return { error: 'Gasto no encontrado.' };
          const draft = ExpenseDraftSchema.parse({
            ...existing,
            source:
              existing.sourceKind === 'custom'
                ? { kind: 'custom', sourceId: existing.sourceId }
                : { kind: existing.sourceKind },
            ...changes,
          });
          return stage(
            userId,
            'update-expense',
            'Gasto actualizado',
            {
              type: 'expense-update',
              id,
              draft,
              effectiveMonth: month,
            },
            () => expenses.update(userId, id, { draft, effectiveMonth: month }),
          );
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
          return stage(
            userId,
            'delete-expense',
            'Gasto eliminado',
            { type: 'expense-delete', id, effectiveMonth: month },
            () => expenses.delete(userId, id, month),
          );
        }),
    }),

    updateIncome: createTool({
      id: 'update-income',
      description:
        'Stage partial income changes; omitted fields stay unchanged. confirmPendingAction executes. Use listCategories when changing category.',
      inputSchema: z.object({
        id: IdSchema,
        changes: IncomeDraftSchema.partial(),
      }),
      execute: ({ id, changes }, context) =>
        toolResult('update-income', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const workspace = await finances.getWorkspace(
            userId,
            todayInArgentina().month,
          );
          const existing = workspace?.incomes.incomes.find(
            (row) => row.id === id,
          );
          if (!existing) return { error: 'Ingreso no encontrado.' };
          const draft = IncomeDraftSchema.parse({
            ...existing,
            effectiveMonth: existing.effectiveMonth.slice(0, 7),
            source:
              existing.sourceKind === 'custom'
                ? { kind: 'custom', sourceId: existing.sourceId }
                : { kind: existing.sourceKind },
            ...changes,
          });
          return stage(
            userId,
            'update-income',
            'Ingreso actualizado',
            { type: 'income-update', id, draft },
            () => incomes.update(userId, id, { draft }),
          );
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
          return stage(
            userId,
            'delete-income',
            'Ingreso eliminado',
            { type: 'income-delete', id },
            () => incomes.delete(userId, id),
          );
        }),
    }),
    manageSavingsPlace: createTool({
      id: 'manage-savings-place',
      description:
        'Create, rename or delete a savings place immediately. Get placeId from getFinancesSummary.savingsPlaces.',
      inputSchema: z.object({
        action: z.enum(['create', 'rename', 'delete']),
        placeId: IdSchema.optional(),
        name: z.string().trim().min(1).optional(),
      }),
      execute: ({ action, placeId, name }, context) =>
        toolResult(
          'manage-savings-place',
          context?.requestContext,
          async () => {
            const userId = requireUserId(context?.requestContext);
            if (action !== 'delete' && !name)
              return { error: 'Ingresá un nombre.' };
            if (action !== 'create' && !placeId)
              return { error: 'Elegí un lugar de ahorro.' };
            if (action === 'create') return savingsPlaces.create(userId, name!);
            if (action === 'rename')
              await savingsPlaces.rename(userId, placeId!, name!);
            else await savingsPlaces.delete(userId, placeId!);
            return { success: true };
          },
        ),
    }),
    transferSavings: createTool({
      id: 'transfer-savings',
      description:
        'Stage a same-currency savings transfer; confirmPendingAction executes. Get ids from getFinancesSummary.savingsPlaces. No FX.',
      inputSchema: z.object({
        fromPlaceId: IdSchema,
        toPlaceId: IdSchema,
        amount: ExpenseDraftSchema.shape.amount,
        currency: z.enum(['ARS', 'USD']),
      }),
      execute: (input, context) =>
        toolResult('transfer-savings', context?.requestContext, () => {
          const userId = requireUserId(context?.requestContext);
          if (input.fromPlaceId === input.toPlaceId)
            return { error: 'Elegí dos lugares de ahorro distintos.' };
          return stage(
            userId,
            'transfer-savings',
            'Ahorros transferidos',
            input,
            () => savingsPlaces.transfer(userId, input),
          );
        }),
    }),
  };
}
