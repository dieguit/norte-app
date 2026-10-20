import '@tanstack/react-start/server-only'
import {
  SavingContributionConfirmationSchema,
  SavingContributionContextStateSchema,
  SavingContributionDeletedSchema,
  SavingContributionEditPreviewSchema,
  SavingContributionPreviewSchema,
  SavingContributionUpdatedSchema,
  type ConfirmSavingContributionWire,
  type SavingContributionContextState,
  type SavingContributionDraftWire,
  type UpdateSavingContributionWire,
} from '@repo/shared-types'
import { callFinancialApi, throwFinancialApiError } from '../financial/financial.server'
import type { SavingContributionPreviewResult } from './saving-contribution'

const jsonHeaders = { 'Content-Type': 'application/json' }

export async function getSavingContributionContextServer(): Promise<SavingContributionContextState> {
  const response = await callFinancialApi('/contributions/saving/context')
  if (!response.ok) throw new Error('No se pudo cargar el contexto para registrar un ahorro.')
  return SavingContributionContextStateSchema.parse(await response.json())
}

export async function previewSavingContributionServer({
  data,
}: {
  data: SavingContributionDraftWire
}): Promise<SavingContributionPreviewResult> {
  const response = await callFinancialApi('/contributions/saving/preview', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) })
  if (!response.ok) return throwFinancialApiError(response, 'No pudimos calcular la vista previa.')
  return SavingContributionPreviewSchema.parse(await response.json()) as SavingContributionPreviewResult
}

export async function previewSavingContributionEditServer({
  data,
}: {
  data: { contributionId: string; draft: SavingContributionDraftWire }
}): Promise<SavingContributionPreviewResult> {
  const response = await callFinancialApi(`/contributions/saving/${encodeURIComponent(data.contributionId)}/preview`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data.draft),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No pudimos calcular la vista previa.')
  const { preview } = SavingContributionEditPreviewSchema.parse(await response.json())
  return { preview }
}

export async function confirmSavingContributionServer({
  data,
}: {
  data: ConfirmSavingContributionWire
}): Promise<
  | { status: 'created'; contributionId: string }
  | { status: 'stale'; preview: SavingContributionPreviewResult }
> {
  const response = await callFinancialApi('/contributions/saving', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo registrar el ahorro.')
  return SavingContributionConfirmationSchema.parse(await response.json()) as
    | { status: 'created'; contributionId: string }
    | { status: 'stale'; preview: SavingContributionPreviewResult }
}

export async function updateSavingContributionServer({
  data,
}: {
  data: { contributionId: string } & UpdateSavingContributionWire
}): Promise<{ status: 'updated' }> {
  const response = await callFinancialApi(`/contributions/saving/${encodeURIComponent(data.contributionId)}`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({ draft: data.draft }),
  })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo actualizar el ahorro.')
  return SavingContributionUpdatedSchema.parse(await response.json())
}

export async function deleteSavingContributionServer({
  data,
}: {
  data: { contributionId: string }
}): Promise<{ status: 'deleted' }> {
  const response = await callFinancialApi(`/contributions/saving/${encodeURIComponent(data.contributionId)}`, { method: 'DELETE' })
  if (!response.ok) return throwFinancialApiError(response, 'No se pudo eliminar el ahorro.')
  return SavingContributionDeletedSchema.parse(await response.json())
}
