import '@tanstack/react-start/server-only'
import {
  BenefitCatalogResponseSchema,
  BenefitPreferencesSchema,
  type BenefitPreferences,
  type UpdateBenefitPreferences,
} from '@repo/shared-types'
import { callFinancialApi, mutateFinancialApi, throwFinancialApiError } from '../financial/financial.server'

export async function getBenefitsPageServer() {
  const [catalog, preferences] = await Promise.all([
    callFinancialApi('/benefits/catalog'),
    callFinancialApi('/me/benefits/preferences'),
  ])
  if (!catalog.ok) await throwFinancialApiError(catalog, 'No pudimos cargar los beneficios.')
  if (!preferences.ok) await throwFinancialApiError(preferences, 'No pudimos cargar tus beneficios.')
  return {
    catalog: BenefitCatalogResponseSchema.parse(await catalog.json()),
    preferences: BenefitPreferencesSchema.parse(await preferences.json()),
  }
}

export async function saveBenefitPreferencesServer({ data }: { data: UpdateBenefitPreferences }): Promise<BenefitPreferences> {
  const response = await mutateFinancialApi('/me/benefits/preferences', 'PUT', data, 'No pudimos guardar tus beneficios.')
  return BenefitPreferencesSchema.parse(await response.json())
}

export async function setBenefitDigestEnabledServer({ data }: { data: { enabled: boolean } }): Promise<void> {
  await mutateFinancialApi('/me/notifications/savings_digest', 'PATCH', data, 'No pudimos cambiar los avisos.')
}
