import { useEffect, useRef, useState } from 'react'
import { getAdminResultFiles, listAdminResults } from '../admin.functions'

export type AdminResult = {
  deviceId: string
  name: string | null
  contactMethod: string | null
  contactValue: string | null
  status: string
  hasReport: boolean
  reportSentOn: unknown
}

type AdminFile = {
  fieldId: string
  label: string
  url: string
}

export type AdminFileState = {
  files: AdminFile[] | null
  isLoading: boolean
  error: string | null
}

export function getResultStatus(device: Pick<AdminResult, 'status' | 'hasReport' | 'reportSentOn'>) {
  if (device.reportSentOn) return 'report-sent'
  if (device.hasReport) return 'report-ready'
  return device.status === 'completed' ? 'completed' : 'draft'
}

export function useAdminResultLoading() {
  const [results, setResults] = useState<AdminResult[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const requestId = useRef(0)
  const mounted = useRef(true)

  async function fetchResults() {
    const currentRequestId = ++requestId.current
    setIsLoading(true)
    setLoadError(null)
    try {
      const nextResults = await listAdminResults()
      if (mounted.current && currentRequestId === requestId.current) setResults(nextResults)
    } catch {
      if (mounted.current && currentRequestId === requestId.current) setLoadError('Error al cargar los resultados.')
    } finally {
      if (mounted.current && currentRequestId === requestId.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
    return () => {
      mounted.current = false
    }
  }, [])

  return { results, setResults, isLoading, loadError, fetchResults }
}

export function useAdminResultRowToggle() {
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null)
  const [filesByDevice, setFilesByDevice] = useState<Record<string, AdminFileState>>({})
  const requestIds = useRef<Record<string, number>>({})
  const mounted = useRef(true)

  useEffect(() => () => {
    mounted.current = false
  }, [])

  async function loadFiles(deviceId: string, currentRequestId: number) {
    try {
      const files = await getAdminResultFiles({ data: { deviceId } })
      if (mounted.current && currentRequestId === requestIds.current[deviceId]) {
        setFilesByDevice((prev) => ({ ...prev, [deviceId]: { files, isLoading: false, error: null } }))
      }
    } catch {
      if (mounted.current && currentRequestId === requestIds.current[deviceId]) {
        setFilesByDevice((prev) => ({
          ...prev,
          [deviceId]: { files: null, isLoading: false, error: 'Error al cargar archivos.' },
        }))
      }
    }
  }

  async function toggleRow(deviceId: string) {
    if (expandedDeviceId === deviceId) {
      requestIds.current[deviceId] = (requestIds.current[deviceId] ?? 0) + 1
      setExpandedDeviceId(null)
      setFilesByDevice((prev) => ({
        ...prev,
        [deviceId]: { files: null, isLoading: false, error: null },
      }))
      return
    }
    setExpandedDeviceId(deviceId)
    const current = filesByDevice[deviceId]
    if (!current || current.error || (!current.files && !current.isLoading)) {
      const currentRequestId = (requestIds.current[deviceId] ?? 0) + 1
      requestIds.current[deviceId] = currentRequestId
      setFilesByDevice((prev) => ({
        ...prev,
        [deviceId]: { files: null, isLoading: true, error: null },
      }))
      void loadFiles(deviceId, currentRequestId)
    }
  }

  return { expandedDeviceId, filesByDevice, toggleRow }
}
