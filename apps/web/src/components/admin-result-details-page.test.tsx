// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminResultDetailsPage } from './admin-result-details-page'
import { getAdminResultDetails } from '../admin/server'

vi.mock('../admin/server', () => ({
  getAdminResultDetails: vi.fn(),
}))

const deviceId = '12345678-1234-1234-1234-123456789012'

describe('AdminResultDetailsPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders login screen when unauthenticated', () => {
    render(<AdminResultDetailsPage authenticated={false} deviceId={deviceId} />)
    expect(screen.getByRole('heading', { name: 'Administración' })).toBeInTheDocument()
    expect(screen.getByText('Ingresá tus credenciales para acceder')).toBeInTheDocument()
  })

  it('shows loading, missing-result, and request-error states', async () => {
    const pending = new Promise<never>(() => {})
    vi.mocked(getAdminResultDetails).mockReturnValueOnce(pending as any)
    const { rerender } = render(<AdminResultDetailsPage authenticated deviceId={deviceId} />)
    expect(screen.getByText('Cargando resultados...')).toBeInTheDocument()

    vi.mocked(getAdminResultDetails).mockResolvedValueOnce(null)
    rerender(<AdminResultDetailsPage authenticated deviceId="00000000-0000-0000-0000-000000000000" />)
    expect(await screen.findByText('No se encontraron resultados para este dispositivo.')).toBeInTheDocument()

    vi.mocked(getAdminResultDetails).mockRejectedValueOnce(new Error('network'))
    rerender(<AdminResultDetailsPage authenticated deviceId="11111111-1111-1111-1111-111111111111" />)
    expect(await screen.findByText('Error al cargar los resultados.')).toBeInTheDocument()
  })

  it('shows every field, formats values, and links uploaded files', async () => {
    vi.mocked(getAdminResultDetails).mockResolvedValue({
      draft: {
        deviceId,
        answers: {
          nombre: 'Ana',
          contacto_canal: 'WhatsApp',
          ing_total: 1500000,
          p5_fuentes: ['Sueldo fijo (relación de dependencia)', 'Otro'],
          extra_ingresos: [{ concepto: 'Clases', monto: 25000, desde: 'ene-26', hasta: 'jun-26' }],
          t1_upload_url: `onboarding/${deviceId}/t1_upload_url/file-id`,
        },
        completedAt: null,
        updatedAt: new Date('2026-07-16T12:00:00Z'),
      },
      files: { t1_upload_url: 'https://download.example/statement' },
    } as any)

    render(<AdminResultDetailsPage authenticated deviceId={deviceId} />)

    expect(await screen.findByRole('heading', { name: 'Resultados' })).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('1.500.000')).toBeInTheDocument()
    expect(screen.getByText('Sueldo fijo (relación de dependencia), Otro')).toBeInTheDocument()
    expect(screen.getByText('Clases')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /descargar subir foto o archivo/i }))
      .toHaveAttribute('href', 'https://download.example/statement')
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Volver a administración' }))
      .toHaveAttribute('href', '/admin')
  })
})
