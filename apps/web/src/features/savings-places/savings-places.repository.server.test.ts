import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import {
  deleteSavingsPlaceInRepository,
  getSavingsPlacesWorkspaceState,
  resolveSavingsPlaceWithExecutor,
  transferSavingsInRepository,
} from './savings-places.repository.server'

const mockTx = {
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
    savingsPlaceTransfers: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
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
  })

  describe('getSavingsPlacesWorkspaceState', () => {
    it('returns empty workspace when no places exist', async () => {
      vi.mocked(db.query.savingsPlaces.findMany).mockResolvedValue([])
      vi.mocked(db.query.savingContributions.findMany).mockResolvedValue([])
      vi.mocked(db.query.savingsPlaceTransfers.findMany).mockResolvedValue([])

      const result = await getSavingsPlacesWorkspaceState('user_1')

      expect(result.places).toEqual([])
      expect(result.movements).toEqual([])
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
  })

  describe('transferSavingsInRepository', () => {
    it('creates a transfer when balance is sufficient', async () => {
      vi.mocked(mockTx.query.savingsPlaces.findFirst)
        .mockResolvedValueOnce({ id: 'p1', userId: 'user_1' } as any)
        .mockResolvedValueOnce({ id: 'p2', userId: 'user_1' } as any)

      vi.mocked(mockTx.query.savingContributions.findMany).mockResolvedValue([
        { placeId: 'p1', currency: 'ARS', amount: '1000.00' },
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
    })

    it('rejects transfer when balance is insufficient', async () => {
      vi.mocked(mockTx.query.savingsPlaces.findFirst)
        .mockResolvedValueOnce({ id: 'p1', userId: 'user_1' } as any)
        .mockResolvedValueOnce({ id: 'p2', userId: 'user_1' } as any)

      vi.mocked(mockTx.query.savingContributions.findMany).mockResolvedValue([
        { placeId: 'p1', currency: 'ARS', amount: '100.00' },
      ] as any)
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
  })
})
