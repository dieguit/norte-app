import '@tanstack/react-start/server-only'
import { requireAdminSession } from './auth.server'
import { listDrafts, getDraft, saveDraftReport, setDraftReportSentOn } from '@/features/onboarding/repository.server'
import { toAdminResult, getUploadedFiles } from './results'
import { signDownload } from '@/features/onboarding/r2.server'
import { csvHeaders, toAdminCsvRow } from './csv'
import type { Report } from './report'

export async function listAdminResultsServer() {
  await requireAdminSession()
  return (await listDrafts()).map(toAdminResult)
}

export async function getAdminResultFilesServer(deviceId: string) {
  await requireAdminSession()
  const draft = await getDraft(deviceId)
  if (!draft) throw new Error('Draft not found')
  return Promise.all(getUploadedFiles(draft).map(async (file) => ({
    fieldId: file.fieldId,
    label: file.label,
    url: await signDownload(file.key),
  })))
}

export async function listAdminCsvRowsServer() {
  await requireAdminSession()
  const rows = (await listDrafts())
    .filter((draft) => draft.completedAt)
    .map(toAdminCsvRow)
  return { headers: csvHeaders, rows }
}

export async function getAdminCsvRowServer(deviceId: string) {
  await requireAdminSession()
  const draft = await getDraft(deviceId)
  if (!draft?.completedAt) throw new Error('Completed draft not found')
  return { headers: csvHeaders, rows: [toAdminCsvRow(draft)] }
}

export async function getAdminResultDetailsServer(deviceId: string) {
  await requireAdminSession()
  const draft = await getDraft(deviceId)
  if (!draft) return null

  const files = Object.fromEntries(await Promise.all(
    getUploadedFiles(draft).map(async (file) => [
      file.fieldId,
      await signDownload(file.key),
    ]),
  ))
  return { draft, files }
}

export async function saveAdminReportServer(deviceId: string, report: Report) {
  await requireAdminSession()
  const draft = await saveDraftReport(deviceId, report)
  if (!draft) throw new Error('Draft not found')
  return toAdminResult(draft)
}

export async function setAdminReportSentServer(deviceId: string, sent: boolean) {
  await requireAdminSession()
  const draft = await setDraftReportSentOn(deviceId, sent)
  if (!draft) throw new Error('Report not found')
  return toAdminResult(draft)
}
