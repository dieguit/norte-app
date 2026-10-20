import { describe, expect, it, vi } from 'vitest';
import { SavingsPlacesService } from './savings-places.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { savingsPlaceTransfers, savingsPlaces } from '../profile/profile.schema';
import { PgDialect } from 'drizzle-orm/pg-core';

describe('SavingsPlacesService', () => {
  it('creates a trimmed place with locale-normalized name and reuses duplicate', async () => {
    const place = { id: '00000000-0000-4000-8000-000000000001' };
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const findFirst = vi.fn().mockResolvedValue(place);
    const db = { insert: vi.fn().mockReturnValue({ values }), query: { savingsPlaces: { findFirst } } };
    await expect(new SavingsPlacesService(db as never).create('u1', '  IŞIK  ')).resolves.toEqual({ placeId: place.id });
    expect(db.insert).toHaveBeenCalledWith(savingsPlaces);
    expect(values).toHaveBeenCalledWith({ userId: 'u1', name: 'IŞIK', normalizedName: 'işik' });
  });

  it('rounds localized transfer amounts and rejects a balance shortfall before insert', async () => {
    const lockSelect = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ for: vi.fn().mockResolvedValue([{ id: 'p' }]) }) }) });
    const table = (rows: unknown[]) => ({ findMany: vi.fn().mockResolvedValue(rows) });
    const tx = {
      select: lockSelect,
      query: { savingsPlaces: table([{ id: 'from' }, { id: 'to' }]), savingContributions: table([{ placeId: 'from', currency: 'ARS', amount: '10.00' }]), savingsPlaceTransfers: table([]), financialGoals: table([]), goalCompletionWithdrawals: table([]) },
      insert: vi.fn(),
    };
    const db = { transaction: (run: (transaction: any) => unknown) => run(tx) };
    const service = new SavingsPlacesService(db as never);
    await expect(service.transfer('u1', { fromPlaceId: 'from', toPlaceId: 'to', currency: 'ARS', amount: '10,01' })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('rejects positive sub-cent transfers before opening a transaction', async () => {
    const transaction = vi.fn();
    await expect(new SavingsPlacesService({ transaction } as never).transfer('u1', {
      fromPlaceId: 'from', toPlaceId: 'to', currency: 'ARS', amount: '0,001',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('uses only owned-place ledger rows and owned-goal withdrawals for exact source balance', async () => {
    const owned = ['from', 'to', 'middle'];
    const lockIds: string[] = [];
    const lockModes: string[] = [];
    const lockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn((condition) => {
          lockIds.push(new PgDialect().sqlToQuery(condition).params[0] as string);
          return { for: vi.fn((mode) => { lockModes.push(mode); return Promise.resolve([{ id: lockIds.at(-1) }]); }) };
        }),
      }),
    });
    const rows = {
      savingContributions: [{ placeId: 'from', currency: 'ARS', amount: '12.00' }, { placeId: 'from', currency: 'USD', amount: '800.00' }, { placeId: 'middle', currency: 'ARS', amount: '400.00' }],
      savingsPlaceTransfers: [
        { fromPlaceId: 'middle', toPlaceId: 'from', currency: 'ARS', amount: '3.00' },
        { fromPlaceId: 'from', toPlaceId: 'to', currency: 'ARS', amount: '4.00' },
        { fromPlaceId: 'foreign', toPlaceId: 'from', currency: 'ARS', amount: '1000.00' },
        { fromPlaceId: 'from', toPlaceId: 'foreign', currency: 'ARS', amount: '1000.00' },
      ],
      financialGoals: [{ id: 'owned-goal' }],
      goalCompletionWithdrawals: [
        { goalId: 'owned-goal', amount: '1.00' },
        { goalId: 'foreign-goal', amount: '900.00' },
      ],
    };
    const findMany = (key: keyof typeof rows) => vi.fn().mockResolvedValue(rows[key]);
    const inserted: unknown[] = [];
    const tx = {
      select: lockSelect,
      query: {
        savingsPlaces: { findMany: vi.fn().mockResolvedValue(owned.map((id) => ({ id }))) },
        savingContributions: { findMany: findMany('savingContributions') },
        savingsPlaceTransfers: { findMany: findMany('savingsPlaceTransfers') },
        financialGoals: { findMany: findMany('financialGoals') },
        goalCompletionWithdrawals: { findMany: findMany('goalCompletionWithdrawals') },
      },
      insert: vi.fn((table) => ({ values: (value) => { inserted.push({ table, value }); return { returning: async () => [{ id: 'transfer-id' }] }; } })),
    };
    const db = { transaction: (run: (transaction: typeof tx) => unknown) => run(tx) };
    const service = new SavingsPlacesService(db as never);

    await expect(service.transfer('u1', { fromPlaceId: 'from', toPlaceId: 'to', currency: 'ARS', amount: '10.00' })).resolves.toEqual({ transferId: 'transfer-id' });
    expect(lockSelect).toHaveBeenCalledTimes(2);
    expect(lockIds).toEqual(['from', 'to']);
    expect(lockModes).toEqual(['update', 'update']);
    expect(inserted).toEqual([{ table: savingsPlaceTransfers, value: { userId: 'u1', fromPlaceId: 'from', toPlaceId: 'to', currency: 'ARS', amount: '10.00' } }]);

    inserted.length = 0;
    await expect(service.transfer('u1', { fromPlaceId: 'from', toPlaceId: 'to', currency: 'ARS', amount: '10.01' })).rejects.toBeInstanceOf(BadRequestException);
    expect(inserted).toEqual([]);
    expect(rows.savingsPlaceTransfers).toHaveLength(4);
  });

  it('returns not-found for an unowned place before deletion', async () => {
    const db = { query: { savingsPlaces: { findFirst: vi.fn().mockResolvedValue(undefined) } }, delete: vi.fn() };
    await expect(new SavingsPlacesService(db as never).delete('u1', 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.delete).not.toHaveBeenCalled();
  });
});
