import { useState } from 'react'
import {
  saveAdminReport,
  setAdminReportSent,
} from '../admin.functions'
import { reportSchema } from '../report'
import type { AdminResult } from './admin-results-hooks'

export function useAdminReportEditor(updateResult: (updated: AdminResult) => void) {
  const [editingReportDeviceId, setEditingReportDeviceId] = useState<string | null>(null)
  const [reportJsonInput, setReportJsonInput] = useState('')
  const [reportError, setReportError] = useState<string | null>(null)
  const [isSavingReport, setIsSavingReport] = useState(false)

  function openReportEditor(deviceId: string) {
    setEditingReportDeviceId(deviceId)
    setReportJsonInput('')
    setReportError(null)
  }

  function closeReportEditor() {
    setEditingReportDeviceId(null)
    setReportJsonInput('')
    setReportError(null)
  }

  async function handleSaveReport(deviceId: string) {
    setReportError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(reportJsonInput)
    } catch {
      setReportError('El informe debe ser un JSON válido.')
      return
    }
    const validation = reportSchema.safeParse(parsed)
    if (!validation.success) {
      setReportError(validation.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'))
      return
    }
    setIsSavingReport(true)
    try {
      updateResult(await saveAdminReport({ data: { deviceId, report: validation.data } }))
      closeReportEditor()
    } catch {
      setReportError('No se pudo guardar el informe. Intentá nuevamente.')
    } finally {
      setIsSavingReport(false)
    }
  }

  return {
    editingReportDeviceId,
    reportJsonInput,
    setReportJsonInput,
    reportError,
    isSavingReport,
    openReportEditor,
    closeReportEditor,
    handleSaveReport,
  }
}

export function useAdminReportDelivery(updateResult: (updated: AdminResult) => void) {
  const [isSendingReportByDevice, setIsSendingReportByDevice] = useState<Record<string, boolean>>({})
  const [sendErrorByDevice, setSendErrorByDevice] = useState<Record<string, string | null>>({})

  async function updateSentState(deviceId: string, sent: boolean) {
    setSendErrorByDevice((prev) => ({ ...prev, [deviceId]: null }))
    setIsSendingReportByDevice((prev) => ({ ...prev, [deviceId]: true }))
    try {
      updateResult(await setAdminReportSent({ data: { deviceId, sent } }))
    } catch {
      setSendErrorByDevice((prev) => ({
        ...prev,
        [deviceId]: 'No se pudo actualizar el estado de envío.',
      }))
    } finally {
      setIsSendingReportByDevice((prev) => ({ ...prev, [deviceId]: false }))
    }
  }

  return { isSendingReportByDevice, sendErrorByDevice, updateSentState }
}

export function useAdminReportClipboard() {
  const [copyErrorByDevice, setCopyErrorByDevice] = useState<Record<string, string | null>>({})
  const [contactCopyErrorByDevice, setContactCopyErrorByDevice] = useState<Record<string, string | null>>({})

  async function handleCopyLink(deviceId: string) {
    setCopyErrorByDevice((prev) => ({ ...prev, [deviceId]: null }))
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/informe/${deviceId}`)
    } catch {
      setCopyErrorByDevice((prev) => ({ ...prev, [deviceId]: 'No se pudo copiar el enlace.' }))
    }
  }

  async function handleCopyContact(deviceId: string, contactValue: string) {
    setContactCopyErrorByDevice((prev) => ({ ...prev, [deviceId]: null }))
    try {
      await navigator.clipboard.writeText(contactValue)
    } catch {
      setContactCopyErrorByDevice((prev) => ({ ...prev, [deviceId]: 'No se pudo copiar el contacto.' }))
    }
  }

  return { copyErrorByDevice, contactCopyErrorByDevice, handleCopyLink, handleCopyContact }
}
