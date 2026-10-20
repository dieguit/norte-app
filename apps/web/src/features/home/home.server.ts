import '@tanstack/react-start/server-only'
import {
  HomeRoadmapResponseSchema,
  type HomeRoadmapResponse,
} from '@repo/shared-types'
import { callFinancialApi } from '../financial/financial.server'

export async function getHomeRoadmapServer(
  currentMonth?: string,
): Promise<HomeRoadmapResponse> {
  const query = currentMonth
    ? `?currentMonth=${encodeURIComponent(currentMonth)}`
    : ''
  const response = await callFinancialApi(`/home${query}`)
  if (!response.ok) throw new Error('No se pudo cargar la hoja de ruta.')
  return HomeRoadmapResponseSchema.parse(await response.json())
}
