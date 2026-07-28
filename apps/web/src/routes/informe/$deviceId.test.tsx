// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import demoReport from '../../informe/demo.json'
import { getPublicReport } from '../../informe/server'
import { InformeRouteContent, loadInformeReport } from './$deviceId'

vi.mock('../../informe/server', () => ({ getPublicReport: vi.fn() }))
vi.mock('@posthog/react', () => ({ usePostHog: () => undefined }))

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
    unobserve() {}
  })
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
    unobserve() {}
  })
})

describe('Informe Route', () => {
  it('keeps the demo report static without querying the database', async () => {
    await expect(loadInformeReport('demo')).resolves.toEqual({ report: demoReport, ctaClickedOn: null })
    expect(getPublicReport).not.toHaveBeenCalled()
  })

  it('loads a stored report and returns null when it is missing', async () => {
    const ctaClickedOn = new Date('2026-07-28T12:00:00Z')
    vi.mocked(getPublicReport).mockResolvedValueOnce({ report: demoReport, ctaClickedOn } as any).mockResolvedValueOnce(null)

    await expect(loadInformeReport('real-device')).resolves.toEqual({ report: demoReport, ctaClickedOn })
    await expect(loadInformeReport('missing-device')).resolves.toBeNull()
    expect(getPublicReport).toHaveBeenNthCalledWith(1, { data: { deviceId: 'real-device' } })
  })

  it('renders the report or the required missing-report message', () => {
    const ctaClickedOn = new Date('2026-07-28T12:00:00Z')
    const { rerender } = render(<InformeRouteContent data={{ report: demoReport as any, ctaClickedOn }} deviceId="demo" />)
    expect(screen.getByText('$99,7 M')).toBeDefined()

    rerender(<InformeRouteContent data={null} deviceId="demo" />)
    expect(screen.getByText('No se encontro el informe, por favor verifica el link')).toBeDefined()
  })
})
