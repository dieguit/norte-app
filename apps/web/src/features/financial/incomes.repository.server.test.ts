import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import { incomes, incomeSources } from '../../db/schema'
import {
  createIncomeInRepository,
  deleteIncomeInRepository,
  getIncomesWorkspaceState,
  insertIncomeWithExecutor,
  updateIncomeInRepository,
} from './incomes.repository.server'
import type { IncomeDraft } from './incomes.schema'

const mockTx = {
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  query: {
    incomeSources: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    incomes: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}

vi.mock('../../db/client', () => ({
  db: {
    transaction: vi.fn().mockImplementation((callback) => callback(mockTx)),
    delete: vi.fn(),
    query: {
      financialProfiles: {
        findFirst: vi.fn(),
      },
      incomeSources: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      incomes: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
}))

describe('incomes.repository.server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getIncomesWorkspaceState', () => {
    it('returns null when profile does not exist', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      const state = await getIncomesWorkspaceState('user_1')

      expect(state).toBeNull()
      expect(db.query.incomeSources.findMany).not.toHaveBeenCalled()
      expect(db.query.incomes.findMany).not.toHaveBeenCalled()
    })

    it('loads sources and incomes mapped with sourceName for the authenticated user', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({ userId: 'user_1' } as never)
      vi.mocked(db.query.incomeSources.findMany).mockResolvedValue([
        { id: 'src_custom_1', userId: 'user_1', name: 'Freelance Design', normalizedName: 'freelance design' },
      ] as never)
      vi.mocked(db.query.incomes.findMany).mockResolvedValue([
        {
          id: 'inc_1',
          userId: 'user_1',
          sourceKind: 'salary',
          sourceId: null,
          concept: 'Sueldo principal',
          amount: '500000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
        },
        {
          id: 'inc_2',
          userId: 'user_1',
          sourceKind: 'custom',
          sourceId: 'src_custom_1',
          concept: 'Freelance Design',
          amount: '1000.00',
          currency: 'USD',
          recurring: true,
          effectiveMonth: '2026-02-01',
        },
        {
          id: 'inc_3',
          userId: 'user_1',
          sourceKind: 'custom',
          sourceId: 'src_deleted',
          concept: null,
          amount: '50000.00',
          currency: 'ARS',
          recurring: false,
          effectiveMonth: '2026-08-01',
        },
      ] as never)

      const state = await getIncomesWorkspaceState('user_1')

      expect(state).toEqual({
        sources: [{ id: 'src_custom_1', userId: 'user_1', name: 'Freelance Design', normalizedName: 'freelance design' }],
        incomes: [
          {
            id: 'inc_1',
            sourceKind: 'salary',
            sourceId: null,
            sourceName: 'salary',
            concept: 'Sueldo principal',
            amount: '500000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-01-01',
          },
          {
            id: 'inc_2',
            sourceKind: 'custom',
            sourceId: 'src_custom_1',
            sourceName: 'Freelance Design',
            concept: 'Freelance Design',
            amount: '1000.00',
            currency: 'USD',
            recurring: true,
            effectiveMonth: '2026-02-01',
          },
          {
            id: 'inc_3',
            sourceKind: 'custom',
            sourceId: 'src_deleted',
            sourceName: 'Fuente eliminada',
            concept: null,
            amount: '50000.00',
            currency: 'ARS',
            recurring: false,
            effectiveMonth: '2026-08-01',
          },
        ],
      })
    })
  })

  describe('insertIncomeWithExecutor', () => {
    it('uses the supplied transaction without opening another', async () => {
      const salaryDraft: IncomeDraft = {
        source: { kind: 'salary' },
        concept: 'Sueldo principal',
        amount: '500000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08',
      }
      const insertedIncome = {
        id: 'inc_salary',
        userId: 'user_1',
        sourceKind: 'salary',
        sourceId: null,
        concept: 'Sueldo principal',
        amount: '500000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
      }

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([insertedIncome]),
        }),
      })

      const result = await insertIncomeWithExecutor(mockTx, 'user_1', salaryDraft, '2026-08')

      expect(db.transaction).not.toHaveBeenCalled()
      expect(mockTx.insert).toHaveBeenCalledWith(incomes)
      expect(result).toEqual(insertedIncome)
    })

    it('handles custom source resolution and row insertion through the same executor', async () => {
      const customDraft: IncomeDraft = {
        source: { kind: 'custom', name: '  Consultoría TI  ' },
        concept: 'Consultoría TI',
        amount: '2000.00',
        currency: 'USD',
        recurring: true,
        effectiveMonth: '2026-08',
      }
      const createdSource = {
        id: 'src_ti',
        userId: 'user_1',
        name: 'Consultoría TI',
        normalizedName: 'consultoría ti',
      }
      const insertedIncome = {
        id: 'inc_ti',
        userId: 'user_1',
        sourceKind: 'custom',
        sourceId: 'src_ti',
        concept: 'Consultoría TI',
        amount: '2000.00',
        currency: 'USD',
        recurring: true,
        effectiveMonth: '2026-08-01',
      }

      const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined)
      const mockSourceValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing })
      const mockIncomeReturning = vi.fn().mockResolvedValue([insertedIncome])
      const mockIncomeValues = vi.fn().mockReturnValue({ returning: mockIncomeReturning })

      mockTx.insert.mockImplementation((table) => {
        if (table === incomeSources) return { values: mockSourceValues }
        if (table === incomes) return { values: mockIncomeValues }
        throw new Error('Unexpected table')
      })

      mockTx.query.incomeSources.findFirst.mockResolvedValue(createdSource)

      const result = await insertIncomeWithExecutor(mockTx, 'user_1', customDraft, '2026-08')

      expect(db.transaction).not.toHaveBeenCalled()
      expect(mockSourceValues).toHaveBeenCalledWith({
        userId: 'user_1',
        name: 'Consultoría TI',
        normalizedName: 'consultoría ti',
      })
      expect(mockIncomeValues).toHaveBeenCalledWith({
        userId: 'user_1',
        sourceKind: 'custom',
        sourceId: 'src_ti',
        concept: 'Consultoría TI',
        amount: '2000.00',
        currency: 'USD',
        recurring: true,
        effectiveMonth: '2026-08-01',
      })
      expect(result).toEqual(insertedIncome)
    })
  })

  describe('createIncomeInRepository', () => {
    it('opens a transaction and creates income for user', async () => {
      const salaryDraft: IncomeDraft = {
        source: { kind: 'salary' },
        concept: 'Sueldo nuevo',
        amount: '600000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08',
      }
      const insertedIncome = {
        id: 'inc_new',
        userId: 'user_1',
        sourceKind: 'salary',
        sourceId: null,
        concept: 'Sueldo nuevo',
        amount: '600000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
      }

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([insertedIncome]),
        }),
      })

      const result = await createIncomeInRepository('user_1', salaryDraft)

      expect(db.transaction).toHaveBeenCalledOnce()
      expect(mockTx.insert).toHaveBeenCalledWith(incomes)
      expect(result).toEqual(insertedIncome)
    })
  })

  describe('updateIncomeInRepository', () => {
    it('throws error when income does not exist', async () => {
      mockTx.query.incomes.findFirst.mockResolvedValue(undefined)
      const draft: IncomeDraft = {
        source: { kind: 'salary' },
        concept: 'Sueldo actualizado',
        amount: '700000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08',
      }

      await expect(updateIncomeInRepository('user_1', 'inc_missing', draft)).rejects.toThrow(
        'Ingreso no encontrado.',
      )
    })

    it('updates income in place', async () => {
      const existingIncome = {
        id: 'inc_1',
        userId: 'user_1',
        sourceKind: 'salary',
        sourceId: null,
        concept: 'Sueldo principal',
        amount: '500000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-01-01',
      }
      mockTx.query.incomes.findFirst.mockResolvedValue(existingIncome)

      const draft: IncomeDraft = {
        source: { kind: 'salary' },
        concept: 'Sueldo actualizado',
        amount: '700000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08',
      }
      const updatedIncome = {
        ...existingIncome,
        concept: 'Sueldo actualizado',
        amount: '700000.00',
        effectiveMonth: '2026-08-01',
      }

      const mockUpdateWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updatedIncome]) })
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
      mockTx.update.mockReturnValue({ set: mockUpdateSet })

      const result = await updateIncomeInRepository('user_1', 'inc_1', draft)

      expect(db.transaction).toHaveBeenCalledOnce()
      expect(mockTx.update).toHaveBeenCalledWith(incomes)
      expect(mockUpdateSet).toHaveBeenCalledWith({
        userId: 'user_1',
        sourceKind: 'salary',
        sourceId: null,
        concept: 'Sueldo actualizado',
        amount: '700000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
      })
      expect(result).toEqual(updatedIncome)
    })
  })

  describe('deleteIncomeInRepository', () => {
    it('throws error when income does not exist', async () => {
      const mockDeleteWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) })
      vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never)

      await expect(deleteIncomeInRepository('user_1', 'inc_missing')).rejects.toThrow(
        'Ingreso no encontrado.',
      )
    })

    it('deletes income when found', async () => {
      const mockDeleteWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'inc_1' }]) })
      vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as never)

      await expect(deleteIncomeInRepository('user_1', 'inc_1')).resolves.toBeUndefined()
    })
  })
})
