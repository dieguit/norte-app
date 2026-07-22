import { useState, useEffect, Fragment } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { loginAdmin } from '../admin/auth'
import { listAdminResults, getAdminResultFiles, listAdminCsvRows, getAdminCsvRow } from '../admin/server'
import { serializeCsv } from '../admin/csv'

export function AdminPage({ authenticated }: { authenticated: boolean }) {
  // Login form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Results tab state
  const [results, setResults] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null)
  const [filesByDevice, setFilesByDevice] = useState<Record<string, {
    files: any[] | null
    isLoading: boolean
    error: string | null
  }>>({})
  const [csvError, setCsvError] = useState<string | null>(null)

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
    setCsvError(null)
    try {
      const { headers, rows } = await listAdminCsvRows()
      downloadCsv(headers, rows, 'norte-respuestas.csv')
    } catch (err) {
      setCsvError('Error al descargar el CSV.')
    }
  }

  async function handleDownloadRowCsv(deviceId: string, name: string | null) {
    setCsvError(null)
    try {
      const { headers, rows } = await getAdminCsvRow({ data: { deviceId } })
      const suffix = name ? `${deviceId}-${name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}` : deviceId
      downloadCsv(headers, rows, `norte-${suffix}.csv`)
    } catch (err) {
      setCsvError('Error al descargar el CSV.')
    }
  }

  async function fetchResults() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await listAdminResults()
      setResults(res)
    } catch (err) {
      setLoadError('Error al cargar los resultados.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchResults()
    }
  }, [authenticated])

  async function toggleRow(deviceId: string) {
    if (expandedDeviceId === deviceId) {
      setExpandedDeviceId(null)
      return
    }

    setExpandedDeviceId(deviceId)

    const current = filesByDevice[deviceId]
    if (!current || (!current.files && !current.isLoading && !current.error)) {
      setFilesByDevice((prev) => ({
        ...prev,
        [deviceId]: { files: null, isLoading: true, error: null },
      }))
      try {
        const files = await getAdminResultFiles({ data: { deviceId } })
        setFilesByDevice((prev) => ({
          ...prev,
          [deviceId]: { files, isLoading: false, error: null },
        }))
      } catch (err) {
        setFilesByDevice((prev) => ({
          ...prev,
          [deviceId]: { files: null, isLoading: false, error: 'Error al cargar archivos.' },
        }))
      }
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await loginAdmin({ data: { username, password } })
      if (res.ok) {
        window.location.reload()
      } else {
        setError('Usuario o contraseña incorrectos.')
      }
    } catch (err) {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  if (!authenticated) {
    return (
      <div className="demo-page demo-center">
        <div className="demo-panel w-full max-w-md rise-in">
          <div className="mb-6 text-center">
            <h1 className="demo-title text-3xl font-bold tracking-tight">Administración</h1>
            <p className="demo-muted mt-2 text-sm">Ingresá tus credenciales para acceder</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="username-input" className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                Usuario
              </label>
              <Input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                Contraseña
              </label>
              <Input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {error && (
              <p className="text-sm font-semibold text-[var(--error)] bg-[var(--error-surface)] border border-[var(--error-border)] rounded-lg p-2.5" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full justify-center">
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-page demo-center">
      <div className="demo-panel w-full max-w-[1200px] rise-in">
        <div className="mb-6">
          <h1 className="demo-title text-3xl font-bold tracking-tight">Administración</h1>
          <p className="demo-muted mt-2 text-sm">Gestionar respuestas</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-end gap-2">
            <Button type="button" onClick={handleDownloadAllCsv} variant="outline">
              Descargar CSV
            </Button>
            {csvError && (
              <p className="text-sm font-semibold text-[var(--error)] bg-[var(--error-surface)] border border-[var(--error-border)] rounded-lg p-2" role="alert">
                {csvError}
              </p>
            )}
          </div>

          {loadError ? (
            <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-surface)] p-6 text-center space-y-3">
              <p className="text-base font-semibold text-[var(--error)]">
                {loadError}
              </p>
              <Button type="button" onClick={fetchResults} className="mx-auto">
                Reintentar
              </Button>
            </div>
          ) : isLoading ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 text-center">
              <p className="text-base font-medium text-[var(--sea-ink-soft)] animate-pulse">
                Cargando resultados...
              </p>
            </div>
          ) : !results || results.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 text-center">
              <p className="text-base font-medium text-[var(--sea-ink-soft)]">
                No se encontraron resultados.
              </p>
            </div>
          ) : (
            <div className="demo-table-shell">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th scope="col" className="w-1/3">Nombre</th>
                    <th scope="col" className="w-1/3">Device ID</th>
                    <th scope="col" className="w-1/3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((device) => {
                    const isExpanded = expandedDeviceId === device.deviceId
                    const deviceState = filesByDevice[device.deviceId] || {
                      files: null,
                      isLoading: false,
                      error: null,
                    }
                    return (
                      <Fragment key={device.deviceId}>
                        <tr>
                          <td>
                            <button
                              type="button"
                              onClick={() => toggleRow(device.deviceId)}
                              aria-expanded={isExpanded}
                              aria-controls={`files-container-${device.deviceId}`}
                              className="text-left font-semibold text-[var(--lagoon-deep)] hover:underline focus:outline-none cursor-pointer"
                            >
                              {device.name || 'Sin nombre'}
                            </button>
                          </td>
                          <td>
                            <span className="font-mono text-sm text-[var(--sea-ink-soft)]">
                              {device.deviceId}
                            </span>
                          </td>
                          <td>
                            <span className="demo-pill font-bold">
                              {device.status === 'completed' ? 'Completado' : 'Borrador'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={3} className="bg-[color-mix(in_oklab,var(--chip-bg)_92%,black_8%)] dark:bg-[color-mix(in_oklab,var(--chip-bg)_92%,white_8%)]">
                              <div id={`files-container-${device.deviceId}`} className="p-2 space-y-2">
                                {device.status === 'completed' && (
                                  <Button
                                    type="button"
                                    onClick={() => handleDownloadRowCsv(device.deviceId, device.name)}
                                    variant="outline"
                                    aria-label={`Descargar CSV para ${device.name || device.deviceId}`}
                                  >
                                    Descargar CSV
                                  </Button>
                                )}
                                {deviceState.isLoading && (
                                  <p className="text-sm text-[var(--sea-ink-soft)] animate-pulse">
                                    Cargando archivos...
                                  </p>
                                )}
                                {deviceState.error && (
                                  <p className="text-sm text-[var(--error)] font-medium">
                                    {deviceState.error}
                                  </p>
                                )}
                                {!deviceState.isLoading && !deviceState.error && deviceState.files && (
                                  deviceState.files.length === 0 ? (
                                    <p className="text-sm text-[var(--sea-ink-soft)]">
                                      No se encontraron archivos.
                                    </p>
                                  ) : (
                                    <div className="flex flex-col gap-2 pl-3 border-l-2 border-[var(--lagoon-deep)]">
                                      {deviceState.files.map((file: any, idx: number) => (
                                        <a
                                          key={idx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center text-sm font-semibold text-[var(--lagoon-deep)] hover:underline"
                                        >
                                          Descargar {file.label}
                                        </a>
                                      ))}
                                    </div>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
