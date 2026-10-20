import '@tanstack/react-start/server-only'
import { IncomeMutationResponseSchema } from '@repo/shared-types'
import { callFinancialApi } from './financial.server'
import type { IncomeDraft } from './incomes.schema'

async function mutate(path: string, method: string, body?: unknown) {
  const response = await callFinancialApi(path, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? 'No se pudo guardar el ingreso.')
  }
  return response
}

export async function createIncomeServer({
  data,
}: {
  data: { draft: IncomeDraft }
}) {
  const response = await mutate('/incomes', 'POST', data)
  return IncomeMutationResponseSchema.parse(await response.json())
}

export async function updateIncomeServer({
  data,
}: {
  data: { incomeId: string; draft: IncomeDraft }
}) {
  const { incomeId, ...body } = data
  const response = await mutate(`/incomes/${incomeId}`, 'PATCH', body)
  return IncomeMutationResponseSchema.parse(await response.json())
}

export async function deleteIncomeServer({
  data,
}: {
  data: { incomeId: string }
}) {
  await mutate(`/incomes/${data.incomeId}`, 'DELETE')
}
