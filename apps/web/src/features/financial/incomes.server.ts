import '@tanstack/react-start/server-only'
import { IncomeMutationResponseSchema } from '@repo/shared-types'
import { mutateFinancialApi } from './financial.server'
import type { IncomeDraft } from './incomes.schema'

export async function createIncomeServer({
  data,
}: {
  data: { draft: IncomeDraft }
}) {
  const response = await mutateFinancialApi(
    '/incomes',
    'POST',
    data,
    'No se pudo guardar el ingreso.',
  )
  return IncomeMutationResponseSchema.parse(await response.json())
}

export async function updateIncomeServer({
  data,
}: {
  data: { incomeId: string; draft: IncomeDraft }
}) {
  const { incomeId, ...body } = data
  const response = await mutateFinancialApi(
    `/incomes/${incomeId}`,
    'PATCH',
    body,
    'No se pudo guardar el ingreso.',
  )
  return IncomeMutationResponseSchema.parse(await response.json())
}

export async function deleteIncomeServer({
  data,
}: {
  data: { incomeId: string }
}) {
  await mutateFinancialApi(
    `/incomes/${data.incomeId}`,
    'DELETE',
    undefined,
    'No se pudo guardar el ingreso.',
  )
}
