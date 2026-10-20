import { describe, expect, it, vi } from 'vitest';
import { incomeSources, incomes } from '../profile/profile.schema';
import { BadRequestException } from '@nestjs/common';
import { IncomesService } from './incomes.service';

describe('IncomesService', () => {
  it('creates a trimmed custom source and income atomically, reusing normalized names', async () => {
    const sourceId = '00000000-0000-4000-8000-000000000001';
    const incomeId = '00000000-0000-4000-8000-000000000002';
    const source = {
      id: sourceId,
      userId: 'user-1',
      name: 'Consultoría',
      normalizedName: 'consultoría',
    };
    const income = {
      id: incomeId,
      userId: 'user-1',
      sourceKind: 'custom',
      sourceId,
      concept: null,
      amount: '10.00',
      currency: 'ARS',
      recurring: false,
      effectiveMonth: '2026-10-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      insert: vi.fn(),
      query: {
        incomeSources: { findFirst: vi.fn().mockResolvedValue(source) },
        incomes: { findFirst: vi.fn() },
      },
    };
    const sourceInsert = {
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const incomeInsert = {
      values: vi
        .fn()
        .mockReturnValue({ returning: vi.fn().mockResolvedValue([income]) }),
    };
    tx.insert.mockImplementation((table: unknown) =>
      table === incomeSources ? sourceInsert : incomeInsert,
    );
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const service = new IncomesService(db as never);

    await expect(
      service.create('user-1', {
        draft: {
          source: { kind: 'custom', name: ' Consultoría ' },
          concept: null,
          amount: '10.00',
          currency: 'ARS',
          recurring: false,
          effectiveMonth: '2026-10',
        },
      }),
    ).resolves.toEqual({
      ...income,
      createdAt: income.createdAt.toISOString(),
      updatedAt: income.updatedAt.toISOString(),
    });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledWith(incomeSources);
    expect(tx.insert).toHaveBeenCalledWith(incomes);
    expect(sourceInsert.values).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Consultoría',
      normalizedName: 'consultoría',
    });
  });

  it('canonicalizes localized and already-canonical create amounts', async () => {
    const income = {
      id: '00000000-0000-4000-8000-000000000005',
      userId: 'user-1',
      sourceKind: 'salary',
      sourceId: null,
      concept: null,
      amount: '1234.00',
      currency: 'ARS',
      recurring: false,
      effectiveMonth: '2026-10-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const values = vi
      .fn()
      .mockReturnValue({ returning: vi.fn().mockResolvedValue([income]) });
    const tx = { insert: vi.fn().mockReturnValue({ values }) };
    const service = new IncomesService({
      transaction: (callback) => callback(tx),
    } as never);

    await service.create('user-1', {
      draft: {
        source: { kind: 'salary' },
        concept: null,
        amount: '1.234',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-10',
      },
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '1234.00' }),
    );
    await service.create('user-1', {
      draft: {
        source: { kind: 'salary' },
        concept: null,
        amount: '1234.56',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-10',
      },
    });
    expect(values).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: '1234.56' }),
    );
  });

  it.each(['create', 'update'] as const)(
    'rejects a positive amount that rounds to zero on %s before writing',
    async (operation) => {
      const insertValues = vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([existing]),
      }));
      const set = vi.fn();
      const existing = {
        id: '00000000-0000-4000-8000-000000000005',
        userId: 'user-1',
        sourceKind: 'salary',
        sourceId: null,
        concept: null,
        amount: '1.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-10-01',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const tx = {
        insert: vi.fn(() => ({
          values: insertValues.mockReturnValue({
            returning: vi.fn().mockResolvedValue([existing]),
          }),
        })),
        query: { incomes: { findFirst: vi.fn().mockResolvedValue(existing) } },
        update: vi.fn(() => ({
          set: set.mockReturnValue({
            where: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([existing]),
            })),
          }),
        })),
      };
      const service = new IncomesService({
        transaction: (callback) => callback(tx),
      } as never);
      const draft = {
        source: { kind: 'salary' as const },
        concept: null,
        amount: '0.0001',
        currency: 'ARS' as const,
        recurring: false,
        effectiveMonth: '2026-10',
      };

      await expect(
        operation === 'create'
          ? service.create('user-1', { draft })
          : service.update('user-1', existing.id, { draft }),
      ).rejects.toThrow('Ingresá un monto mayor a cero.');
      expect(insertValues).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    },
  );

  it('canonicalizes localized update amounts', async () => {
    const income = {
      id: '00000000-0000-4000-8000-000000000005',
      userId: 'user-1',
      sourceKind: 'salary',
      sourceId: null,
      concept: null,
      amount: '1234.00',
      currency: 'ARS',
      recurring: false,
      effectiveMonth: '2026-10-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const set = vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockReturnValue({ returning: vi.fn().mockResolvedValue([income]) }),
    });
    const tx = {
      query: { incomes: { findFirst: vi.fn().mockResolvedValue(income) } },
      update: vi.fn().mockReturnValue({ set }),
    };
    const service = new IncomesService({
      transaction: (callback) => callback(tx),
    } as never);
    await service.update('user-1', income.id, {
      draft: {
        source: { kind: 'salary' },
        concept: null,
        amount: '1.234',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-10',
      },
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '1234.00' }),
    );
  });

  it('rejects updating a missing or foreign income before changing any rows', async () => {
    const tx = {
      query: { incomes: { findFirst: vi.fn().mockResolvedValue(undefined) } },
      update: vi.fn(),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const service = new IncomesService(db as never);
    await expect(
      service.update('user-1', '00000000-0000-4000-8000-000000000003', {
        draft: {} as never,
      }),
    ).rejects.toThrow('Ingreso no encontrado.');
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('rejects a custom source that is not owned by the caller', async () => {
    const tx = {
      query: {
        incomeSources: { findFirst: vi.fn().mockResolvedValue(undefined) },
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({ onConflictDoNothing: vi.fn() })),
      })),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const service = new IncomesService(db as never);
    await expect(
      service.create('user-1', {
        draft: {
          source: {
            kind: 'custom',
            sourceId: '00000000-0000-4000-8000-000000000003',
          },
          concept: null,
          amount: '10',
          currency: 'ARS',
          recurring: false,
          effectiveMonth: '2026-10',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.insert).not.toHaveBeenCalledWith(incomeSources);
  });

  it('returns the existing delete result for a missing or foreign income', async () => {
    const where = vi
      .fn()
      .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    const db = { delete: vi.fn().mockReturnValue({ where }) };
    const service = new IncomesService(db as never);
    await expect(
      service.delete('user-1', '00000000-0000-4000-8000-000000000004'),
    ).rejects.toThrow('Ingreso no encontrado.');
    expect(db.delete).toHaveBeenCalledWith(incomes);
  });
});
