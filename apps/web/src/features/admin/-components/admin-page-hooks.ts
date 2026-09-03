import { useState } from 'react'
import { usePostHog } from '@posthog/react'
import {
  getAdminCsvRow,
  listAdminCsvRows,
  loginAdmin,
} from '../admin.functions'
import { serializeCsv } from '../csv'
import {
  getResultStatus,
  useAdminResultLoading,
  useAdminResultRowToggle,
} from './admin-results-hooks'
import type { AdminResult, AdminFileState } from './admin-results-hooks'
import {
  useAdminReportClipboard,
  useAdminReportDelivery,
  useAdminReportEditor,
} from './admin-report-hooks'

export type ResultFilter = 'all' | 'draft' | 'completed' | 'report-ready' | 'report-sent'

export const resultFilters: { value: ResultFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'completed', label: 'Completado' },
  { value: 'report-ready', label: 'Informe Listo' },
  { value: 'report-sent', label: 'Informe Enviado' },
]

export { getResultStatus }
export type { AdminFileState, AdminResult }

export function useAdminLogin() {
  const posthog = usePostHog()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await loginAdmin({ data: { username, password } })
      if (res.ok) {
        try {
          ;(posthog as any)?.optOut()
        } catch {}
        window.location.reload()
      } else {
        setError('Usuario o contraseña incorrectos.')
      }
    } catch {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return { username, setUsername, password, setPassword, error, handleLoginSubmit }
}

export function useAdminResults() {
  const loading = useAdminResultLoading()
  const rows = useAdminResultRowToggle()
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')

  function updateResult(updated: AdminResult) {
    loading.setResults((current) => current?.map((result) =>
      result.deviceId === updated.deviceId ? updated : result,
    ) ?? null)
  }

  const visibleResults = loading.results?.filter((device) =>
    resultFilter === 'all' || getResultStatus(device) === resultFilter,
  ) ?? []

  return {
    results: loading.results,
    visibleResults,
    isLoading: loading.isLoading,
    loadError: loading.loadError,
    expandedDeviceId: rows.expandedDeviceId,
    filesByDevice: rows.filesByDevice,
    resultFilter,
    setResultFilter,
    updateResult,
    fetchResults: loading.fetchResults,
    toggleRow: rows.toggleRow,
  }
}

export function useAdminReportControls(updateResult: (updated: AdminResult) => void) {
  const editor = useAdminReportEditor(updateResult)
  const delivery = useAdminReportDelivery(updateResult)
  const clipboard = useAdminReportClipboard()
  return { ...editor, ...delivery, ...clipboard }
}

export function useAdminCsvDownloads(hasCompletedResults: boolean) {
  const [csvError, setCsvError] = useState<string | null>(null)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [downloadingDeviceId, setDownloadingDeviceId] = useState<string | null>(null)

  function downloadCsv(headers: readonly string[], rows: Record<string, any>[], filename: string) {
    const blob = new Blob([serializeCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadAllCsv() {
    if (!hasCompletedResults || isDownloadingAll) return
    setCsvError(null)
    setIsDownloadingAll(true)
    try {
      const { headers, rows } = await listAdminCsvRows()
      downloadCsv(headers, rows, 'norte-respuestas.csv')
    } catch {
      setCsvError('Error al descargar el CSV.')
    } finally {
      setIsDownloadingAll(false)
    }
  }

  async function handleDownloadRowCsv(deviceId: string) {
    if (downloadingDeviceId === deviceId) return
    setCsvError(null)
    setDownloadingDeviceId(deviceId)
    try {
      const { headers, rows } = await getAdminCsvRow({ data: { deviceId } })
      downloadCsv(headers, rows, `norte-${deviceId}.csv`)
    } catch {
      setCsvError('Error al descargar el CSV.')
    } finally {
      setDownloadingDeviceId(null)
    }
  }

  return {
    csvError,
    hasCompletedResults,
    isDownloadingAll,
    downloadingDeviceId,
    handleDownloadAllCsv,
    handleDownloadRowCsv,
  }
}
