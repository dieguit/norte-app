// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const posthogCapture = vi.fn()
const posthogIdentify = vi.fn()
let posthogAvailable = true
let intersectionCallback: IntersectionObserverCallback | undefined

vi.mock('@posthog/react', () => ({
  usePostHog: () => posthogAvailable
    ? { capture: posthogCapture, identify: posthogIdentify }
    : undefined,
}))

class TestIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()

  return {
    ...actual,
    XAxis: ({ interval }: { interval?: number | string }) => (
      <span data-testid="projection-x-axis">{interval}</span>
    ),
  }
})

import userEvent from '@testing-library/user-event'
import { InformePage } from './informe-page'
import demoReport from '@/features/informe/demo.json'
import { markPublicReportCtaClicked } from '@/features/informe/informe.functions'

vi.mock('@/features/informe/informe.functions', () => ({
  markPublicReportCtaClicked: vi.fn(),
}))

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
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
})

afterEach(() => {
  cleanup()
  posthogAvailable = true
  intersectionCallback = undefined
  posthogCapture.mockClear()
  posthogIdentify.mockClear()
  vi.mocked(markPublicReportCtaClicked).mockReset()
})

describe('InformePage', () => {
  it('renders JSON-backed annual data', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

    expect(screen.getByRole('heading', { name: 'Tu posición real' })).toBeDefined()
    expect(screen.getByText('$99,7 M')).toBeDefined()
    expect(screen.queryByText('5 alertas')).toBeNull()
  })

  it('updates savings, arrival, and the chart projection when the discretionary-spend slider changes', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

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

  it('keeps the reduction value together and right-aligns an unmet arrival label', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

    expect(screen.getByText('0%')).toHaveClass('whitespace-nowrap')
    expect(screen.getByText('No llegás con este recorte')).toHaveClass(
      'text-right',
    )
  })

  it('estimates the total arrival month when the selected curve misses the JSON horizon', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

    fireEvent.change(
      screen.getByRole('slider', {
        name: 'Recorte de gastos discrecionales',
      }),
      { target: { value: '30' } },
    )

    expect(screen.getByText('Mes 34 (estimado)')).toBeDefined()
  })

  it('uses the report copy and keeps the upcoming expense separate from card commitments', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

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
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

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
    ).toBe('/images/roadmap2.webp')

    const roadmap = screen.getByRole('img', {
      name: 'Hoja de ruta financiera de Norte',
    })
    const firstFeature = screen.getByText('Tus finanzas se actualizan solas')
    const thirdFeature = screen.getByText('Tu camino cambia cuando cambia tu vida')
    const fourthFeature = screen.getByText('Podés probar antes de decidir')
    const whatsappPreview = screen.getByText('Diciembre 2026')

    expect(roadmap.className).toContain('md:max-h-[550px]')
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

  it('shows the monthly donut by default without visualization tabs', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

    expect(screen.getByTestId('monthly-donut')).toBeDefined()
    expect(screen.getByText('$7.500.000')).toBeDefined()
    expect(screen.getByText(/Margen libre/)).toBeDefined()
    expect(screen.getByRole('tablist')).toHaveClass('hidden')
  })

  it('renders a dynamic monthly breakdown beside the default chart', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

    expect(screen.getByTestId('monthly-breakdown-legend')).toBeDefined()
    expect(screen.getByText('Compromisos fijos que no se tocan')).toBeDefined()
    expect(screen.getByText(/\$4\.750\.000/)).toBeDefined()
    expect(screen.getByText(/\$1\.300\.000/)).toBeDefined()
    expect(screen.getByText(/\$1\.425\.000/)).toBeDefined()
    expect(screen.getByText(/63\.3%/)).toBeDefined()
  })

  it('identifies the report recipient and captures each visible area once', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)
    const areas = document.querySelectorAll<HTMLElement>('[data-analytics-area]')
    intersectionCallback!(Array.from(areas, (target) => ({
      target,
      isIntersecting: true,
      intersectionRatio: 0.5,
    } as unknown as IntersectionObserverEntry)), {} as IntersectionObserver)
    intersectionCallback!([{ target: areas[0], isIntersecting: true, intersectionRatio: 0.5 } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)

    expect(posthogIdentify).toHaveBeenCalledWith('device-ana')
    expect(posthogCapture).toHaveBeenCalledTimes(5)
    expect(posthogCapture).toHaveBeenCalledWith('informe_area_viewed', {
      device_id: 'device-ana', area: 'apertura',
    })
  })

  it('captures the final CTA click', async () => {
    vi.mocked(markPublicReportCtaClicked).mockResolvedValue({ ctaClickedOn: new Date() })
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' }))
    expect(posthogCapture).toHaveBeenCalledWith('informe_cta_clicked', {
      device_id: 'device-ana', area: 'vision_norte',
    })
  })

  it('skips report analytics when PostHog is unavailable', () => {
    posthogAvailable = false
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' }))
    expect(posthogIdentify).not.toHaveBeenCalled()
    expect(posthogCapture).not.toHaveBeenCalled()
  })

  it('registers the CTA, captures analytics, and confirms the waitlist state', async () => {
    const user = userEvent.setup()
    vi.mocked(markPublicReportCtaClicked).mockResolvedValue({ ctaClickedOn: new Date() })
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

    const button = screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' })
    const waitlistText = screen.getByText(/Estamos preparando el primer lanzamiento de Norte con cupos limitados/)
    expect(waitlistText).toHaveClass('text-base')
    expect(button.closest('div')).toHaveTextContent('Todo esto por lo que cuesta una pizza al mes.')

    await user.click(button)

    expect(markPublicReportCtaClicked).toHaveBeenCalledWith({ data: { deviceId: 'device-ana' } })
    expect(posthogCapture).toHaveBeenCalledWith('informe_cta_clicked', { device_id: 'device-ana', area: 'vision_norte' })
    expect(screen.getByText(/Ya te registramos en la lista de espera/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' })).toBeDisabled()
  })

  it('renders the persisted confirmation when the report is reopened', () => {
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={new Date()} />)

    expect(screen.getByText(/Ya te registramos en la lista de espera/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' })).toBeDisabled()
  })

  it('shows an error and lets the recipient retry when registration fails', async () => {
    const user = userEvent.setup()
    vi.mocked(markPublicReportCtaClicked).mockRejectedValue(new Error('network'))
    render(<InformePage report={demoReport} deviceId="device-ana" ctaClickedOn={null} />)

    await user.click(screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' }))

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos registrarte. Intentá de nuevo.')
    expect(screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' })).toBeEnabled()
  })

  it('handles demo deviceId by confirming locally without calling markPublicReportCtaClicked', async () => {
    const user = userEvent.setup()
    render(<InformePage report={demoReport} deviceId="demo" ctaClickedOn={null} />)

    await user.click(screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' }))

    expect(posthogCapture).toHaveBeenCalledWith('informe_cta_clicked', { device_id: 'demo', area: 'vision_norte' })
    expect(markPublicReportCtaClicked).not.toHaveBeenCalled()
    expect(screen.getByText(/Ya te registramos en la lista de espera/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quiero ser de los primeros en usar Norte →' })).toBeDisabled()
  })
})
