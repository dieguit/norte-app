import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import {
  deleteSavingsPlaceInRepository,
  getSavingsPlacesWorkspaceState,
  resolveSavingsPlaceWithExecutor,
  transferSavingsInRepository,
} from './savings-places.repository.server'

const mockTx = {
  select: vi.fn(),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn(),
    }),
  }),
  query: {
    savingsPlaces: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    savingContributions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    goalCompletionWithdrawals: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    financialGoals: {
      findMany: vi.fn(),
    },
    savingsPlaceTransfers: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}

function getSqlParamValues(query: any): string[] {
  const values: string[] = []
  const visit = (node: any) => {
    if (node?.constructor?.name === 'Param') {
      values.push(node.value)
      return
    }
    if (Array.isArray(node?.queryChunks)) node.queryChunks.forEach(visit)
  }
  visit(query)
  return values
}

vi.mock('../../db/client', () => ({
  db: {
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    transaction: vi.fn().mockImplementation((callback) => callback(mockTx)),
    query: {
      savingsPlaces: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      savingContributions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      goalCompletionWithdrawals: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      financialGoals: {
        findMany: vi.fn(),
      },
      savingsPlaceTransfers: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}))

describe('savings-places.repository.server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockTx.query.financialGoals.findMany).mockResolvedValue([
      { id: 'g1', userId: 'user_1' },
    ] as any)
    vi.mocked(mockTx.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockResolvedValue([{ id: 'p1', userId: 'user_1' }]),
        }),
      }),
    }) as any)
  })

  describe('getSavingsPlacesWorkspaceState', () => {
    it('returns empty workspace when no places exist', async () => {
      vi.mocked(db.query.savingsPlaces.findMany).mockResolvedValue([])
      vi.mocked(db.query.savingContributions.findMany).mockResolvedValue([])
      vi.mocked(db.query.savingsPlaceTransfers.findMany).mockResolvedValue([])
      vi.mocked(db.query.goalCompletionWithdrawals.findMany).mockResolvedValue([])
      vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([])

      const result = await getSavingsPlacesWorkspaceState('user_1')

      expect(result.places).toEqual([])
      expect(result.movements).toEqual([])
      expect(db.query.goalCompletionWithdrawals.findMany).not.toHaveBeenCalled()
    })

    it('loads owned-place completion withdrawals with their goal names', async () => {
      vi.mocked(db.query.savingsPlaces.findMany).mockResolvedValue([
        { id: 'p1', name: 'Banco', userId: 'user_1' },
      ] as any)
      vi.mocked(db.query.savingContributions.findMany).mockResolvedValue([
        {
          id: 'c1',
          placeId: 'p1',
          amount: '1000.00',
          currency: 'ARS',
          createdAt: new Date('2026-01-01'),
        },
      ] as any)
      vi.mocked(db.query.savingsPlaceTransfers.findMany).mockResolvedValue([])
      vi.mocked(db.query.goalCompletionWithdrawals.findMany).mockResolvedValue([
        {
          id: 'w1',
          goalId: 'g1',
          placeId: 'p1',
          amount: '600.00',
          currency: 'ARS',
          createdAt: new Date('2026-01-02'),
        },
        {
          id: 'foreign-w1',
          goalId: 'foreign-g1',
          placeId: 'p1',
          amount: '999.00',
          currency: 'ARS',
          createdAt: new Date('2026-01-03'),
        },
      ] as any)
      vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([
        { id: 'g1', name: 'Vacaciones', userId: 'user_1' },
      ] as any)

      const result = await getSavingsPlacesWorkspaceState('user_1')

      expect(result.places[0].balances.ARS).toBe('400.00')
      expect(result.movements).toHaveLength(2)
      expect(result.movements[0]).toEqual({
        kind: 'completion',
        id: 'w1',
        goalId: 'g1',
        goalName: 'Vacaciones',
        placeId: 'p1',
        placeName: 'Banco',
        amount: '600.00',
        currency: 'ARS',
        createdAt: '2026-01-02T00:00:00.000Z',
      })
      expect(result.movements.some((movement) => movement.id === 'foreign-w1')).toBe(false)
      expect(vi.mocked(db.query.goalCompletionWithdrawals.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.any(Function) }),
      )
      const [[{ where }]] = vi.mocked(db.query.goalCompletionWithdrawals.findMany).mock.calls as any
      const and = vi.fn().mockReturnValue('owned-place-and-goal-ids')
      const inArray = vi.fn().mockReturnValue('owned-place-or-goal-ids')
      where({ placeId: 'place.id', goalId: 'goal.id' }, { and, inArray })
      expect(and).toHaveBeenCalledWith('owned-place-or-goal-ids', 'owned-place-or-goal-ids')
      expect(inArray).toHaveBeenCalledWith('place.id', ['p1'])
      expect(inArray).toHaveBeenCalledWith('goal.id', ['g1'])
    })
  })

  describe('resolveSavingsPlaceWithExecutor', () => {
    it('resolves an existing place by ID', async () => {
      vi.mocked(mockTx.query.savingsPlaces.findFirst).mockResolvedValue({
        id: 'place-1',
        name: 'Banco',
      } as any)

      const result = await resolveSavingsPlaceWithExecutor(mockTx, 'user_1', {
        kind: 'existing',
        placeId: 'place-1',
      })

      expect(result).toEqual({ id: 'place-1', name: 'Banco' })
    })

    it('creates a new place inline', async () => {
      const mockOnConflict = vi.fn()
      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict }),
      } as any)
      vi.mocked(mockTx.query.savingsPlaces.findFirst).mockResolvedValue({
        id: 'place-2',
        name: 'Caja',
      } as any)

      const result = await resolveSavingsPlaceWithExecutor(mockTx, 'user_1', {
        kind: 'new',
        name: 'Caja',
      })

      expect(result).toEqual({ id: 'place-2', name: 'Caja' })
    })
  })

  describe('deleteSavingsPlaceInRepository', () => {
    it('deletes an unused place', async () => {
      vi.mocked(db.query.savingsPlaces.findFirst).mockResolvedValue({
        id: 'place-1',
        userId: 'user_1',
      } as any)
      vi.mocked(db.query.savingContributions.findFirst).mockResolvedValue(undefined)
      vi.mocked(db.query.savingsPlaceTransfers.findFirst).mockResolvedValue(undefined)

      await deleteSavingsPlaceInRepository('user_1', 'place-1')
    })

    it('rejects deletion when place has contributions', async () => {
      vi.mocked(db.query.savingsPlaces.findFirst).mockResolvedValue({
        id: 'place-1',
        userId: 'user_1',
      } as any)
      vi.mocked(db.query.savingContributions.findFirst).mockResolvedValue({ id: 'c1' } as any)

      await expect(deleteSavingsPlaceInRepository('user_1', 'place-1')).rejects.toThrow(
        'No podés eliminar un lugar que tiene movimientos.',
      )
    })

    it('rejects deletion when place has completion withdrawals', async () => {
      vi.mocked(db.query.savingsPlaces.findFirst).mockResolvedValue({
        id: 'place-1',
        userId: 'user_1',
      } as any)
      vi.mocked(db.query.savingContributions.findFirst).mockResolvedValue(undefined)
      vi.mocked(db.query.goalCompletionWithdrawals.findFirst).mockResolvedValue({ id: 'w1' } as any)

      await expect(deleteSavingsPlaceInRepository('user_1', 'place-1')).rejects.toThrow(
        'No podés eliminar un lugar que tiene movimientos.',
      )
    })
  })

  describe('transferSavingsInRepository', () => {
    it('creates a transfer when balance is sufficient', async () => {
      vi.mocked(mockTx.query.savingsPlaces.findFirst)
        .mockResolvedValueOnce({ id: 'p1', userId: 'user_1' } as any)
        .mockResolvedValueOnce({ id: 'p2', userId: 'user_1' } as any)

      vi.mocked(mockTx.query.savingContributions.findMany).mockResolvedValue([
        { placeId: 'p1', currency: 'ARS', amount: '1000.00' },
      ] as any)
      vi.mocked(mockTx.query.goalCompletionWithdrawals.findMany).mockResolvedValue([
        { goalId: 'g1', placeId: 'p1', currency: 'ARS', amount: '600.00' },
      ] as any)
      vi.mocked(mockTx.query.savingsPlaceTransfers.findMany).mockResolvedValue([] as any)

      const mockReturning = vi.fn().mockResolvedValue([{ id: 'transfer-1' }])
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
      vi.mocked(mockTx.insert).mockReturnValue({ values: mockValues } as any)

      const result = await transferSavingsInRepository({
        userId: 'user_1',
        fromPlaceId: 'p1',
        toPlaceId: 'p2',
        currency: 'ARS',
        amount: '250.00',
      })

      expect(result.transferId).toBe('transfer-1')
      expect(mockTx.select).toHaveBeenCalledTimes(2)
      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ amount: '250.00' }))
    })

    it('rejects transfer when balance is insufficient', async () => {
      vi.mocked(mockTx.query.savingsPlaces.findFirst)
        .mockResolvedValueOnce({ id: 'p1', userId: 'user_1' } as any)
        .mockResolvedValueOnce({ id: 'p2', userId: 'user_1' } as any)

      vi.mocked(mockTx.query.savingContributions.findMany).mockResolvedValue([
        { placeId: 'p1', currency: 'ARS', amount: '100.00' },
      ] as any)
      vi.mocked(mockTx.query.goalCompletionWithdrawals.findMany).mockResolvedValue([] as any)
      vi.mocked(mockTx.query.savingsPlaceTransfers.findMany).mockResolvedValue([] as any)

      await expect(
        transferSavingsInRepository({
          userId: 'user_1',
          fromPlaceId: 'p1',
          toPlaceId: 'p2',
          currency: 'ARS',
          amount: '250.00',
        }),
      ).rejects.toThrow('No tenés saldo suficiente en ese lugar.')
    })

    it('uses decimal arithmetic for balances and locks places before reading movements', async () => {
      const events: string[] = []
      vi.mocked(mockTx.select).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockImplementation(async () => {
              events.push('lock')
              return [{ id: events.length === 1 ? 'p1' : 'p2', userId: 'user_1' }]
            }),
          }),
        }),
      }))
      vi.mocked(mockTx.query.savingsPlaces.findFirst)
        .mockResolvedValueOnce({ id: 'p1', userId: 'user_1' } as any)
        .mockResolvedValueOnce({ id: 'p2', userId: 'user_1' } as any)
      vi.mocked(mockTx.query.savingContributions.findMany).mockResolvedValue([
        { placeId: 'p1', currency: 'ARS', amount: '0.30' },
      ] as any)
      vi.mocked(mockTx.query.goalCompletionWithdrawals.findMany).mockResolvedValue([] as any)
      vi.mocked(mockTx.query.savingsPlaceTransfers.findMany).mockResolvedValue([
        { fromPlaceId: 'p1', toPlaceId: 'p2', currency: 'ARS', amount: '0.10' },
      ] as any)
      const returning = vi.fn().mockResolvedValue([{ id: 'transfer-2' }])
      const values = vi.fn().mockReturnValue({ returning })
      vi.mocked(mockTx.insert).mockReturnValue({ values } as any)

      await transferSavingsInRepository({
        userId: 'user_1', fromPlaceId: 'p1', toPlaceId: 'p2', currency: 'ARS', amount: '0.20',
      })

      expect(events).toEqual(['lock', 'lock'])
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ amount: '0.20' }))
    })

    it('uses a valid owned-place SELECT lock query for each place', async () => {
      const whereConditions: any[] = []
      const where = vi.fn().mockImplementation((condition: any) => {
        whereConditions.push(condition)
        if (typeof condition === 'function') {
          condition({ id: 'place.id', userId: 'place.userId' })
        }
        return { for: vi.fn().mockResolvedValue([{ id: 'locked' }]) }
      })
      vi.mocked(mockTx.select).mockReturnValue({
        from: vi.fn().mockReturnValue({ where }),
      } as any)
      vi.mocked(mockTx.query.savingContributions.findMany).mockResolvedValue([
        { placeId: 'p2', currency: 'ARS', amount: '1.00' },
      ] as any)
      vi.mocked(mockTx.query.goalCompletionWithdrawals.findMany).mockResolvedValue([] as any)
      vi.mocked(mockTx.query.savingsPlaceTransfers.findMany).mockResolvedValue([])
      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'transfer-3' }]),
        }),
      } as any)

      await transferSavingsInRepository({
        userId: 'user_1',
        fromPlaceId: 'p2',
        toPlaceId: 'p1',
        currency: 'ARS',
        amount: '0.01',
      })

      expect(where).toHaveBeenCalledTimes(2)
      expect(where.mock.calls.every(([condition]) => typeof condition !== 'function')).toBe(true)
      expect(whereConditions.map(getSqlParamValues)).toEqual([
        ['p1', 'user_1'],
        ['p2', 'user_1'],
      ])
    })

    it('rejects a transfer when completion withdrawals consume the source balance', async () => {
      vi.mocked(mockTx.query.savingContributions.findMany).mockResolvedValue([
        { placeId: 'p1', currency: 'ARS', amount: '1000.00' },
      ] as any)
      vi.mocked(mockTx.query.goalCompletionWithdrawals.findMany).mockResolvedValue([
        { goalId: 'g1', placeId: 'p1', currency: 'ARS', amount: '600.00' },
      ] as any)
      vi.mocked(mockTx.query.savingsPlaceTransfers.findMany).mockResolvedValue([])

      await expect(
        transferSavingsInRepository({
          userId: 'user_1',
          fromPlaceId: 'p1',
          toPlaceId: 'p2',
          currency: 'ARS',
          amount: '500.00',
        }),
      ).rejects.toThrow('No tenés saldo suficiente en ese lugar.')
    })

    it('ignores completion withdrawals for foreign goals when validating transfers', async () => {
      vi.mocked(mockTx.query.savingContributions.findMany).mockResolvedValue([
        { placeId: 'p1', currency: 'ARS', amount: '1000.00' },
      ] as any)
      vi.mocked(mockTx.query.goalCompletionWithdrawals.findMany).mockResolvedValue([
        { goalId: 'foreign-g1', placeId: 'p1', currency: 'ARS', amount: '1000.00' },
      ] as any)
      vi.mocked(mockTx.query.savingsPlaceTransfers.findMany).mockResolvedValue([])
      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'transfer-foreign-goal' }]),
        }),
      } as any)

      await expect(
        transferSavingsInRepository({
          userId: 'user_1',
          fromPlaceId: 'p1',
          toPlaceId: 'p2',
          currency: 'ARS',
          amount: '1000.00',
        }),
      ).resolves.toEqual({ transferId: 'transfer-foreign-goal' })
    })
  })
})
