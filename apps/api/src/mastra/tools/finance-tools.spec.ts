import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import { createFinanceTools } from './finance-tools';
import { UserActionStore } from './pending-actions';

function ctx(userId?: string) {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
}

const ID = '7b0c1f3e-4a2d-4c8e-9a1b-2f3d4e5f6a7b';
const expenseDraft = {
  concept: 'Súper',
  source: { kind: 'uncategorized' },
  amount: '5000',
  currency: 'ARS',
  recurring: false,
};

function setup() {
  const services = {
    expenses: {
      create: vi.fn().mockResolvedValue({ id: ID }),
      update: vi.fn().mockResolvedValue({ id: ID }),
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
  return { services, stores, tools };
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
      draft: { ...expenseDraft, concept: 'Alquiler', recurring: true },
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
});
