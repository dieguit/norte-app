import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAdminSession } from './auth'
import { listDrafts, getDraft, saveDraftReport, setDraftReportSentOn } from '../onboarding/repository'
import { toAdminResult, getUploadedFiles } from './results'
import { signDownload } from '../onboarding/r2'
import { csvHeaders, toAdminCsvRow } from './csv'
import { reportSchema } from './report'

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
      fieldId: file.fieldId,
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

export const getAdminResultDetails = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession()
    const draft = await getDraft(data.deviceId)
    if (!draft) return null

    const files = Object.fromEntries(await Promise.all(
      getUploadedFiles(draft).map(async (file) => [
        file.fieldId,
        await signDownload(file.key),
      ]),
    ))
    return { draft, files }
  })

export const saveAdminReport = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid(), report: reportSchema }).parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession()
    const draft = await saveDraftReport(data.deviceId, data.report)
    if (!draft) throw new Error('Draft not found')
    return toAdminResult(draft)
  })

export const setAdminReportSent = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid(), sent: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession()
    const draft = await setDraftReportSentOn(data.deviceId, data.sent)
    if (!draft) throw new Error('Report not found')
    return toAdminResult(draft)
  })
