// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { InformePage } from './informe-page'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

afterEach(cleanup)

describe('InformePage', () => {
  it('renders JSON-backed annual data and derives its horizon from chart labels', () => {
    render(<InformePage />)

    expect(screen.getByRole('heading', { name: 'Tu posición real' })).toBeDefined()
    expect(screen.getByText('$99,7 M')).toBeDefined()
    expect(screen.getByText(/13 meses/)).toBeDefined()
    expect(screen.queryByText('5 alertas')).toBeNull()
  })

  it('updates the selected projection when the discretionary-spend slider changes', () => {
    render(<InformePage />)

    const slider = screen.getByRole('slider', { name: 'Recorte de gastos discrecionales' })
    expect(screen.getByText('0%')).toBeDefined()
    expect(screen.getByText('No llega en 13 meses')).toBeDefined()

    fireEvent.change(slider, { target: { value: '100' } })

    expect(screen.getByText('100%')).toBeDefined()
    expect(screen.getByText('Jun')).toBeDefined()
  })

  it('uses the report copy and keeps the upcoming expense separate from card commitments', () => {
    render(<InformePage />)

    expect(screen.getByText('Todo lo que vas a ganar este año')).toBeDefined()
    expect(screen.getByText('Lo que tenés que pagar sí o sí')).toBeDefined()
    expect(screen.getByText('Cosas que podrías ajustar si quisieras')).toBeDefined()
    expect(screen.getByText('Un gasto necesario que ya sabés que viene')).toBeDefined()
    expect(screen.getByText('$2,0 M')).toBeDefined()
    expect(screen.getByText('Total comprometido en tarjeta este año')).toBeDefined()
    expect(screen.getByText('$250.000')).toBeDefined()
    expect(screen.queryByText('Compromisos fijos anuales')).toBeNull()
    expect(screen.queryByText('Tarjeta comprometida')).toBeNull()
  })

  it('keeps the supplied static WhatsApp preview', () => {
    render(<InformePage />)

    expect(screen.getByText('Diciembre 2026')).toBeDefined()
    expect(screen.getByText(/Hoy entra tu aguinaldo/)).toBeDefined()
    expect(screen.getByText(/Ay, pero quiero comprar algo para las fiestas/)).toBeDefined()
    expect(screen.queryByText(/notebook en 6 cuotas/)).toBeNull()
  })

  it('switches the monthly breakdown between cards, a solid pie, and a donut total', () => {
    render(<InformePage />)

    expect(screen.getByRole('tab', { name: 'Opción 1' }).getAttribute('data-active')).not.toBeNull()
    expect(screen.getByText('Compromisos fijos que no se tocan')).toBeDefined()

    fireEvent.click(screen.getByRole('tab', { name: 'Opción 2' }))
    expect(screen.getByTestId('monthly-solid-pie')).toBeDefined()
    expect(screen.getByText(/63.3%/)).toBeDefined()

    fireEvent.click(screen.getByRole('tab', { name: 'Opción 3' }))
    expect(screen.getByTestId('monthly-donut')).toBeDefined()
    expect(screen.getByText('$7.500.000')).toBeDefined()
    expect(screen.getByText(/Margen libre/)).toBeDefined()
  })
})
