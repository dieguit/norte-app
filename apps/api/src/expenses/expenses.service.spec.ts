import { describe, expect, it, vi } from 'vitest';
import { expenseSources, expenses } from '../profile/profile.schema';
import { ExpensesService } from './expenses.service';

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const draft = {
  source: { kind: 'housing' as const },
  concept: 'Alquiler',
  amount: '1.234',
  currency: 'ARS' as const,
  recurring: true,
};
const row = {
  id: uuid(1),
  sourceKind: 'housing',
  sourceId: null,
  concept: 'Alquiler',
  amount: '1234.00',
  currency: 'ARS',
  recurring: true,
  effectiveMonth: '2026-01-01',
  endMonth: null,
};

describe('ExpensesService', () => {
  it('inserts every batch item in one transaction and propagates failures', async () => {
    const tx = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([row]) })),
      })),
    };
    const transaction = vi.fn(<T>(callback: (t: typeof tx) => Promise<T>) =>
      callback(tx),
    );
    const service = new ExpensesService({ transaction } as never);
    const item = { draft, effectiveMonth: '2026-01' };
    await expect(service.createMany('user-1', [item, item])).resolves.toEqual([
      row,
      row,
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.insert).toHaveBeenCalledTimes(2);
    tx.insert.mockImplementationOnce(() => {
      throw new Error('write failed');
    });
    await expect(service.createMany('user-1', [item])).rejects.toThrow(
      'write failed',
    );
  });
  it('normalizes create amount and returns only the expense contract', async () => {
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ ...row, userId: 'private' }]),
    });
    const tx = { insert: vi.fn().mockReturnValue({ values }) };
    const service = new ExpensesService({
      transaction: <T>(callback: (t: typeof tx) => Promise<T>) => callback(tx),
    } as never);
    await expect(
      service.create('user-1', { draft, effectiveMonth: '2026-01' }),
    ).resolves.toEqual(row);
    expect(tx.insert).toHaveBeenCalledWith(expenses);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '1234.00',
        effectiveMonth: '2026-01-01',
        endMonth: null,
      }),
    );
  });

  it.each(['create', 'update'] as const)(
    'rejects a positive amount that rounds to zero on %s before writing',
    async (operation) => {
      const insertValues = vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([row]),
      }));
      const set = vi.fn();
      const tx = {
        insert: vi.fn(() => ({
          values: insertValues.mockReturnValue({
            returning: vi.fn().mockResolvedValue([row]),
          }),
        })),
        query: { expenses: { findFirst: vi.fn().mockResolvedValue(row) } },
        update: vi.fn(() => ({
          set: set.mockReturnValue({
            where: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([row]),
            })),
          }),
        })),
      };
      const service = new ExpensesService({
        transaction: <T>(callback: (t: typeof tx) => Promise<T>) =>
          callback(tx),
      } as never);
      const tinyDraft = { ...draft, amount: '0.0001' };

      await expect(
        operation === 'create'
          ? service.create('user-1', {
              draft: tinyDraft,
              effectiveMonth: '2026-01',
            })
          : service.update('user-1', uuid(1), {
              draft: tinyDraft,
              effectiveMonth: '2026-01',
            }),
      ).rejects.toThrow('Ingresá un monto mayor a cero.');
      expect(insertValues).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    },
  );

  it('atomically resolves owned custom sources and rejects foreign source ids', async () => {
    const tx = {
      query: {
        expenseSources: { findFirst: vi.fn().mockResolvedValue(undefined) },
      },
      insert: vi.fn(() => ({ values: vi.fn() })),
    };
    const service = new ExpensesService({
      transaction: <T>(callback: (t: typeof tx) => Promise<T>) => callback(tx),
    } as never);
    await expect(
      service.create('user-1', {
        draft: { ...draft, source: { kind: 'custom', sourceId: uuid(3) } },
        effectiveMonth: '2026-01',
      }),
    ).rejects.toThrow('Concepto de gasto no encontrado.');
    expect(tx.insert).not.toHaveBeenCalledWith(expenseSources);
  });

  it('ends a prior recurring expense and inserts its replacement in one transaction', async () => {
    const set = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const insertValues = vi.fn().mockReturnValue({
      returning: vi
        .fn()
        .mockResolvedValue([
          { ...row, id: uuid(2), effectiveMonth: '2026-04-01' },
        ]),
    });
    const tx = {
      query: { expenses: { findFirst: vi.fn().mockResolvedValue(row) } },
      update: vi.fn().mockReturnValue({ set }),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    };
    const service = new ExpensesService({
      transaction: <T>(callback: (t: typeof tx) => Promise<T>) => callback(tx),
    } as never);
    await service.update('user-1', uuid(1), {
      draft,
      effectiveMonth: '2026-04',
    });
    expect(set).toHaveBeenCalledWith({ endMonth: '2026-04-01' });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ effectiveMonth: '2026-04-01', endMonth: null }),
    );
  });

  it('ends old recurring expense on delete, but deletes current expenses', async () => {
    const set = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const tx = {
      query: { expenses: { findFirst: vi.fn().mockResolvedValue(row) } },
      update: vi.fn().mockReturnValue({ set }),
      delete: vi.fn(),
    };
    const service = new ExpensesService({
      transaction: <T>(callback: (t: typeof tx) => Promise<T>) => callback(tx),
    } as never);
    await service.delete('user-1', uuid(1), '2026-04');
    expect(set).toHaveBeenCalledWith({ endMonth: '2026-04-01' });
    expect(tx.delete).not.toHaveBeenCalled();
  });
});
