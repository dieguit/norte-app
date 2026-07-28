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
    await expect(loadInformeReport('demo')).resolves.toEqual(demoReport)
    expect(getPublicReport).not.toHaveBeenCalled()
  })

  it('loads a stored report and returns null when it is missing', async () => {
    vi.mocked(getPublicReport).mockResolvedValueOnce(demoReport as any).mockResolvedValueOnce(null)

    await expect(loadInformeReport('real-device')).resolves.toEqual(demoReport)
    await expect(loadInformeReport('missing-device')).resolves.toBeNull()
    expect(getPublicReport).toHaveBeenNthCalledWith(1, { data: { deviceId: 'real-device' } })
  })

  it('renders the report or the required missing-report message', () => {
    const { rerender } = render(<InformeRouteContent report={demoReport as any} deviceId="demo" />)
    expect(screen.getByText('$99,7 M')).toBeDefined()

    rerender(<InformeRouteContent report={null} deviceId="demo" />)
    expect(screen.getByText('No se encontro el informe, por favor verifica el link')).toBeDefined()
  })
})
