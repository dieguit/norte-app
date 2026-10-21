import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import { todayInArgentina } from './date';
import { createFinanceTools } from './finance-tools';
import { UserActionStore, createPendingActionTools } from './pending-actions';

function ctx(userId?: string) {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
}

const ID = '7b0c1f3e-4a2d-4c8e-9a1b-2f3d4e5f6a7b';
const expenseDraft = {
  concept: 'Reparación de canilla',
  source: { kind: 'maintenance' },
  amount: '5000',
  currency: 'ARS',
  recurring: false,
};

function setup() {
  const services = {
    expenses: {
      create: vi.fn().mockResolvedValue({ id: ID }),
      update: vi
        .fn()
        .mockImplementation((_userId, id: string) => Promise.resolve({ id })),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    incomes: {
      create: vi.fn().mockResolvedValue({ id: ID }),
      update: vi.fn().mockResolvedValue({ id: ID }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    finances: { getWorkspace: vi.fn().mockResolvedValue(null) },
  };
  const stores = {
    pending: new UserActionStore(),
    undo: new UserActionStore(),
  };
  const tools = createFinanceTools(services as never, stores);
  const pendingTools = createPendingActionTools(stores);
  return { services, stores, tools, pendingTools };
}

describe('finance tools', () => {
  it('records one-time expenses immediately and stages an undo', async () => {
    const { services, stores, tools } = setup();
    const input = { draft: expenseDraft, effectiveMonth: '2026-10' };
    const result = await tools.recordExpense.execute!(
      input as never,
      ctx('u1'),
    );
    expect(result).toMatchObject({ created: { id: ID }, undoAvailable: true });
    expect(services.expenses.create).toHaveBeenCalledWith('u1', {
      draft: expect.objectContaining({
        amount: '5000',
        recurring: false,
      }) as unknown,
      effectiveMonth: '2026-10',
    });
    await stores.undo.take('u1')!.run();
    expect(services.expenses.delete).toHaveBeenCalledWith('u1', ID, '2026-10');
  });

  it('stages recurring expenses for confirmation without writing', async () => {
    const { services, stores, tools } = setup();
    const input = {
      draft: {
        ...expenseDraft,
        concept: 'Alquiler',
        source: { kind: 'housing' },
        recurring: true,
      },
      effectiveMonth: '2026-11',
    };
    const result = await tools.recordExpense.execute!(
      input as never,
      ctx('u1'),
    );
    expect(result).toMatchObject({ needsConfirmation: true });
    expect(services.expenses.create).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(services.expenses.create).toHaveBeenCalledWith('u1', {
      draft: expect.objectContaining({
        concept: 'Alquiler',
        recurring: true,
      }) as unknown,
      effectiveMonth: '2026-11',
    });
  });

  it('records one-time incomes immediately with income undo', async () => {
    const { services, stores, tools } = setup();
    const input = {
      draft: {
        concept: 'Venta bici',
        source: { kind: 'asset_sale' },
        amount: '80000',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-10',
      },
    };
    await tools.recordIncome.execute!(input as never, ctx('u1'));
    expect(services.incomes.create).toHaveBeenCalledTimes(1);
    await stores.undo.take('u1')!.run();
    expect(services.incomes.delete).toHaveBeenCalledWith('u1', ID);
  });

  it('always stages updates and deletes', async () => {
    const { services, stores, tools } = setup();
    await tools.updateExpense.execute!(
      { id: ID, draft: expenseDraft, effectiveMonth: '2026-10' } as never,
      ctx('u1'),
    );
    await tools.deleteExpense.execute!(
      { id: ID, effectiveMonth: '2026-12' },
      ctx('u1'),
    );
    expect(services.expenses.update).not.toHaveBeenCalled();
    expect(services.expenses.delete).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(services.expenses.delete).toHaveBeenCalledWith('u1', ID, '2026-12');

    await tools.deleteIncome.execute!({ id: ID }, ctx('u1'));
    expect(services.incomes.delete).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(services.incomes.delete).toHaveBeenCalledWith('u1', ID);
  });

  it('rejects invalid drafts before touching services', async () => {
    const { services, tools } = setup();
    const result = await tools.recordExpense.execute!(
      {
        draft: { ...expenseDraft, amount: '0' },
        effectiveMonth: '2026-10',
      } as never,
      ctx('u1'),
    );
    expect(result).toMatchObject({ error: true });
    expect(JSON.stringify(result)).toContain('Ingresá un monto mayor a cero.');
    expect(services.expenses.create).not.toHaveBeenCalled();
  });

  it('reports a missing profile in the summary', async () => {
    const { tools } = setup();
    await expect(
      tools.getFinancesSummary.execute!({}, ctx('u1')),
    ).resolves.toEqual({ profile: 'missing' });
  });

  it('refuses without a userId', async () => {
    const { services, tools } = setup();
    await expect(
      tools.recordExpense.execute!(
        { draft: expenseDraft, effectiveMonth: '2026-10' } as never,
        ctx(),
      ),
    ).resolves.toHaveProperty('error');
    expect(services.expenses.create).not.toHaveBeenCalled();
  });

  it('lists fixed and custom categories for expenses and incomes without uncategorized', async () => {
    const { services, tools } = setup();
    services.finances.getWorkspace.mockResolvedValueOnce({
      expenses: {
        sources: [
          { id: 'cs-exp-1', name: 'Mascotas', normalizedName: 'mascotas' },
        ],
      },
      incomes: {
        sources: [
          { id: 'cs-inc-1', name: 'Freelance', normalizedName: 'freelance' },
        ],
      },
    });

    const result = await tools.listCategories.execute!({}, ctx('u1'));
    expect(result).toEqual({
      expense: {
        recurring: expect.arrayContaining([
          { kind: 'housing', label: 'Alquiler / vivienda' },
        ]) as unknown,
        oneTime: expect.arrayContaining([
          { kind: 'clothing', label: 'Compra de ropa' },
        ]) as unknown,
        custom: [{ sourceId: 'cs-exp-1', name: 'Mascotas' }],
      },
      income: {
        fixed: expect.arrayContaining([
          { kind: 'salary', label: 'Sueldo' },
        ]) as unknown,
        custom: [{ sourceId: 'cs-inc-1', name: 'Freelance' }],
      },
    });

    const categories = result as {
      expense: {
        recurring: Array<{ kind: string }>;
        oneTime: Array<{ kind: string }>;
      };
      income: { fixed: Array<{ kind: string }> };
    };
    expect(categories.expense.recurring).not.toContainEqual(
      expect.objectContaining({ kind: 'uncategorized' }),
    );
    expect(categories.expense.oneTime).not.toContainEqual(
      expect.objectContaining({ kind: 'uncategorized' }),
    );
    expect(categories.income.fixed).not.toContainEqual(
      expect.objectContaining({ kind: 'uncategorized' }),
    );
  });

  it('records an expense with a valid custom category ID', async () => {
    const { services, tools } = setup();
    const customSourceId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    const input = {
      draft: {
        concept: 'Comida gato',
        source: { kind: 'custom' as const, sourceId: customSourceId },
        amount: '3500',
      },
      effectiveMonth: '2026-10',
    };
    const result = await tools.recordExpense.execute!(
      input as never,
      ctx('u1'),
    );
    expect(result).toMatchObject({ created: { id: ID }, undoAvailable: true });
    expect(services.expenses.create).toHaveBeenCalledWith('u1', {
      draft: expect.objectContaining({
        concept: 'Comida gato',
        source: { kind: 'custom', sourceId: customSourceId },
        amount: '3500',
      }) as unknown,
      effectiveMonth: '2026-10',
    });
  });

  const uncategorizedExpenseDraft = {
    concept: 'Supermercado',
    source: { kind: 'uncategorized' },
    amount: '5000',
    currency: 'ARS' as const,
    recurring: false,
  };
  const uncategorizedIncomeDraft = {
    concept: 'Cobro',
    source: { kind: 'uncategorized' },
    amount: '15000',
    currency: 'ARS' as const,
    recurring: false,
    effectiveMonth: '2026-10',
  };

  it.each([
    {
      toolName: 'recordExpense' as const,
      input: { draft: uncategorizedExpenseDraft, effectiveMonth: '2026-10' },
    },
    {
      toolName: 'updateExpense' as const,
      input: {
        id: ID,
        draft: uncategorizedExpenseDraft,
        effectiveMonth: '2026-10',
      },
    },
    {
      toolName: 'recordIncome' as const,
      input: { draft: uncategorizedIncomeDraft },
    },
    {
      toolName: 'updateIncome' as const,
      input: { id: ID, draft: uncategorizedIncomeDraft },
    },
  ])(
    'rejects uncategorized source in $toolName and requires an existing category',
    async ({ toolName, input }) => {
      const { services, stores, tools } = setup();
      const result = await tools[toolName].execute!(input as never, ctx('u1'));

      expect(result).toMatchObject({ error: true });
      expect(JSON.stringify(result)).toContain(
        'Elegí una categoría existente; si no podés deducirla, preguntale al usuario antes de registrar.',
      );
      expect(services.expenses.create).not.toHaveBeenCalled();
      expect(services.expenses.update).not.toHaveBeenCalled();
      expect(services.incomes.create).not.toHaveBeenCalled();
      expect(services.incomes.update).not.toHaveBeenCalled();
      expect(stores.pending.take('u1')).toBeUndefined();
      expect(stores.undo.take('u1')).toBeUndefined();
    },
  );

  it('returns missing profile when listCategories finds no workspace', async () => {
    const { tools } = setup();
    const result = await tools.listCategories.execute!({}, ctx('u1'));
    expect(result).toEqual({ profile: 'missing' });
  });

  it('applies defaults for currency (ARS), recurring (false), and current month to recordExpense', async () => {
    const { services, tools } = setup();
    const currentMonth = todayInArgentina().month;
    const input = {
      draft: {
        concept: 'Reparación de canilla',
        source: { kind: 'maintenance' },
        amount: '5000',
      },
    };

    const result = await tools.recordExpense.execute!(
      input as never,
      ctx('u1'),
    );
    expect(result).toMatchObject({ created: { id: ID }, undoAvailable: true });
    expect(services.expenses.create).toHaveBeenCalledWith('u1', {
      draft: expect.objectContaining({
        currency: 'ARS',
        recurring: false,
        amount: '5000',
      }) as unknown,
      effectiveMonth: currentMonth,
    });
  });

  it('applies defaults for currency (ARS), recurring (false), and current month to recordIncome', async () => {
    const { services, tools } = setup();
    const currentMonth = todayInArgentina().month;
    const input = {
      draft: {
        concept: 'Changa',
        source: { kind: 'occasional_work' },
        amount: '20000',
      },
    };

    const result = await tools.recordIncome.execute!(input as never, ctx('u1'));
    expect(result).toMatchObject({ created: { id: ID }, undoAvailable: true });
    expect(services.incomes.create).toHaveBeenCalledWith('u1', {
      draft: expect.objectContaining({
        currency: 'ARS',
        recurring: false,
        amount: '20000',
        effectiveMonth: currentMonth,
      }) as unknown,
    });
  });

  it('applies current month default to updateExpense and deleteExpense when omitted', async () => {
    const { services, stores, tools } = setup();
    const currentMonth = todayInArgentina().month;
    await tools.updateExpense.execute!(
      { id: ID, draft: expenseDraft } as never,
      ctx('u1'),
    );
    await stores.pending.take('u1')!.run();
    expect(services.expenses.update).toHaveBeenCalledWith('u1', ID, {
      draft: expenseDraft,
      effectiveMonth: currentMonth,
    });

    await tools.deleteExpense.execute!({ id: ID }, ctx('u1'));
    const pendingDelete = stores.pending.take('u1')!;
    expect(pendingDelete).toBeDefined();
    await pendingDelete.run();
    expect(services.expenses.delete).toHaveBeenCalledWith(
      'u1',
      ID,
      currentMonth,
    );
  });

  it('aligns workspace queries and default expense writes to Argentina month near UTC midnight boundary', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-01T02:00:00Z'));
      const { services, tools } = setup();

      await tools.getFinancesSummary.execute!({}, ctx('u1'));
      expect(services.finances.getWorkspace).toHaveBeenCalledWith(
        'u1',
        '2026-10',
      );

      await tools.recordExpense.execute!(
        { draft: expenseDraft } as never,
        ctx('u1'),
      );
      expect(services.expenses.create).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ effectiveMonth: '2026-10' }) as unknown,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('updates distinct expenses sequentially by staging and confirming each', async () => {
    const { services, stores, tools, pendingTools } = setup();
    const customSourceId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    const ID1 = '11111111-1111-4111-8111-111111111111';
    const ID2 = '22222222-2222-4222-8222-222222222222';
    const draft = {
      concept: 'Servicio',
      source: { kind: 'custom' as const, sourceId: customSourceId },
      amount: '10000',
    };

    for (const id of [ID1, ID2]) {
      const stageRes = await tools.updateExpense.execute!(
        { id, draft } as never,
        ctx('u1'),
      );
      expect(stageRes).toEqual({
        needsConfirmation: true,
        preview: expect.objectContaining({ id }) as unknown,
      });
      expect(stores.pending.has('u1')).toBe(true);

      const confirmRes = await pendingTools.confirmPendingAction.execute!(
        {},
        ctx('u1'),
      );
      expect(confirmRes).toEqual({
        done: 'Gasto actualizado',
        result: { id },
      });
      expect(stores.pending.has('u1')).toBe(false);
    }

    expect(services.expenses.update).toHaveBeenCalledTimes(2);
    expect(services.expenses.update).toHaveBeenNthCalledWith(1, 'u1', ID1, {
      draft: expect.objectContaining(draft) as unknown,
      effectiveMonth: todayInArgentina().month,
    });
    expect(services.expenses.update).toHaveBeenNthCalledWith(2, 'u1', ID2, {
      draft: expect.objectContaining(draft) as unknown,
      effectiveMonth: todayInArgentina().month,
    });
    expect(stores.pending.has('u1')).toBe(false);
  });
});
