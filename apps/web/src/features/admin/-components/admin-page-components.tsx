import { Fragment, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatAdminDownloadLabel } from '../download-label'
import {
  type AdminFileState,
  type AdminResult,
  type ResultFilter,
  getResultStatus,
  resultFilters,
  useAdminCsvDownloads,
  useAdminLogin,
  useAdminReportControls,
  useAdminResults,
} from './admin-page-hooks'

function normalizePastedReportJson(value: string) {
  return value
    .replaceAll('├í', 'á')
    .replaceAll('├®', 'é')
    .replaceAll('├¡', 'í')
    .replaceAll('├│', 'ó')
    .replaceAll('├║', 'ú')
    .replaceAll('├▒', 'ñ')
    .replaceAll('ÔÇö', '—')
}

export function AdminLoginPage() {
  const login = useAdminLogin()
  return (
    <div className="demo-page demo-center">
      <div className="demo-panel w-full max-w-md rise-in">
        <div className="mb-6 text-center"><h1 className="demo-title text-3xl font-bold tracking-tight">Administración</h1><p className="demo-muted mt-2 text-sm">Ingresá tus credenciales para acceder</p></div>
        <form onSubmit={login.handleLoginSubmit} className="space-y-4">
          <div><label htmlFor="username-input" className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">Usuario</label><Input id="username-input" type="text" value={login.username} onChange={(e) => login.setUsername(e.target.value)} required className="w-full" /></div>
          <div><label htmlFor="password-input" className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">Contraseña</label><Input id="password-input" type="password" value={login.password} onChange={(e) => login.setPassword(e.target.value)} required className="w-full" /></div>
          {login.error && <p className="text-sm font-semibold text-error bg-error-surface border border-error-border rounded-lg p-2.5" role="alert">{login.error}</p>}
          <Button type="submit" className="w-full justify-center">Ingresar</Button>
        </form>
      </div>
    </div>
  )
}

export function AdminResultsPage() {
  const results = useAdminResults()
  const report = useAdminReportControls(results.updateResult)
  const csv = useAdminCsvDownloads(results.results?.some((result) => result.status === 'completed') ?? false)
  return <AdminResultsView results={results} report={report} csv={csv} />
}

type ResultsController = ReturnType<typeof useAdminResults>
type ReportController = ReturnType<typeof useAdminReportControls>
type CsvController = ReturnType<typeof useAdminCsvDownloads>

function AdminResultsView({
  results,
  report,
  csv,
}: {
  results: ResultsController
  report: ReportController
  csv: CsvController
}) {
  return (
    <div className="demo-page demo-center">
      <div className="demo-panel w-full max-w-7xl rise-in">
        <div className="mb-6"><h1 className="demo-title text-3xl font-bold tracking-tight">Administración</h1><p className="demo-muted mt-2 text-sm">Gestionar respuestas</p></div>
        <div className="space-y-4">
          <AdminCsvDownload csv={csv} />
          {results.results && results.results.length > 0 && <AdminResultFilters value={results.resultFilter} onChange={results.setResultFilter} />}
          <AdminResultsState results={results} report={report} csv={csv} />
        </div>
      </div>
    </div>
  )
}

function AdminCsvDownload({ csv }: { csv: CsvController }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        onClick={csv.handleDownloadAllCsv}
        disabled={csv.isDownloadingAll || !csv.hasCompletedResults}
        variant="outline"
      >
        {csv.isDownloadingAll ? 'Descargando CSV...' : 'Descargar CSV'}
      </Button>
      {csv.csvError && <p className="text-sm font-semibold text-error bg-error-surface border border-error-border rounded-lg p-2" role="alert">{csv.csvError}</p>}
    </div>
  )
}

