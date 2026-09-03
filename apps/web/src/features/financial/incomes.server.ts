import '@tanstack/react-start/server-only'
import { requireFinancialUser } from './auth.server'
import type { IncomeDraft } from './incomes.schema'
import {
  createIncomeInRepository,
  deleteIncomeInRepository,
  updateIncomeInRepository,
} from './incomes.repository.server'

export async function createIncomeServer({ data }: { data: { draft: IncomeDraft } }) {
  return createIncomeInRepository(await requireFinancialUser(), data.draft)
}

export async function updateIncomeServer({ data }: { data: { incomeId: string; draft: IncomeDraft } }) {
  return updateIncomeInRepository(await requireFinancialUser(), data.incomeId, data.draft)
}

export async function deleteIncomeServer({ data }: { data: { incomeId: string } }) {
  return deleteIncomeInRepository(await requireFinancialUser(), data.incomeId)
}
