import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAdminSession } from './auth'
import { listDrafts, getDraft } from '../onboarding/repository'
import { toAdminResult, getUploadedFiles } from './results'
import { signDownload } from '../onboarding/r2'
import { csvHeaders, toAdminCsvRow } from './csv'

export const listAdminResults = createServerFn({ method: 'GET' })
  .handler(async () => {
    await requireAdminSession()
    return (await listDrafts()).map(toAdminResult)
  })

export const getAdminResultFiles = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession()
    const draft = await getDraft(data.deviceId)
    if (!draft) throw new Error('Draft not found')
    return Promise.all(getUploadedFiles(draft).map(async (file) => ({
      label: file.label,
      url: await signDownload(file.key),
    })))
  })

export const listAdminCsvRows = createServerFn({ method: 'GET' })
  .handler(async () => {
    await requireAdminSession()
    const rows = (await listDrafts())
      .filter((draft) => draft.completedAt)
      .map(toAdminCsvRow)
    return { headers: csvHeaders, rows }
  })

export const getAdminCsvRow = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession()
    const draft = await getDraft(data.deviceId)
    if (!draft?.completedAt) throw new Error('Completed draft not found')
    return { headers: csvHeaders, rows: [toAdminCsvRow(draft)] }
  })
