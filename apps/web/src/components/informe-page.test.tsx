// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()

  return {
    ...actual,
    XAxis: ({ interval }: { interval?: number | string }) => (
      <span data-testid="projection-x-axis">{interval}</span>
    ),
  }
})

import { InformePage } from './informe-page'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{ contentRect: { width: 480, height: 480 }, target } as ResizeObserverEntry], this as unknown as ResizeObserver)
      }
      unobserve() {}
      disconnect() {}
    }
  )
})

afterEach(cleanup)

describe('InformePage', () => {
  it('renders JSON-backed annual data', () => {
    render(<InformePage />)

    expect(screen.getByRole('heading', { name: 'Tu posición real' })).toBeDefined()
    expect(screen.getByText('$99,7 M')).toBeDefined()
    expect(screen.queryByText('5 alertas')).toBeNull()
  })

  it('updates savings, arrival, and the chart projection when the discretionary-spend slider changes', () => {
    render(<InformePage />)

    const slider = screen.getByRole('slider', {
      name: 'Recorte de gastos discrecionales',
    })
    expect(screen.getByText('0%')).toBeDefined()
    expect(
      screen.getByText('Ahorrarías $0 por mes con este recorte'),
    ).toBeDefined()
    expect(screen.getByText('No llegás con este recorte')).toBeDefined()
    expect(screen.getByTestId('projection-chart')).toBeDefined()
    expect(screen.getByTestId('projection-x-axis')).toHaveTextContent(
      'preserveStartEnd',
    )

    fireEvent.change(slider, { target: { value: '100' } })

    expect(screen.getByText('100%')).toBeDefined()
    expect(
      screen.getByText('Ahorrarías $1.425.000 por mes con este recorte'),
    ).toBeDefined()
    expect(screen.getByText('Mes 11 · Jun')).toBeDefined()
  })

  it('estimates the total arrival month when the selected curve misses the JSON horizon', () => {
    render(<InformePage />)

    fireEvent.change(
      screen.getByRole('slider', {
        name: 'Recorte de gastos discrecionales',
      }),
      { target: { value: '30' } },
    )

    expect(screen.getByText('Mes 34 (estimado)')).toBeDefined()
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

  it('renders the product section with the supplied static WhatsApp preview', () => {
    render(<InformePage />)

    expect(
      screen.getByRole('heading', {
        name: 'Esto que acabás de ver es solo una pequeña muestra.',
      }),
    ).toBeDefined()

    // Verify all 6 feature cards
    expect(screen.getByText('Tus finanzas se actualizan solas')).toBeDefined()
    expect(
      screen.getByText('Todos tus objetivos, en una sola hoja de ruta'),
    ).toBeDefined()
    expect(
      screen.getByText('Tu camino cambia cuando cambia tu vida'),
    ).toBeDefined()
    expect(screen.getByText('Podés probar antes de decidir')).toBeDefined()
    expect(screen.getByText('Podés preguntarle antes de gastar')).toBeDefined()
    expect(
      screen.getByText('Recibí alertas inteligentes en tu WhatsApp'),
    ).toBeDefined()

    // Verify right-column media assets
    expect(
      screen.getByRole('img', {
        name: 'Hoja de ruta financiera de Norte',
      }).getAttribute('src'),
    ).toBe('/images/roadmap.webp')

    const roadmap = screen.getByRole('img', {
      name: 'Hoja de ruta financiera de Norte',
    })
    const firstFeature = screen.getByText('Tus finanzas se actualizan solas')
    const thirdFeature = screen.getByText('Tu camino cambia cuando cambia tu vida')
    const fourthFeature = screen.getByText('Podés probar antes de decidir')
    const whatsappPreview = screen.getByText('Diciembre 2026')

    expect(roadmap.className).toContain('md:max-h-[450px]')
    expect(roadmap.parentElement?.className).toContain('bg-[var(--sand)]')
    expect(firstFeature.compareDocumentPosition(roadmap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(thirdFeature.compareDocumentPosition(roadmap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(roadmap.compareDocumentPosition(fourthFeature) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(fourthFeature.compareDocumentPosition(whatsappPreview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(screen.getByText('Diciembre 2026')).toBeDefined()
    expect(screen.getByText(/Hoy entra tu aguinaldo/)).toBeDefined()

    // Verify CTA close
    expect(
      screen.getByRole('button', {
        name: 'Quiero ser de los primeros en usar Norte →',
      }),
    ).toBeDefined()
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

  it('renders a dynamic monthly breakdown beside the selected chart', () => {
    render(<InformePage />)

    fireEvent.click(screen.getByRole('tab', { name: 'Opción 2' }))

    expect(screen.getByTestId('monthly-breakdown-legend')).toBeDefined()
    expect(screen.getByText('Compromisos fijos que no se tocan')).toBeDefined()
    expect(screen.getByText(/\$4\.750\.000/)).toBeDefined()
    expect(screen.getByText(/\$1\.300\.000/)).toBeDefined()
    expect(screen.getByText(/\$1\.425\.000/)).toBeDefined()
    expect(screen.getByText(/63\.3%/)).toBeDefined()
  })
})
