import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDraft } from '../onboarding/repository'

export const getPublicReport = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.string() }).parse(input))
  .handler(async ({ data }) => (await getDraft(data.deviceId))?.report ?? null)
