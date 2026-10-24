import { createServerFn } from '@tanstack/react-start'
import { UpdateBenefitPreferencesSchema } from '@repo/shared-types'
import { z } from 'zod'
import { getBenefitsPageServer, saveBenefitPreferencesServer, setBenefitDigestEnabledServer } from './benefits.server'

export const getBenefitsPage = createServerFn({ method: 'GET' }).handler(getBenefitsPageServer)

export const saveBenefitPreferences = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdateBenefitPreferencesSchema.parse(input))
  .handler(saveBenefitPreferencesServer)

export const setBenefitDigestEnabled = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(setBenefitDigestEnabledServer)
