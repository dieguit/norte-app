// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPage } from './admin-page'
import { loginAdmin } from '../admin/auth'
import { listAdminResults, getAdminResultFiles, listAdminCsvRows, getAdminCsvRow } from '../admin/server'
import { csvHeaders } from '../admin/csv'

vi.mock('../admin/auth', () => ({
  loginAdmin: vi.fn(),
  getAdminSession: vi.fn(),
}))

vi.mock('../admin/server', () => ({
  listAdminResults: vi.fn(),
  getAdminResultFiles: vi.fn(),
  listAdminCsvRows: vi.fn(),
  getAdminCsvRow: vi.fn(),
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

  it('generates a shareable Spanish invitation and switches to results', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => '6f0a7482-29a0-4c03-a3e1-256add2f91a8' })
    vi.stubGlobal('location', { origin: 'http://localhost:3000' })

    render(<AdminPage authenticated />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Crear invitación' }))
    expect(screen.getByDisplayValue(/\/onboarding\?invitado=6f0a7482/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Resultados' }))
    expect(await screen.findByText('No se encontraron resultados.')).toBeInTheDocument()
  })

  describe('Results tab', () => {
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
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
        },
        {
          deviceId: 'device-sin-nombre',
          name: null,
          status: 'draft',
          updatedAt: new Date('2026-07-16T12:30:00Z'),
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([
        {
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

      // Go to results tab
      await user.click(screen.getByRole('tab', { name: 'Resultados' }))

      // Check results are displayed
      expect(await screen.findByText('Ana')).toBeInTheDocument()
      expect(screen.getByText('Completado')).toBeInTheDocument()
      expect(screen.getByText('Sin nombre')).toBeInTheDocument()
      expect(screen.getByText('Borrador')).toBeInTheDocument()

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
      const downloadLink = await screen.findByRole('link', { name: 'Descargar Subí el resumen (foto o PDF)' })
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
      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      await user.click(screen.getByRole('tab', { name: 'Resultados' }))

      expect(await screen.findByText('No se encontraron resultados.')).toBeInTheDocument()
    })

    it('renders error state when loading fails and supports retry', async () => {
      vi.mocked(listAdminResults).mockRejectedValueOnce(new Error('Fetch failed'))
      vi.mocked(listAdminResults).mockResolvedValueOnce([
        {
          deviceId: 'device-ana',
          name: 'Ana',
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
        },
      ])

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      await user.click(screen.getByRole('tab', { name: 'Resultados' }))

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
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockResolvedValue([])

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      await user.click(screen.getByRole('tab', { name: 'Resultados' }))
      expect(await screen.findByText('Ana')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ana' }))
      expect(await screen.findByText('No se encontraron archivos.')).toBeInTheDocument()
    })

    it('handles file load error for an expanded row', async () => {
      const results = [
        {
          deviceId: 'device-ana',
          name: 'Ana',
          status: 'completed',
          updatedAt: new Date('2026-07-16T12:00:00Z'),
        },
      ]
      vi.mocked(listAdminResults).mockResolvedValue(results)
      vi.mocked(getAdminResultFiles).mockRejectedValue(new Error('File load failed'))

      const user = userEvent.setup()
      render(<AdminPage authenticated />)

      await user.click(screen.getByRole('tab', { name: 'Resultados' }))
      expect(await screen.findByText('Ana')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ana' }))
      expect(await screen.findByText('Error al cargar archivos.')).toBeInTheDocument()
    })
  })
})
