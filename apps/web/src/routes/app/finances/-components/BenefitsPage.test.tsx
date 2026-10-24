// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveBenefitPreferences, setBenefitDigestEnabled } from '../../../../features/benefits/benefits.functions'
import { BenefitsPage } from './BenefitsPage'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

vi.mock('../../../../features/benefits/benefits.functions', () => ({
  saveBenefitPreferences: vi.fn(),
  setBenefitDigestEnabled: vi.fn(),
}))

afterEach(cleanup)

const catalog = {
  providers: [
    {
      slug: 'galicia',
      name: 'Banco Galicia',
      kind: 'bank',
      instruments: [
        { slug: 'galicia-visa-credito', label: 'Galicia Visa crédito', network: 'visa', type: 'credit', tier: null },
        { slug: 'galicia-visa-debito', label: 'Galicia Visa débito', network: 'visa', type: 'debit', tier: null },
      ],
    },
    {
      slug: 'modo',
      name: 'MODO',
      kind: 'wallet',
      instruments: [{ slug: 'modo', label: 'MODO', network: null, type: 'membership', tier: null }],
    },
  ],
  categories: [
    { slug: 'supermercado', label: 'Supermercado' },
    { slug: 'cine', label: 'Cine' },
  ],
} as const

describe('BenefitsPage', () => {
  it('groups instruments, preselects saved ones and saves the selection', async () => {
    const user = userEvent.setup()
    vi.mocked(saveBenefitPreferences).mockResolvedValue({ instrumentSlugs: [], categories: [], enabled: true } as never)
    render(
      <BenefitsPage
        catalog={catalog as never}
        preferences={{ instrumentSlugs: ['modo'], categories: ['cine'], enabled: false }}
      />,
    )
    expect(screen.getByRole('group', { name: 'Tus tarjetas y cuentas' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'MODO' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Galicia Visa crédito' }))
    await user.click(screen.getByRole('button', { name: 'Supermercado' }))
    await user.click(screen.getByRole('button', { name: 'Guardar y activar' }))
    expect(saveBenefitPreferences).toHaveBeenCalledWith({
      data: {
        instrumentSlugs: ['modo', 'galicia-visa-credito'],
        categories: ['cine', 'supermercado'],
      },
    })
  })

  it('disables save until there is an instrument and a category', () => {
    render(
      <BenefitsPage
        catalog={catalog as never}
        preferences={{ instrumentSlugs: [], categories: [], enabled: false }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Guardar y activar' })).toBeDisabled()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('toggles the daily digest when already set up', async () => {
    const user = userEvent.setup()
    render(
      <BenefitsPage
        catalog={catalog as never}
        preferences={{ instrumentSlugs: ['modo'], categories: ['cine'], enabled: true }}
      />,
    )
    await user.click(screen.getByRole('switch', { name: /Avisos diarios/ }))
    expect(setBenefitDigestEnabled).toHaveBeenCalledWith({ data: { enabled: false } })
  })

  it('rolls back switch state and reports error when toggle fails, keeping switch disabled while pending', async () => {
    const user = userEvent.setup()
    let rejectPromise!: (err: unknown) => void
    vi.mocked(setBenefitDigestEnabled).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectPromise = reject
        }),
    )

    render(
      <BenefitsPage
        catalog={catalog as never}
        preferences={{ instrumentSlugs: ['modo'], categories: ['cine'], enabled: true }}
      />,
    )

    const switchElement = screen.getByRole('switch', { name: /Avisos diarios/ })
    expect(switchElement).toBeChecked()

    await user.click(switchElement)

    expect(switchElement).not.toBeChecked()
    expect(switchElement).toHaveAttribute('aria-disabled', 'true')

    rejectPromise(new Error('Network error'))

    await waitFor(() => {
      expect(switchElement).toBeChecked()
    })
    expect(switchElement).not.toHaveAttribute('aria-disabled')
    expect(toast.error).toHaveBeenCalledWith('Network error')
  })
})
