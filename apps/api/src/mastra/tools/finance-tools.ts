import { createTool } from '@mastra/core/tools';
import { ExpenseDraftSchema, IncomeDraftSchema } from '@repo/shared-types';
import { z } from 'zod';
import type { NorteServices } from '../services';
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

type FinanceServices = Pick<NorteServices, 'expenses' | 'incomes' | 'finances'>;

const staged = (preview: unknown) => ({ needsConfirmation: true, preview });

export function createFinanceTools(
  { expenses, incomes, finances }: FinanceServices,
  { pending, undo }: ActionStores,
) {
  return {
    getFinancesSummary: createTool({
      id: 'get-finances-summary',
      description:
        "Current month income, expenses, estimated margin and contributions, plus the user's income/expense records with ids and savings places.",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(async () => {
          const workspace = await finances.getWorkspace(
            requireUserId(context?.requestContext),
          );
          if (!workspace) return { profile: 'missing' as const };
          return {
            month: workspace.month,
            goalDedicationPercentage: workspace.goalDedicationPercentage,
            summary: workspace.summary,
            incomes: workspace.incomes.incomes,
            expenses: workspace.expenses.expenses,
            savingsPlaces: workspace.savings.places,
            recentMovements: workspace.savings.movements.slice(0, 10),
          };
        }),
    }),

    recordExpense: createTool({
      id: 'record-expense',
      description:
        'Records an expense. recurring=false is a one-time expense for effectiveMonth (written immediately, undoable). recurring=true is monthly from effectiveMonth (returns a preview that needs confirmation). source.kind must be one of the fixed categories; otherwise use { kind: "custom", name }.',
      inputSchema: z.object({
        draft: ExpenseDraftSchema,
        effectiveMonth: MonthSchema,
      }),
      execute: (input, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          const write = () => expenses.create(userId, input);
          if (input.draft.recurring) {
            pending.set(userId, {
              summary: 'Gasto mensual registrado',
              run: write,
            });
            return staged({ type: 'expense', ...input });
          }
          const created = await write();
          undo.set(userId, {
            summary: 'Gasto eliminado',
            run: () =>
              expenses.delete(userId, created.id, input.effectiveMonth),
          });
          return { created, undoAvailable: true };
        }),
    }),

    recordIncome: createTool({
      id: 'record-income',
      description:
        'Records an income. recurring=false is one-time for draft.effectiveMonth (written immediately, undoable). recurring=true is monthly from draft.effectiveMonth (returns a preview that needs confirmation). source.kind must be one of the fixed categories; otherwise use { kind: "custom", name }.',
      inputSchema: z.object({ draft: IncomeDraftSchema }),
      execute: (input, context) =>
        toolResult(async () => {
          const userId = requireUserId(context?.requestContext);
          const write = () => incomes.create(userId, input);
          if (input.draft.recurring) {
            pending.set(userId, {
              summary: 'Ingreso mensual registrado',
              run: write,
            });
            return staged({ type: 'income', ...input });
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
        'Previews replacing an expense. For recurring expenses, effectiveMonth is the month the change applies from (history before it is kept). Needs confirmation.',
      inputSchema: z.object({
        id: IdSchema,
        draft: ExpenseDraftSchema,
        effectiveMonth: MonthSchema,
      }),
      execute: ({ id, ...body }, context) =>
        toolResult(() => {
          const userId = requireUserId(context?.requestContext);
          pending.set(userId, {
            summary: 'Gasto actualizado',
            run: () => expenses.update(userId, id, body),
          });
          return staged({ type: 'expense-update', id, ...body });
        }),
    }),

    deleteExpense: createTool({
      id: 'delete-expense',
      description:
        'Previews deleting an expense. For recurring expenses it stops from effectiveMonth (past months are kept). Needs confirmation.',
      inputSchema: z.object({ id: IdSchema, effectiveMonth: MonthSchema }),
      execute: ({ id, effectiveMonth }, context) =>
        toolResult(() => {
          const userId = requireUserId(context?.requestContext);
          pending.set(userId, {
            summary: 'Gasto eliminado',
            run: () => expenses.delete(userId, id, effectiveMonth),
          });
          return staged({ type: 'expense-delete', id, effectiveMonth });
        }),
    }),

    updateIncome: createTool({
      id: 'update-income',
      description: 'Previews replacing an income record. Needs confirmation.',
      inputSchema: z.object({ id: IdSchema, draft: IncomeDraftSchema }),
      execute: ({ id, draft }, context) =>
        toolResult(() => {
          const userId = requireUserId(context?.requestContext);
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
