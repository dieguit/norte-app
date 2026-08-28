import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import { expenses, expenseSources } from '../../db/schema'
import {
  createExpenseInRepository,
  deleteExpenseInRepository,
  getExpensesWorkspaceState,
  insertExpenseWithExecutor,
  updateExpenseInRepository,
} from './expenses.repository.server'
import type { ExpenseDraft } from './expenses.schema'

const mockTx = {
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  query: {
    expenseSources: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    expenses: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}

vi.mock('../../db/client', () => ({
  db: {
    transaction: vi.fn().mockImplementation((callback) => callback(mockTx)),
    query: {
      financialProfiles: {
        findFirst: vi.fn(),
      },
      expenseSources: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      expenses: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
}))

describe('expenses.repository.server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getExpensesWorkspaceState', () => {
    it('returns null when profile does not exist', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      const state = await getExpensesWorkspaceState('user_1')

      expect(state).toBeNull()
      expect(db.query.expenseSources.findMany).not.toHaveBeenCalled()
      expect(db.query.expenses.findMany).not.toHaveBeenCalled()
    })

    it('loads sources and expenses mapped with sourceName for the authenticated user', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({ userId: 'user_1' } as never)
      vi.mocked(db.query.expenseSources.findMany).mockResolvedValue([
        { id: 'src_custom_1', userId: 'user_1', name: 'Gimnasio', normalizedName: 'gimnasio' },
      ] as never)
      vi.mocked(db.query.expenses.findMany).mockResolvedValue([
        {
          id: 'exp_1',
          userId: 'user_1',
          sourceKind: 'housing',
          sourceId: null,
          concept: 'Alquiler',
          amount: '150000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
          endMonth: null,
        },
        {
          id: 'exp_2',
          userId: 'user_1',
          sourceKind: 'custom',
          sourceId: 'src_custom_1',
          concept: 'Gimnasio',
          amount: '25000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-02-01',
          endMonth: null,
        },
        {
          id: 'exp_3',
          userId: 'user_1',
          sourceKind: 'custom',
          sourceId: 'src_deleted',
          concept: null,
          amount: '10000.00',
          currency: 'ARS',
          recurring: false,
          effectiveMonth: '2026-08-01',
          endMonth: null,
        },
      ] as never)

      const state = await getExpensesWorkspaceState('user_1')

      expect(state).toEqual({
        sources: [{ id: 'src_custom_1', userId: 'user_1', name: 'Gimnasio', normalizedName: 'gimnasio' }],
        expenses: [
          {
            id: 'exp_1',
            sourceKind: 'housing',
            sourceId: null,
            sourceName: 'housing',
            concept: 'Alquiler',
            amount: '150000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-01-01',
            endMonth: null,
          },
          {
            id: 'exp_2',
            sourceKind: 'custom',
            sourceId: 'src_custom_1',
            sourceName: 'Gimnasio',
            concept: 'Gimnasio',
            amount: '25000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-02-01',
            endMonth: null,
          },
          {
            id: 'exp_3',
            sourceKind: 'custom',
            sourceId: 'src_deleted',
            sourceName: 'Concepto eliminado',
            concept: null,
            amount: '10000.00',
            currency: 'ARS',
            recurring: false,
            effectiveMonth: '2026-08-01',
            endMonth: null,
          },
        ],
      })
    })
  })

  describe('insertExpenseWithExecutor', () => {
    it('uses the supplied transaction without opening another', async () => {
      const housingDraft: ExpenseDraft = {
        source: { kind: 'housing' },
        concept: 'Alquiler',
        amount: '200000.00',
        currency: 'ARS',
        recurring: true,
      }
      const insertedExpense = {
        id: 'exp_housing',
        userId: 'user_1',
        sourceKind: 'housing',
        sourceId: null,
        concept: 'Alquiler',
        amount: '200000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([insertedExpense]),
        }),
      })

      const result = await insertExpenseWithExecutor(mockTx, 'user_1', housingDraft, '2026-08')

      expect(db.transaction).not.toHaveBeenCalled()
      expect(mockTx.insert).toHaveBeenCalledWith(expenses)
      expect(result).toEqual(insertedExpense)
    })

    it('handles custom concept resolution and row insertion through the same executor', async () => {
      const customDraft: ExpenseDraft = {
        source: { kind: 'custom', name: '  Clases De Inglés  ' },
        concept: 'Clases De Inglés',
        amount: '35000.00',
        currency: 'ARS',
        recurring: true,
      }
      const createdSource = {
        id: 'src_eng',
        userId: 'user_1',
        name: 'Clases De Inglés',
        normalizedName: 'clases de inglés',
      }
      const insertedExpense = {
        id: 'exp_eng',
        userId: 'user_1',
        sourceKind: 'custom',
        sourceId: 'src_eng',
        concept: 'Clases De Inglés',
        amount: '35000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }

      const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined)
      const mockSourceValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing })
      const mockExpenseReturning = vi.fn().mockResolvedValue([insertedExpense])
      const mockExpenseValues = vi.fn().mockReturnValue({ returning: mockExpenseReturning })

      mockTx.insert.mockImplementation((table) => {
        if (table === expenseSources) return { values: mockSourceValues }
        if (table === expenses) return { values: mockExpenseValues }
        throw new Error('Unexpected table')
      })

      mockTx.query.expenseSources.findFirst.mockResolvedValue(createdSource)

      const result = await insertExpenseWithExecutor(mockTx, 'user_1', customDraft, '2026-08')

      expect(db.transaction).not.toHaveBeenCalled()
      expect(mockSourceValues).toHaveBeenCalledWith({
        userId: 'user_1',
        name: 'Clases De Inglés',
        normalizedName: 'clases de inglés',
      })
      expect(mockExpenseValues).toHaveBeenCalledWith({
        userId: 'user_1',
        sourceKind: 'custom',
        sourceId: 'src_eng',
        concept: 'Clases De Inglés',
        amount: '35000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      })
      expect(result).toEqual(insertedExpense)
    })
  })

  describe('createExpenseInRepository', () => {
    it('creates a fixed concept expense for user', async () => {
      const draft: ExpenseDraft = {
        source: { kind: 'housing' },
        concept: 'Alquiler',
        amount: '200000.00',
        currency: 'ARS',
        recurring: true,
      }
      const insertedExpense = {
        id: 'exp_new',
        userId: 'user_1',
        sourceKind: 'housing',
        sourceId: null,
        concept: 'Alquiler',
        amount: '200000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }

      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([insertedExpense]),
        }),
      })

      const result = await createExpenseInRepository('user_1', draft, '2026-08')

      expect(result).toEqual(insertedExpense)
      expect(mockTx.insert).toHaveBeenCalledWith(expenses)
    })

    it('normalizes custom concept name with es-AR and inserts source if not existing', async () => {
      const draft: ExpenseDraft = {
        source: { kind: 'custom', name: '  Clases De Inglés  ' },
        concept: 'Clases De Inglés',
        amount: '35000.00',
        currency: 'ARS',
        recurring: true,
      }
      const createdSource = {
        id: 'src_eng',
        userId: 'user_1',
        name: 'Clases De Inglés',
        normalizedName: 'clases de inglés',
      }
      const createdExpense = {
        id: 'exp_eng',
        userId: 'user_1',
        sourceKind: 'custom',
        sourceId: 'src_eng',
        concept: 'Clases De Inglés',
        amount: '35000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }

      const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined)
      const mockSourceValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing })
      const mockExpenseReturning = vi.fn().mockResolvedValue([createdExpense])
      const mockExpenseValues = vi.fn().mockReturnValue({ returning: mockExpenseReturning })

      mockTx.insert.mockImplementation((table) => {
        if (table === expenseSources) return { values: mockSourceValues }
        if (table === expenses) return { values: mockExpenseValues }
        throw new Error('Unexpected table')
      })

      mockTx.query.expenseSources.findFirst.mockResolvedValue(createdSource)

      const result = await createExpenseInRepository('user_1', draft, '2026-08')

      expect(result).toEqual(createdExpense)
      expect(mockSourceValues).toHaveBeenCalledWith({
        userId: 'user_1',
        name: 'Clases De Inglés',
        normalizedName: 'clases de inglés',
      })
      expect(mockExpenseValues).toHaveBeenCalledWith({
        userId: 'user_1',
        sourceKind: 'custom',
        sourceId: 'src_eng',
        concept: 'Clases De Inglés',
        amount: '35000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      })
    })

    it('reuses existing custom source on duplicate name', async () => {
      const draft: ExpenseDraft = {
        source: { kind: 'custom', name: 'Gimnasio' },
        concept: 'Gimnasio',
        amount: '20000.00',
        currency: 'ARS',
        recurring: false,
      }
      const existingSource = {
        id: 'src_gym',
        userId: 'user_1',
        name: 'Gimnasio',
        normalizedName: 'gimnasio',
      }
      const createdExpense = {
        id: 'exp_gym',
        userId: 'user_1',
        sourceKind: 'custom',
        sourceId: 'src_gym',
        concept: 'Gimnasio',
        amount: '20000.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }

      mockTx.insert.mockImplementation((table) => {
        if (table === expenseSources) return { values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn() }) }
        if (table === expenses) return { values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([createdExpense]) }) }
        throw new Error('Unexpected table')
      })
      mockTx.query.expenseSources.findFirst.mockResolvedValue(existingSource)

      const result = await createExpenseInRepository('user_1', draft, '2026-08')

      expect(result).toEqual(createdExpense)
      expect(result.sourceId).toBe('src_gym')
    })

    it('throws error when custom sourceId does not exist for the user', async () => {
      const draft: ExpenseDraft = {
        source: { kind: 'custom', sourceId: 'src_non_existent' },
        concept: 'Alquiler',
        amount: '10000.00',
        currency: 'ARS',
        recurring: false,
      }
      mockTx.query.expenseSources.findFirst.mockResolvedValue(undefined)

      await expect(createExpenseInRepository('user_1', draft, '2026-08')).rejects.toThrow('Concepto de gasto no encontrado.')
    })
  })

  describe('updateExpenseInRepository', () => {
    it('throws error when expense does not exist or belongs to another user', async () => {
      mockTx.query.expenses.findFirst.mockResolvedValue(undefined)

      const draft: ExpenseDraft = {
        source: { kind: 'housing' },
        concept: 'Alquiler',
        amount: '220000.00',
        currency: 'ARS',
        recurring: true,
      }

      await expect(
        updateExpenseInRepository('user_1', 'other_user_expense_id', '2026-08', draft),
      ).rejects.toThrow('Gasto no encontrado.')
    })

    it('versions recurring expense by closing previous row with endMonth and inserting replacement when effectiveMonth < selected month', async () => {
      const activeRecurringId = 'exp_rec_past'
      const existingExpense = {
        id: activeRecurringId,
        userId: 'user_1',
        sourceKind: 'housing',
        sourceId: null,
        concept: 'Alquiler',
        amount: '150000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-01-01',
        endMonth: null,
      }
      mockTx.query.expenses.findFirst.mockResolvedValue(existingExpense)

      const draft: ExpenseDraft = {
        source: { kind: 'housing' },
        concept: 'Alquiler actualizado',
        amount: '180000.00',
        currency: 'ARS',
        recurring: true,
      }

      const replacementExpense = {
        id: 'exp_rec_replacement',
        userId: 'user_1',
        sourceKind: 'housing',
        sourceId: null,
        concept: 'Alquiler actualizado',
        amount: '180000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }

      const mockUpdateSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
      mockTx.update.mockReturnValue({ set: mockUpdateSet })
      const mockInsertValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([replacementExpense]) })
      mockTx.insert.mockReturnValue({ values: mockInsertValues })

      const result = await updateExpenseInRepository('user_1', activeRecurringId, '2026-08', draft)

      expect(mockTx.update).toHaveBeenCalledWith(expenses)
      expect(mockUpdateSet).toHaveBeenCalledWith({ endMonth: '2026-08-01' })
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: 'user_1',
        sourceKind: 'housing',
        sourceId: null,
        concept: 'Alquiler actualizado',
        amount: '180000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      })
      expect(result).toEqual(replacementExpense)
    })

    it('updates in place when recurring expense started in the selected month', async () => {
      const recurringSameMonthId = 'exp_rec_current'
      const existingExpense = {
        id: recurringSameMonthId,
        userId: 'user_1',
        sourceKind: 'housing',
        sourceId: null,
        concept: 'Alquiler',
        amount: '150000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }
      mockTx.query.expenses.findFirst.mockResolvedValue(existingExpense)

      const draft: ExpenseDraft = {
        source: { kind: 'housing' },
        concept: 'Alquiler actualizado',
        amount: '170000.00',
        currency: 'ARS',
        recurring: true,
      }

      const updatedExpense = {
        ...existingExpense,
        concept: 'Alquiler actualizado',
        amount: '170000.00',
      }

      const mockUpdateWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updatedExpense]) })
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
      mockTx.update.mockReturnValue({ set: mockUpdateSet })

      const result = await updateExpenseInRepository('user_1', recurringSameMonthId, '2026-08', draft)

      expect(mockTx.update).toHaveBeenCalledWith(expenses)
      expect(mockTx.insert).not.toHaveBeenCalled()
      expect(mockUpdateSet).toHaveBeenCalledWith({
        userId: 'user_1',
        sourceKind: 'housing',
        sourceId: null,
        concept: 'Alquiler actualizado',
        amount: '170000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      })
      expect(result).toEqual(updatedExpense)
    })

    it('updates in place when expense is one-off', async () => {
      const oneOffId = 'exp_one_off'
      const existingExpense = {
        id: oneOffId,
        userId: 'user_1',
        sourceKind: 'utilities',
        sourceId: null,
        concept: 'Servicios',
        amount: '30000.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }
      mockTx.query.expenses.findFirst.mockResolvedValue(existingExpense)

      const draft: ExpenseDraft = {
        source: { kind: 'utilities' },
        concept: 'Servicios actualizados',
        amount: '35000.00',
        currency: 'ARS',
        recurring: false,
      }

      const updatedExpense = {
        ...existingExpense,
        concept: 'Servicios actualizados',
        amount: '35000.00',
      }

      const mockUpdateWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updatedExpense]) })
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
      mockTx.update.mockReturnValue({ set: mockUpdateSet })

      const result = await updateExpenseInRepository('user_1', oneOffId, '2026-08', draft)

      expect(mockTx.update).toHaveBeenCalledWith(expenses)
      expect(mockTx.insert).not.toHaveBeenCalled()
      expect(result).toEqual(updatedExpense)
    })
  })

  describe('deleteExpenseInRepository', () => {
    it('throws error when expense to delete is not found for user', async () => {
      mockTx.query.expenses.findFirst.mockResolvedValue(undefined)

      await expect(
        deleteExpenseInRepository('user_1', 'missing_expense_id', '2026-08'),
      ).rejects.toThrow('Gasto no encontrado.')
    })

    it('sets endMonth on active recurring expense when effectiveMonth < selected month', async () => {
      const activeRecurringId = 'exp_rec_active'
      const existingExpense = {
        id: activeRecurringId,
        userId: 'user_1',
        sourceKind: 'school',
        sourceId: null,
        concept: 'Colegio',
        amount: '80000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-03-01',
        endMonth: null,
      }
      mockTx.query.expenses.findFirst.mockResolvedValue(existingExpense)

      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined)
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
      mockTx.update.mockReturnValue({ set: mockUpdateSet })

      await deleteExpenseInRepository('user_1', activeRecurringId, '2026-08')

      expect(mockTx.update).toHaveBeenCalledWith(expenses)
      expect(mockUpdateSet).toHaveBeenCalledWith({ endMonth: '2026-08-01' })
      expect(mockTx.delete).not.toHaveBeenCalled()
    })

    it('deletes recurring expense row when effectiveMonth >= selected month', async () => {
      const currentRecurringId = 'exp_rec_current'
      const existingExpense = {
        id: currentRecurringId,
        userId: 'user_1',
        sourceKind: 'school',
        sourceId: null,
        concept: 'Colegio',
        amount: '80000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }
      mockTx.query.expenses.findFirst.mockResolvedValue(existingExpense)

      const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
      mockTx.delete.mockReturnValue({ where: mockDeleteWhere })

      await deleteExpenseInRepository('user_1', currentRecurringId, '2026-08')

      expect(mockTx.delete).toHaveBeenCalledWith(expenses)
      expect(mockTx.update).not.toHaveBeenCalled()
    })

    it('deletes one-off expense row directly without modifying expenseSources', async () => {
      const oneOffId = 'exp_one_off'
      const existingExpense = {
        id: oneOffId,
        userId: 'user_1',
        sourceKind: 'school',
        sourceId: null,
        concept: 'Colegio',
        amount: '80000.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-08-01',
        endMonth: null,
      }
      mockTx.query.expenses.findFirst.mockResolvedValue(existingExpense)

      const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
      mockTx.delete.mockReturnValue({ where: mockDeleteWhere })

      await deleteExpenseInRepository('user_1', oneOffId, '2026-08')

      expect(mockTx.delete).toHaveBeenCalledWith(expenses)
      expect(mockTx.delete).not.toHaveBeenCalledWith(expenseSources)
    })
  })
})
