import '@tanstack/react-start/server-only'
import { SavingsPlaceMutationResponseSchema, SavingsTransferResponseSchema } from '@repo/shared-types'
import { callFinancialApi } from '../financial/financial.server'

async function mutate(path: string, method: string, body?: unknown) {
  const response = await callFinancialApi(path, {
    method,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? 'No se pudo guardar el lugar de ahorro.')
  }
  return response
}

export async function createSavingsPlaceServer({ data }: { data: { name: string } }) {
  const response = await mutate('/savings-places', 'POST', data)
  return SavingsPlaceMutationResponseSchema.parse(await response.json())
}

export async function renameSavingsPlaceServer({ data }: { data: { placeId: string; name: string } }) {
  await mutate(`/savings-places/${data.placeId}`, 'PATCH', { name: data.name })
}

export async function deleteSavingsPlaceServer({ data }: { data: { placeId: string } }) {
  await mutate(`/savings-places/${data.placeId}`, 'DELETE')
}

export async function transferSavingsServer({ data }: { data: { fromPlaceId: string; toPlaceId: string; currency: 'ARS' | 'USD'; amount: string } }) {
  const response = await mutate('/savings-places/transfers', 'POST', data)
  return SavingsTransferResponseSchema.parse(await response.json())
}
