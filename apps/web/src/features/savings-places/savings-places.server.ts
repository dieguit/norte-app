import '@tanstack/react-start/server-only'
import { SavingsPlaceMutationResponseSchema, SavingsTransferResponseSchema } from '@repo/shared-types'
import { mutateFinancialApi } from '../financial/financial.server'

export async function createSavingsPlaceServer({ data }: { data: { name: string } }) {
  const response = await mutateFinancialApi(
    '/savings-places',
    'POST',
    data,
    'No se pudo guardar el lugar de ahorro.',
  )
  return SavingsPlaceMutationResponseSchema.parse(await response.json())
}

export async function renameSavingsPlaceServer({ data }: { data: { placeId: string; name: string } }) {
  await mutateFinancialApi(
    `/savings-places/${data.placeId}`,
    'PATCH',
    { name: data.name },
    'No se pudo guardar el lugar de ahorro.',
  )
}

export async function deleteSavingsPlaceServer({ data }: { data: { placeId: string } }) {
  await mutateFinancialApi(
    `/savings-places/${data.placeId}`,
    'DELETE',
    undefined,
    'No se pudo guardar el lugar de ahorro.',
  )
}

export async function transferSavingsServer({ data }: { data: { fromPlaceId: string; toPlaceId: string; currency: 'ARS' | 'USD'; amount: string } }) {
  const response = await mutateFinancialApi(
    '/savings-places/transfers',
    'POST',
    data,
    'No se pudo guardar el lugar de ahorro.',
  )
  return SavingsTransferResponseSchema.parse(await response.json())
}
