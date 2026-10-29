import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import { createFinanceTools } from './finance-tools';
import { UserActionStore, createPendingActionTools } from './pending-actions';
import { todayInArgentina } from '../../argentina-time';

const ID = '7b0c1f3e-4a2d-4c8e-9a1b-2f3d4e5f6a7b';
const draft = {
  source: { kind: 'maintenance' },
  concept: 'Arreglo',
  amount: '5000',
  currency: 'ARS',
  recurring: false,
};
function setup() {
  const requestContext = new RequestContext();
  requestContext.set('userId', 'u1');
  const context = { requestContext } as never;
  const services = {
    expenses: {
      createMany: vi
        .fn()
        .mockImplementation((_user, items: unknown[]) =>
          Promise.resolve(items.map(() => ({ id: ID }))),
        ),
      update: vi.fn(),
      delete: vi.fn(),
    },
    incomes: {
      create: vi.fn().mockResolvedValue({ id: ID }),
      update: vi.fn(),
      delete: vi.fn(),
    },
    finances: { getWorkspace: vi.fn().mockResolvedValue(null) },
    savingsPlaces: {
      create: vi.fn().mockResolvedValue({ placeId: ID }),
      rename: vi.fn(),
      delete: vi.fn(),
      transfer: vi.fn(),
    },
  };
  const stores = {
    pending: new UserActionStore(),
    undo: new UserActionStore(),
  };
  return {
    services,
    stores,
    context,
    tools: createFinanceTools(services as never, stores),
  };
}
describe('finance tools', () => {
  it('records one-time incomes immediately with income undo', async () => {
    const { services, stores, context, tools } = setup();
    const income = {
      ...draft,
      source: { kind: 'asset_sale' },
      effectiveMonth: '2026-10',
    };
    await tools.recordIncome.execute!({ draft: income } as never, context);
    expect(services.incomes.create).toHaveBeenCalledWith('u1', {
      draft: income,
    });
    expect(stores.pending.has('u1')).toBe(false);
    await stores.undo.take('u1')!.run();
    expect(services.incomes.delete).toHaveBeenCalledWith('u1', ID);
  });
  it('rejects invalid drafts before touching services', async () => {
    const { services, context, tools } = setup();
    const result = await tools.recordExpenses.execute!(
      { items: [{ draft: { ...draft, amount: '0' } }] } as never,
      context,
    );
    expect(result).toMatchObject({ error: true });
    expect(JSON.stringify(result)).toContain('Ingresá un monto mayor a cero.');
    expect(services.expenses.createMany).not.toHaveBeenCalled();
  });
  it('reports a missing profile in the summary', async () => {
    const { context, tools } = setup();
    expect(await tools.getFinancesSummary.execute!({}, context)).toEqual({
      profile: 'missing',
    });
  });
  it('refuses without a userId', async () => {
    const { services, tools } = setup();
    expect(
      await tools.recordExpenses.execute!(
        { items: [{ draft }] } as never,
        { requestContext: new RequestContext() } as never,
      ),
    ).toHaveProperty('error');
    expect(services.expenses.createMany).not.toHaveBeenCalled();
  });
  it('lists fixed and custom categories without uncategorized', async () => {
    const { services, context, tools } = setup();
    services.finances.getWorkspace.mockResolvedValueOnce({
      expenses: { sources: [{ id: ID, name: 'Mascotas' }] },
      incomes: { sources: [{ id: ID, name: 'Freelance' }] },
    });
    const result = await tools.listCategories.execute!({}, context);
    expect(result).toEqual({
      expense: {
        recurring: expect.arrayContaining([
          { kind: 'housing', label: 'Alquiler / vivienda' },
        ]) as unknown,
        oneTime: expect.arrayContaining([
          { kind: 'clothing', label: 'Compra de ropa' },
        ]) as unknown,
        custom: [{ kind: 'custom', sourceId: ID, label: 'Mascotas' }],
      },
      income: {
        fixed: expect.arrayContaining([
          { kind: 'salary', label: 'Sueldo' },
        ]) as unknown,
        custom: [{ kind: 'custom', sourceId: ID, label: 'Freelance' }],
      },
    });
    expect(JSON.stringify(result)).not.toContain('uncategorized');
  });
  it('records an expense with a valid custom category ID', async () => {
    const { services, context, tools } = setup();
    const item = {
      draft: { ...draft, source: { kind: 'custom', sourceId: ID } },
      effectiveMonth: '2026-10',
    };
    expect(
      await tools.recordExpenses.execute!({ items: [item] } as never, context),
    ).toMatchObject({ created: 1, undoAvailable: true });
    expect(services.expenses.createMany).toHaveBeenCalledWith('u1', [item]);
  });
  it('returns missing profile when listCategories finds no workspace', async () => {
    const { context, tools } = setup();
    expect(await tools.listCategories.execute!({}, context)).toEqual({
      profile: 'missing',
    });
  });
  it('defaults expense currency, recurring and current month', async () => {
    const { services, context, tools } = setup();
    await tools.recordExpenses.execute!(
      {
        items: [
          {
            draft: {
              concept: draft.concept,
              source: draft.source,
              amount: draft.amount,
            },
          },
        ],
      } as never,
      context,
    );
    expect(services.expenses.createMany).toHaveBeenCalledWith('u1', [
      { draft, effectiveMonth: todayInArgentina().month },
    ]);
  });
  it('defaults income currency, recurring and current month', async () => {
    const { services, context, tools } = setup();
    await tools.recordIncome.execute!(
      {
        draft: {
          concept: 'Changa',
          source: { kind: 'occasional_work' },
          amount: '20000',
        },
      } as never,
      context,
    );
    expect(services.incomes.create).toHaveBeenCalledWith('u1', {
      draft: {
        concept: 'Changa',
        source: { kind: 'occasional_work' },
        amount: '20000',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: todayInArgentina().month,
      },
    });
  });
  it('defaults updateExpense and deleteExpense to current month', async () => {
    const { services, stores, context, tools } = setup();
    services.finances.getWorkspace.mockResolvedValue({
      expenses: {
        expenses: [
          { ...draft, id: ID, sourceKind: 'maintenance', sourceId: null },
        ],
      },
    });
    await tools.updateExpense.execute!(
      { id: ID, changes: { amount: '6000' } },
      context,
    );
    expect(services.expenses.update).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(services.expenses.update).toHaveBeenCalledWith('u1', ID, {
      draft: { ...draft, amount: '6000' },
      effectiveMonth: todayInArgentina().month,
    });
    await tools.deleteExpense.execute!({ id: ID }, context);
    expect(services.expenses.delete).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(services.expenses.delete).toHaveBeenCalledWith(
      'u1',
      ID,
      todayInArgentina().month,
    );
  });
  it('uses Argentina month near UTC midnight boundary', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-01T02:00:00Z'));
      const { services, context, tools } = setup();
      await tools.getFinancesSummary.execute!({}, context);
      expect(services.finances.getWorkspace).toHaveBeenCalledWith(
        'u1',
        '2026-10',
      );
      await tools.recordExpenses.execute!(
        { items: [{ draft }] } as never,
        context,
      );
      expect(services.expenses.createMany).toHaveBeenCalledWith('u1', [
        { draft, effectiveMonth: '2026-10' },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
  it('updates distinct expenses sequentially by staging and confirming each', async () => {
    const { services, stores, context, tools } = setup();
    const ids = [ID, '11111111-1111-4111-8111-111111111111'];
    services.finances.getWorkspace.mockResolvedValue({
      expenses: {
        expenses: ids.map((id) => ({
          ...draft,
          id,
          sourceKind: 'maintenance',
          sourceId: null,
        })),
      },
    });
    services.expenses.update.mockImplementation((_user, id: string) =>
      Promise.resolve({ id }),
    );
    const pendingTools = createPendingActionTools(stores);
    for (const id of ids) {
      expect(
        await tools.updateExpense.execute!(
          { id, changes: { amount: '10000' } },
          context,
        ),
      ).toMatchObject({ needsConfirmation: true, preview: { id } });
      expect(stores.pending.has('u1')).toBe(true);
      expect(
        await pendingTools.confirmPendingAction.execute!({}, context),
      ).toEqual({ done: 'Gasto actualizado', result: { id } });
      expect(stores.pending.has('u1')).toBe(false);
    }
    expect(services.expenses.update).toHaveBeenCalledTimes(2);
    for (const [index, id] of ids.entries())
      expect(services.expenses.update).toHaveBeenNthCalledWith(
        index + 1,
        'u1',
        id,
        {
          draft: { ...draft, amount: '10000' },
          effectiveMonth: todayInArgentina().month,
        },
      );
  });
  it('returns an error when updateExpense id is not found', async () => {
    const { services, stores, context, tools } = setup();
    services.finances.getWorkspace.mockResolvedValue({
      expenses: { expenses: [] },
    });
    expect(
      await tools.updateExpense.execute!(
        { id: ID, changes: { amount: '7000' } },
        context,
      ),
    ).toEqual({ error: 'Gasto no encontrado.' });
    expect(stores.pending.has('u1')).toBe(false);
    expect(services.expenses.update).not.toHaveBeenCalled();
  });
  it('writes a batch and removes every row with one undo', async () => {
    const { services, stores, context, tools } = setup();
    expect(
      await tools.recordExpenses.execute!(
        { items: [{ draft }, { draft }] } as never,
        context,
      ),
    ).toMatchObject({
      created: 2,
      total: { ARS: '10000.00' },
      undoAvailable: true,
    });
    expect(services.expenses.createMany).toHaveBeenCalledTimes(1);
    await stores.undo.take('u1')!.run();
    expect(services.expenses.delete).toHaveBeenCalledTimes(2);
  });
  it('stages the entire batch when any expense recurs', async () => {
    const { services, stores, context, tools } = setup();
    expect(
      await tools.recordExpenses.execute!(
        {
          items: [{ draft }, { draft: { ...draft, recurring: true } }],
        } as never,
        context,
      ),
    ).toMatchObject({ needsConfirmation: true });
    expect(services.expenses.createMany).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(services.expenses.createMany.mock.calls[0][1]).toHaveLength(2);
  });
  it('rejects single uncategorized but allows batches', async () => {
    const { services, context, tools } = setup();
    const item = { draft: { ...draft, source: { kind: 'uncategorized' } } };
    expect(
      await tools.recordExpenses.execute!({ items: [item] } as never, context),
    ).toHaveProperty('error');
    expect(services.expenses.createMany).not.toHaveBeenCalled();
    await tools.recordExpenses.execute!(
      { items: [item, item] } as never,
      context,
    );
    expect(services.expenses.createMany).toHaveBeenCalledTimes(1);
  });
  it('passes the requested summary month', async () => {
    const { services, context, tools } = setup();
    await tools.getFinancesSummary.execute!({ month: '2025-02' }, context);
    expect(services.finances.getWorkspace).toHaveBeenCalledWith(
      'u1',
      '2025-02',
    );
  });
  it('merges expense changes without replacing currency or category', async () => {
    const { services, stores, context, tools } = setup();
    services.finances.getWorkspace.mockResolvedValue({
      expenses: {
        expenses: [
          {
            ...draft,
            id: ID,
            sourceKind: 'custom',
            sourceId: ID,
            currency: 'USD',
          },
        ],
      },
    });
    await tools.updateExpense.execute!(
      { id: ID, changes: { amount: '7000' } },
      context,
    );
    await stores.pending.take('u1')!.run();
    expect(services.expenses.update).toHaveBeenCalledWith(
      'u1',
      ID,
      expect.objectContaining({
        draft: expect.objectContaining({
          amount: '7000',
          currency: 'USD',
          source: { kind: 'custom', sourceId: ID },
        }) as unknown,
      }),
    );
  });
  it('creates places immediately but stages transfers', async () => {
    const { services, stores, context, tools } = setup();
    await tools.manageSavingsPlace.execute!(
      { action: 'create', name: 'Banco' },
      context,
    );
    expect(services.savingsPlaces.create).toHaveBeenCalledWith('u1', 'Banco');
    const input = {
      fromPlaceId: ID,
      toPlaceId: '11111111-1111-4111-8111-111111111111',
      amount: '100',
      currency: 'ARS' as const,
    };
    expect(await tools.transferSavings.execute!(input, context)).toHaveProperty(
      'needsConfirmation',
      true,
    );
    expect(services.savingsPlaces.transfer).not.toHaveBeenCalled();
    await stores.pending.take('u1')!.run();
    expect(services.savingsPlaces.transfer).toHaveBeenCalledWith('u1', input);
  });
});
