// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPage } from './admin-page'
import { loginAdmin } from '../admin/auth'
import { listAdminResults, getAdminResultFiles, listAdminCsvRows, getAdminCsvRow, saveAdminReport, setAdminReportSent } from '../admin/server'
import { csvHeaders } from '../admin/csv'

const posthogOptOut = vi.fn()

vi.mock('@posthog/react', () => ({
  usePostHog: () => ({ optOut: posthogOptOut }),
}))

vi.mock('../admin/auth', () => ({
  loginAdmin: vi.fn(),
  getAdminSession: vi.fn(),
}))

vi.mock('../admin/server', () => ({
  listAdminResults: vi.fn(),
  getAdminResultFiles: vi.fn(),
  listAdminCsvRows: vi.fn(),
  getAdminCsvRow: vi.fn(),
  saveAdminReport: vi.fn(),
  setAdminReportSent: vi.fn(),
}))

describe('AdminPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('submits the Spanish login form and reports invalid credentials', async () => {
    vi.mocked(loginAdmin).mockResolvedValue({ ok: false })

    render(<AdminPage authenticated={false} />)
    await userEvent.setup().type(screen.getByLabelText('Usuario'), 'admin')
    await userEvent.setup().type(screen.getByLabelText('Contraseña'), 'wrong')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
    expect(loginAdmin).toHaveBeenCalledWith({
      data: { username: 'admin', password: 'wrong' },
    })
  })

  it('disables analytics after a successful admin login', async () => {
    vi.mocked(loginAdmin).mockResolvedValue({ ok: true })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock }
    })

    render(<AdminPage authenticated={false} />)
    await userEvent.setup().type(screen.getByLabelText('Usuario'), 'admin')
    await userEvent.setup().type(screen.getByLabelText('Contraseña'), 'N0rt3!')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(posthogOptOut).toHaveBeenCalledOnce()
    expect(reloadMock).toHaveBeenCalledOnce()
  })

  describe('Results view', () => {
    it('displays the list of results and handles expansion with download links', async () => {
      // Mock URL methods
      const createObjectURLMock = vi.fn(() => 'blob:mock-url')
      const revokeObjectURLMock = vi.fn()
      vi.stubGlobal('URL', {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      })

      // Mock anchor click to capture download
      const clickMock = vi.fn()
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clickMock(this.href, this.download)
      })

      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
        {
          deviceId: 'device-sin-nombre',
          name: null,
          contactMethod: null,
          contactValue: null,
          status: 'draft',
          updatedAt: new Date('2026-07-16T12:30:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([
        {
          fieldId: 't1_upload_url',
          label: 'Subí el resumen (foto o PDF)',
          url: 'https://download.example/file',
        },
      ])
      vi.mocked(listAdminCsvRows).mockResolvedValue({
        headers: csvHeaders,
        rows: [{ timestamp: '2026-07-16T12:00:00Z', nombre: 'Ana' }],
      })
      vi.mocked(getAdminCsvRow).mockResolvedValue({
        headers: csvHeaders,
        rows: [{ timestamp: '2026-07-16T12:00:00Z', nombre: 'Ana' }],
      })

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      // Check results are displayed
      const table = await screen.findByRole('table')
      expect(within(table).getByText('Ana')).toBeInTheDocument()
      expect(within(table).getByText('Completado')).toBeInTheDocument()
      expect(within(table).getByText('Sin nombre')).toBeInTheDocument()
      expect(within(table).getByText('Borrador')).toBeInTheDocument()

      // Assert that 'Device ID' column header and device-ana ID are present
      expect(screen.getByRole('columnheader', { name: 'Device ID' })).toBeInTheDocument()
      expect(screen.getByText('device-ana')).toBeInTheDocument()
      expect(screen.getByText('device-sin-nombre')).toBeInTheDocument()

      // Check Descargar CSV button is visible and trigger download
      const csvBtn = screen.getByRole('button', { name: 'Descargar CSV' })
      expect(csvBtn).toBeInTheDocument()
      await user.click(csvBtn)

      expect(listAdminCsvRows).toHaveBeenCalled()
      expect(createObjectURLMock).toHaveBeenCalled()
      expect(clickMock).toHaveBeenCalledWith('blob:mock-url', 'norte-respuestas.csv')

      // Check listAdminResults called
      expect(listAdminResults).toHaveBeenCalled()

      // Expand Ana row
      const anaButton = screen.getByRole('button', { name: 'Ana' })
      expect(anaButton).toHaveAttribute('aria-expanded', 'false')
      await user.click(anaButton)

      expect(anaButton).toHaveAttribute('aria-expanded', 'true')
      expect(getAdminResultFiles).toHaveBeenCalledWith({ data: { deviceId: 'device-ana' } })

      const detailLink = screen.getByRole('link', { name: 'Ver resultados' })
      expect(detailLink).toHaveAttribute('href', '/admin/resultados/device-ana')

      // Individual download calls getAdminCsvRow with the proper device ID and triggers download
      const rowCsvButton = screen.getByRole('button', { name: 'Descargar CSV para Ana' })
      expect(rowCsvButton).toBeInTheDocument()
      
      clickMock.mockClear()
      createObjectURLMock.mockClear()

      await user.click(rowCsvButton)
      expect(getAdminCsvRow).toHaveBeenCalledWith({ data: { deviceId: 'device-ana' } })
      expect(createObjectURLMock).toHaveBeenCalled()
      expect(clickMock).toHaveBeenCalledWith('blob:mock-url', 'norte-device-ana-ana.csv')

      // Check download link is displayed
      const downloadLink = await screen.findByRole('link', {
        name: 'Descargar Tarjeta 1 Resumen',
      })
      expect(downloadLink).toBeInTheDocument()
      expect(downloadLink).toHaveAttribute('href', 'https://download.example/file')
      expect(downloadLink).toHaveAttribute('target', '_blank')

      // Expand draft row and assert it does not show the per-row CSV download button
      const sinNombreButton = screen.getByRole('button', { name: 'Sin nombre' })
      await user.click(sinNombreButton)
      expect(screen.queryByRole('button', { name: /Descargar CSV para Sin nombre/ })).not.toBeInTheDocument()
    })

    it('renders empty list copy when no results are found', async () => {
      vi.mocked(listAdminResults).mockResolvedValue([])
      render(<AdminPage authenticated />)

      expect(await screen.findByText('No se encontraron resultados.')).toBeInTheDocument()
    })

    it('renders error state when loading fails and supports retry', async () => {
      vi.mocked(listAdminResults).mockRejectedValueOnce(new Error('Fetch failed'))
      vi.mocked(listAdminResults).mockResolvedValueOnce([
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
      ])

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      expect(await screen.findByText('Error al cargar los resultados.')).toBeInTheDocument()
      
      const retryBtn = screen.getByRole('button', { name: 'Reintentar' })
      await user.click(retryBtn)

      expect(await screen.findByText('Ana')).toBeInTheDocument()
    })

    it('handles no files state for an expanded row', async () => {
      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([])

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      expect(await screen.findByText('Ana')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ana' }))
      expect(await screen.findByText('No se encontraron archivos.')).toBeInTheDocument()
    })

    it('handles file load error for an expanded row', async () => {
      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockRejectedValue(new Error('File load failed'))

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      expect(await screen.findByText('Ana')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ana' }))
      expect(await screen.findByText('Error al cargar archivos.')).toBeInTheDocument()
    })

    it('manages report creation, replacement, sent status, and copying link', async () => {
      const demoReport = {
        overallScore: 85,
        categories: [
          { categoryId: 'cat1', title: 'Categoría 1', score: 80, feedback: 'Buen progreso' },
        ],
        strengths: ['Puntualidad'],
        areasForGrowth: ['Organización'],
        actionableSteps: ['Revisar diario'],
        summary: 'Resumen general',
      }

      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: 'WhatsApp',
          contactValue: '+54 11 5555-5555',
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([])

      const user = userEvent.setup()

      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      if (!navigator.clipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: writeTextMock },
          configurable: true,
          writable: true,
        })
      } else {
        vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock)
      }
      render(<AdminPage authenticated />)

      expect(await screen.findByText('Ana')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Ana' }))

      // Checkbox is disabled without report
      const sentCheckbox = screen.getByLabelText('Informe enviado')
      expect(sentCheckbox).toBeDisabled()
      expect(sentCheckbox).not.toBeChecked()

      // Open editor
      await user.click(screen.getByRole('button', { name: 'Cargar informe' }))

      // Invalid JSON validation
      const textarea = screen.getByLabelText('JSON del informe')
      fireEvent.change(textarea, { target: { value: '{invalid' } })
      await user.click(screen.getByRole('button', { name: 'Guardar informe' }))
      expect(await screen.findByText('El informe debe ser un JSON válido.')).toBeInTheDocument()
      expect(saveAdminReport).not.toHaveBeenCalled()

      // Server error handling when schema invalid
      fireEvent.change(textarea, { target: { value: '{}' } })
      vi.mocked(saveAdminReport).mockRejectedValueOnce(new Error('Schema validation error'))
      await user.click(screen.getByRole('button', { name: 'Guardar informe' }))
      expect(await screen.findByText('El informe no tiene el formato esperado.')).toBeInTheDocument()

      const updatedResultHasReport = {
        deviceId: 'device-ana',
        name: 'Ana',
        contactMethod: 'WhatsApp',
        contactValue: '+54 11 5555-5555',
        status: 'completed',
        updatedAt: new Date('2026-07-16T12:00:00Z'),
        hasReport: true,
        reportSentOn: null,
      }
      fireEvent.change(textarea, {
        target: {
          value: JSON.stringify({
            ...demoReport,
            apertura: {
              ...(demoReport as any).apertura,
              frase_apertura: 'Dijiste que te sent├¡s al d├¡a.',
            },
          }),
        },
      })
      vi.mocked(saveAdminReport).mockResolvedValueOnce(updatedResultHasReport)
      await user.click(screen.getByRole('button', { name: 'Guardar informe' }))
      expect(saveAdminReport).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          report: expect.objectContaining({
            apertura: expect.objectContaining({ frase_apertura: 'Dijiste que te sentís al día.' }),
          }),
        }),
      })

      // Valid report save
      await user.click(screen.getByRole('button', { name: 'Reemplazar informe' }))
      const reportTextarea = screen.getByLabelText('JSON del informe')
      fireEvent.change(reportTextarea, { target: { value: JSON.stringify(demoReport) } })
      vi.mocked(saveAdminReport).mockResolvedValueOnce(updatedResultHasReport)
      await user.click(screen.getByRole('button', { name: 'Guardar informe' }))
      expect(saveAdminReport).toHaveBeenLastCalledWith({
        data: { deviceId: 'device-ana', report: demoReport },
      })


      expect(await screen.findByText('Informe cargado')).toBeInTheDocument()

      const reportLink = screen.getByRole('link', { name: 'Ver informe' })
      expect(reportLink).toHaveAttribute('href', '/informe/device-ana')
      expect(reportLink).toHaveAttribute('target', '_blank')
      expect(reportLink).toHaveAttribute('rel', 'noreferrer')
      expect(screen.getByText(`${window.location.origin}/informe/device-ana`)).toBeInTheDocument()

      // Check button switched to Reemplazar informe
      expect(screen.getByRole('button', { name: 'Reemplazar informe' })).toBeInTheDocument()

      // Checkbox is now enabled and unchecked
      const enabledCheckbox = screen.getByLabelText('Informe enviado')
      expect(enabledCheckbox).not.toBeDisabled()
      expect(enabledCheckbox).not.toBeChecked()

      // Mark report sent
      const updatedResultSent = {
        ...updatedResultHasReport,
        reportSentOn: new Date('2026-07-16T15:00:00.000Z'),
      }
      vi.mocked(setAdminReportSent).mockResolvedValueOnce(updatedResultSent)
      await user.click(enabledCheckbox)
      expect(setAdminReportSent).toHaveBeenCalledWith({
        data: { deviceId: 'device-ana', sent: true },
      })
      expect(enabledCheckbox).toBeChecked()

      // Uncheck report sent
      vi.mocked(setAdminReportSent).mockResolvedValueOnce(updatedResultHasReport)
      await user.click(enabledCheckbox)
      expect(setAdminReportSent).toHaveBeenCalledWith({
        data: { deviceId: 'device-ana', sent: false },
      })
      expect(enabledCheckbox).not.toBeChecked()

      // Test copy link success
      const copyBtn = screen.getByRole('button', { name: 'Copiar enlace' })
      await user.click(copyBtn)
      expect(writeTextMock).toHaveBeenCalledWith(`${window.location.origin}/informe/device-ana`)

      // Test copy link error
      writeTextMock.mockRejectedValueOnce(new Error('Clipboard error'))
      await user.click(copyBtn)
      expect(await screen.findByText('No se pudo copiar el enlace.')).toBeInTheDocument()
    })

    it('renders Informe Enviado green chip and Informe Listo chip based on report state', async () => {
      const results = [
        {
          deviceId: 'device-sent',
          name: 'User Sent',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: true,
          reportSentOn: new Date('2026-07-16T13:00:00Z'),
        },
        {
          deviceId: 'device-ready',
          name: 'User Ready',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: true,
          reportSentOn: null,
        },
        {
          deviceId: 'device-completed',
          name: 'User Completed',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
        {
          deviceId: 'device-draft',
          name: 'User Draft',
          contactMethod: null,
          contactValue: null,
          status: 'draft',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)

      render(<AdminPage authenticated />)

      const table = await screen.findByRole('table')
      expect(within(table).getByText('Informe Enviado')).toBeInTheDocument()
      expect(within(table).getByText('Informe Listo')).toBeInTheDocument()
      expect(within(table).getByText('Completado')).toBeInTheDocument()
      expect(within(table).getByText('Borrador')).toBeInTheDocument()
    })

    it('renders file attachments section directly below Ver resultados and before the report section divider', async () => {
      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([
        {
          fieldId: 't1_upload_url',
          label: 'Subí el resumen (foto o PDF)',
          url: 'https://download.example/file',
        },
      ])

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      expect(await screen.findByText('Ana')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Ana' }))

      const container = document.getElementById('files-container-device-ana')
      expect(container).toBeInTheDocument()

      const children = Array.from(container!.children)
      expect(children[0]).toHaveTextContent('Ver resultados')
      expect(children[1]).toHaveTextContent('Descargar Tarjeta 1 Resumen')
      expect(children[2]).toHaveTextContent('Cargar informe')
    })

    it('supports mutually exclusive status filtering by effective status', async () => {
      const results = [
        {
          deviceId: 'dev-draft',
          name: 'Borrador',
          contactMethod: null,
          contactValue: null,
          status: 'draft',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
        {
          deviceId: 'dev-completed',
          name: 'Completado',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
        {
          deviceId: 'dev-ready',
          name: 'Listo',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: true,
          reportSentOn: null,
        },
        {
          deviceId: 'dev-sent',
          name: 'Enviado',
          contactMethod: null,
          contactValue: null,
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: true,
          reportSentOn: new Date('2026-07-16T15:00:00Z'),
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      const table = await screen.findByRole('table')
      expect(await within(table).findByRole('button', { name: 'Borrador' })).toBeInTheDocument()
      expect(within(table).getByRole('button', { name: 'Completado' })).toBeInTheDocument()
      expect(within(table).getByRole('button', { name: 'Listo' })).toBeInTheDocument()
      expect(within(table).getByRole('button', { name: 'Enviado' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Informe Listo' }))
      expect(within(table).getByRole('button', { name: 'Listo' })).toBeInTheDocument()
      expect(within(table).queryByRole('button', { name: 'Enviado' })).not.toBeInTheDocument()
      expect(within(table).queryByRole('button', { name: 'Completado' })).not.toBeInTheDocument()
      expect(within(table).queryByRole('button', { name: 'Borrador' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Informe Enviado' }))
      expect(within(table).getByRole('button', { name: 'Enviado' })).toBeInTheDocument()
      expect(within(table).queryByRole('button', { name: 'Listo' })).not.toBeInTheDocument()
      expect(within(table).queryByRole('button', { name: 'Completado' })).not.toBeInTheDocument()
      expect(within(table).queryByRole('button', { name: 'Borrador' })).not.toBeInTheDocument()
    })

    it('removes row from view on status update while filtered by Informe Listo', async () => {
      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: 'WhatsApp',
          contactValue: '+54 11 5555-5555',
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: true,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([])

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      expect(await screen.findByText('Ana')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Informe Listo' }))
      expect(screen.getByText('Ana')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ana' }))

      const updatedResultSent = {
        ...results[0],
        reportSentOn: new Date('2026-07-16T15:00:00.000Z'),
      }
      vi.mocked(setAdminReportSent).mockResolvedValueOnce(updatedResultSent)

      const sentCheckbox = screen.getByLabelText('Informe enviado')
      await user.click(sentCheckbox)

      expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    })

    it('renders contact controls and copies contact info with error fallback', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      if (!navigator.clipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: writeTextMock },
          configurable: true,
          writable: true,
        })
      } else {
        vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock)
      }

      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: 'WhatsApp',
          contactValue: '+54 11 5555-5555',
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
        {
          deviceId: 'device-sin-nombre',
          name: null,
          contactMethod: null,
          contactValue: null,
          status: 'draft',
          updatedAt: new Date('2026-07-16T12:30:00Z'),
          hasReport: false,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([])

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      expect(await screen.findByText('Ana')).toBeInTheDocument()

      // Expand Ana row
      await user.click(screen.getByRole('button', { name: 'Ana' }))

      expect(screen.getByText('Nombre: Ana')).toBeInTheDocument()
      expect(screen.getByText('Método de envío: WhatsApp +54 11 5555-5555')).toBeInTheDocument()

      const copyBtn = screen.getByRole('button', { name: 'Copiar' })
      await user.click(copyBtn)
      expect(writeTextMock).toHaveBeenCalledWith('+54 11 5555-5555')

      writeTextMock.mockRejectedValueOnce(new Error('Clipboard error'))
      await user.click(copyBtn)
      expect(await screen.findByText('No se pudo copiar el contacto.')).toBeInTheDocument()

      // Expand Sin nombre row
      await user.click(screen.getByRole('button', { name: 'Sin nombre' }))
      expect(screen.getByText('Nombre: Sin nombre')).toBeInTheDocument()
      expect(screen.getByText('Método de envío: Sin contacto')).toBeInTheDocument()
    })

    it('enforces order of blocks inside expanded row', async () => {
      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          contactMethod: 'Email',
          contactValue: 'ana@example.com',
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
          hasReport: true,
          reportSentOn: null,
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([])

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      expect(await screen.findByText('Ana')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Ana' }))

      const text = document.getElementById('files-container-device-ana')!.textContent!
      expect(text.indexOf('Informe cargado')).toBeLessThan(text.indexOf('Ver informe'))
      expect(text.indexOf('Ver informe')).toBeLessThan(text.indexOf('Nombre: Ana'))
      expect(text.indexOf('Nombre: Ana')).toBeLessThan(text.indexOf('Método de envío: Email ana@example.com'))
    })
  })
})