function AdminResultFilters({ value, onChange }: { value: ResultFilter; onChange: (value: ResultFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
      {resultFilters.map((filter) => <Button key={filter.value} type="button" variant={value === filter.value ? 'default' : 'outline'} onClick={() => onChange(filter.value)} aria-pressed={value === filter.value}>{filter.label}</Button>)}
    </div>
  )
}

function AdminResultsState({
  results,
  report,
  csv,
}: {
  results: ResultsController
  report: ReportController
  csv: CsvController
}) {
  if (results.loadError) return <div role="alert" className="rounded-xl border border-error-border bg-error-surface p-6 text-center space-y-3"><p className="text-base font-semibold text-error">{results.loadError}</p><Button type="button" onClick={results.fetchResults} className="mx-auto">Reintentar</Button></div>
  if (results.isLoading) return <div role="status" aria-live="polite" className="rounded-xl border border-[var(--line)] bg-chip-bg p-6 text-center"><p className="text-base font-medium text-[var(--sea-ink-soft)] animate-pulse">Cargando resultados...</p></div>
  if (!results.results || results.visibleResults.length === 0) return <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 text-center"><p className="text-base font-medium text-[var(--sea-ink-soft)]">No se encontraron resultados.</p></div>
  return <AdminResultsTable results={results} report={report} csv={csv} />
}

function AdminResultsTable({
  results,
  report,
  csv,
}: {
  results: ResultsController
  report: ReportController
  csv: CsvController
}) {
  return (
    <div className="demo-table-shell"><table className="demo-table"><thead><tr><th scope="col" className="w-1/3">Nombre</th><th scope="col" className="w-1/3">Device ID</th><th scope="col" className="w-1/3">Estado</th></tr></thead><tbody>
      {results.visibleResults.map((device) => <AdminResultRow key={device.deviceId} device={device} results={results} report={report} csv={csv} />)}
    </tbody></table></div>
  )
}

function AdminResultRow({
  device,
  results,
  report,
  csv,
}: {
  device: AdminResult
  results: ResultsController
  report: ReportController
  csv: CsvController
}) {
  const isExpanded = results.expandedDeviceId === device.deviceId
  const deviceState = results.filesByDevice[device.deviceId] ?? { files: null, isLoading: false, error: null }
  return <Fragment><tr><td><button type="button" onClick={() => results.toggleRow(device.deviceId)} aria-expanded={isExpanded} aria-controls={`files-container-${device.deviceId}`} className="text-left font-semibold text-[var(--lagoon-deep)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-deep focus-visible:ring-offset-2 cursor-pointer">{device.name || 'Sin nombre'}</button></td><td><span className="font-mono text-sm text-[var(--sea-ink-soft)]">{device.deviceId}</span></td><td><AdminStatusPill status={getResultStatus(device)} /></td></tr>{isExpanded && <AdminExpandedResult device={device} state={deviceState} report={report} csv={csv} />}</Fragment>
}

function AdminStatusPill({ status }: { status: string }) {
  if (status === 'report-sent') return <span className="demo-pill bg-lagoon-deep/15 text-lagoon-deep border-lagoon-deep/30 font-bold">Informe Enviado</span>
  if (status === 'report-ready') return <span className="demo-pill font-bold">Informe Listo</span>
  return <span className="demo-pill font-bold">{status === 'completed' ? 'Completado' : 'Borrador'}</span>
}

function AdminExpandedResult({
  device,
  state,
  report,
  csv,
}: {
  device: AdminResult
  state: AdminFileState
  report: ReportController
  csv: CsvController
}) {
  return <tr><td colSpan={3} className="bg-chip-bg"><div id={`files-container-${device.deviceId}`} className="p-3 space-y-3"><AdminResultActions device={device} csv={csv} /><AdminFiles state={state} /><AdminReportSection device={device} report={report} /><AdminReportEditor deviceId={device.deviceId} report={report} /></div></td></tr>
}

function AdminResultActions({ device, csv }: { device: AdminResult; csv: CsvController }) {
  return <div className="flex flex-wrap items-center gap-2"><a href={`/admin/resultados/${device.deviceId}`} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 text-sm font-medium text-[var(--sea-ink)] hover:bg-[var(--chip-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-deep focus-visible:ring-offset-2">Ver resultados</a>{device.status === 'completed' && <Button type="button" onClick={() => csv.handleDownloadRowCsv(device.deviceId)} disabled={csv.downloadingDeviceId === device.deviceId} variant="outline" aria-label={`Descargar CSV para ${device.name || device.deviceId}`}>{csv.downloadingDeviceId === device.deviceId ? 'Descargando CSV...' : 'Descargar CSV'}</Button>}</div>
}

function AdminFiles({ state }: { state: AdminFileState }) {
  if (state.isLoading) return <p role="status" aria-live="polite" className="text-sm text-[var(--sea-ink-soft)] animate-pulse">Cargando archivos...</p>
  if (state.error) return <p role="alert" className="text-sm text-error font-medium">{state.error}</p>
  if (!state.files) return null
  if (state.files.length === 0) return <p className="text-sm text-[var(--sea-ink-soft)]">No se encontraron archivos.</p>
  return <div className="flex flex-col gap-2 pl-3 border-l-2 border-lagoon-deep">{state.files.map((file, idx) => <a key={idx} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-semibold text-[var(--lagoon-deep)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-deep focus-visible:ring-offset-2">{formatAdminDownloadLabel(file.fieldId, file.label)}</a>)}</div>
}

function AdminReportSection({ device, report }: { device: AdminResult; report: ReportController }) {
  return <div className="space-y-3 pt-2 border-t border-[var(--line)]"><AdminReportStatus device={device} report={report} />{device.hasReport && <AdminReportLinks device={device} report={report} />}<p className="text-sm text-[var(--sea-ink)]">Nombre: {device.name || 'Sin nombre'}</p><AdminContact device={device} report={report} /></div>
}

function AdminReportStatus({ device, report }: { device: AdminResult; report: ReportController }) {
  return <div className="flex flex-wrap items-center gap-3">{device.hasReport ? <><p className="text-sm font-semibold text-[var(--lagoon-deep)]">Informe cargado</p><Button type="button" onClick={() => report.openReportEditor(device.deviceId)} variant="outline">Reemplazar informe</Button></> : <Button type="button" onClick={() => report.openReportEditor(device.deviceId)} variant="outline">Cargar informe</Button>}<label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--sea-ink)] cursor-pointer select-none"><input type="checkbox" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-deep" checked={Boolean(device.reportSentOn)} disabled={!device.hasReport || Boolean(report.isSendingReportByDevice[device.deviceId])} onChange={(event) => report.updateSentState(device.deviceId, event.target.checked)} />Informe enviado</label>{report.sendErrorByDevice[device.deviceId] && <span role="alert" className="text-sm font-semibold text-error">{report.sendErrorByDevice[device.deviceId]}</span>}</div>
}

function AdminReportLinks({ device, report }: { device: AdminResult; report: ReportController }) {
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const reportPath = `/informe/${device.deviceId}`
  return <div className="flex flex-wrap items-center gap-3"><a href={reportPath} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 text-sm font-medium text-[var(--sea-ink)] hover:bg-[var(--chip-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon-deep focus-visible:ring-offset-2">Ver informe</a><Button type="button" onClick={() => report.handleCopyLink(device.deviceId)} variant="outline">Copiar enlace</Button><span className="font-mono text-xs text-[var(--sea-ink-soft)] break-all select-all">{origin ? `${origin}${reportPath}` : reportPath}</span>{report.copyErrorByDevice[device.deviceId] && <span role="alert" className="text-sm font-semibold text-error">{report.copyErrorByDevice[device.deviceId]}</span>}</div>
}

function AdminContact({ device, report }: { device: AdminResult; report: ReportController }) {
  return <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--sea-ink)]"><span>Método de envío: {device.contactMethod && device.contactValue ? `${device.contactMethod} ${device.contactValue}` : 'Sin contacto'}</span>{device.contactValue && <Button type="button" onClick={() => report.handleCopyContact(device.deviceId, device.contactValue!)} variant="outline">Copiar</Button>}{report.contactCopyErrorByDevice[device.deviceId] && <span role="alert" className="font-semibold text-error">{report.contactCopyErrorByDevice[device.deviceId]}</span>}</div>
}

function AdminReportEditor({ deviceId, report }: { deviceId: string; report: ReportController }) {
  if (report.editingReportDeviceId !== deviceId) return null
  return <div className="space-y-3 p-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)]"><div><label htmlFor={`report-${deviceId}`} className="block text-sm font-medium text-[var(--sea-ink)] mb-1">JSON del informe</label><textarea id={`report-${deviceId}`} value={report.reportJsonInput} onChange={(e) => report.setReportJsonInput(normalizePastedReportJson(e.target.value))} rows={6} className="w-full rounded-md border border-[var(--line)] bg-surface p-2 text-xs font-mono text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-lagoon-deep" /></div>{report.reportError && <p className="text-sm font-semibold text-error whitespace-pre-line" role="alert">{report.reportError}</p>}<div className="flex items-center gap-2"><Button type="button" onClick={() => report.handleSaveReport(deviceId)} disabled={report.isSavingReport}>Guardar informe</Button><Button type="button" onClick={report.closeReportEditor} variant="outline" disabled={report.isSavingReport}>Cancelar</Button></div></div>
}
