import '@tanstack/react-start/server-only'
import { requireFinancialUser } from './auth.server'
import type { CreateExpenseInput, DeleteExpenseInput, UpdateExpenseInput } from './expenses.schema'
import {
  createExpenseInRepository,
  deleteExpenseInRepository,
  updateExpenseInRepository,
} from './expenses.repository.server'

export async function createExpenseServer({ data }: { data: CreateExpenseInput }) {
  return createExpenseInRepository(await requireFinancialUser(), data.draft, data.effectiveMonth)
}

export async function updateExpenseServer({ data }: { data: UpdateExpenseInput }) {
  return updateExpenseInRepository(
    await requireFinancialUser(),
    data.expenseId,
    data.effectiveMonth,
    data.draft,
  )
}

export async function deleteExpenseServer({ data }: { data: DeleteExpenseInput }) {
  return deleteExpenseInRepository(
    await requireFinancialUser(),
    data.expenseId,
    data.effectiveMonth,
  )
}
