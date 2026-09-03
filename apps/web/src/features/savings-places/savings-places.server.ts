import '@tanstack/react-start/server-only'
import { requireFinancialUser } from '../financial/auth.server'
import {
  createSavingsPlaceInRepository,
  deleteSavingsPlaceInRepository,
  renameSavingsPlaceInRepository,
  transferSavingsInRepository,
} from './savings-places.repository.server'

export async function createSavingsPlaceServer({ data }: { data: { name: string } }) {
  return createSavingsPlaceInRepository(await requireFinancialUser(), data.name)
}

export async function renameSavingsPlaceServer({
  data,
}: {
  data: { placeId: string; name: string }
}) {
  return renameSavingsPlaceInRepository(await requireFinancialUser(), data.placeId, data.name)
}

export async function deleteSavingsPlaceServer({ data }: { data: { placeId: string } }) {
  return deleteSavingsPlaceInRepository(await requireFinancialUser(), data.placeId)
}

export async function transferSavingsServer({
  data,
}: {
  data: {
    fromPlaceId: string
    toPlaceId: string
    currency: 'ARS' | 'USD'
    amount: string
  }
}) {
  return transferSavingsInRepository({ ...data, userId: await requireFinancialUser() })
}
