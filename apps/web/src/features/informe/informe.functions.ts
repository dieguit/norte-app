import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getPublicReportServer, markPublicReportCtaClickedServer } from './informe.server'

export const getPublicReport = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.string() }).parse(input))
  .handler(({ data }) => getPublicReportServer(data.deviceId))

export const markPublicReportCtaClicked = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.string() }).parse(input))
  .handler(({ data }) => markPublicReportCtaClickedServer(data.deviceId))
