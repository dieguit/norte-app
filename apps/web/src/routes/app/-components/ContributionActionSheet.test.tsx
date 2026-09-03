// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSavingContributionContext } from '../../../features/contributions/saving-contribution.functions'
import type { SavingContributionContext } from '../../../features/contributions/saving-contribution'
import { ContributionActionSheet } from './ContributionActionSheet'

vi.mock('../../../features/contributions/saving-contribution.functions', () => ({
  getSavingContributionContext: vi.fn(),
  previewSavingContribution: vi.fn(),
  confirmSavingContribution: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ invalidate: vi.fn() }) }))
vi.mock('@posthog/react', () => ({ usePostHog: () => ({ capture: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const context: SavingContributionContext = {
  currentMonth: '2026-08',
  eligibleGoals: [{ id: 'goal-ars-1', name: 'Viaje a Bariloche', percentage: '100.00' }],
  eligibleGoalsUsd: [{ id: 'goal-usd-1', name: 'Colchón financiero', percentage: '100.00' }],
  eligibleInvestmentGoals: [{ id: 'investment-ars-1', name: 'CEDEARs', percentage: '100.00' }],
  eligibleInvestmentGoalsUsd: [{ id: 'investment-usd-1', name: 'S&P 500 USD', percentage: '100.00' }],
  places: [{ id: 'place-1', name: 'Banco Santander' }],
  investmentState: { ars: { status: 'ready' }, usd: { status: 'ready' } },
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ContributionActionSheet', () => {
  it('recovers from a context loading error after retry', async () => {
    const user = userEvent.setup()
    vi.mocked(getSavingContributionContext)
      .mockRejectedValueOnce(new Error('Error de conexión'))
      .mockResolvedValueOnce({ profile: 'present', context })

    renderSheet()

    expect(await screen.findByText('Error de conexión')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('button', { name: 'Ahorré ARS' })).toBeVisible()
  })

  it('opens the selected contribution action', async () => {
    const user = userEvent.setup()
    vi.mocked(getSavingContributionContext).mockResolvedValue({ profile: 'present', context })

    renderSheet()
    await user.click(await screen.findByRole('button', { name: 'Invertí USD' }))

    expect(screen.getByRole('heading', { name: 'Registrar inversión' })).toBeVisible()
    expect(screen.getByLabelText('Monto en dólares')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Ahorré ARS' })).not.toBeInTheDocument()
  })

  it('returns to the action choices with back navigation', async () => {
    const user = userEvent.setup()
    vi.mocked(getSavingContributionContext).mockResolvedValue({ profile: 'present', context })

    renderSheet()
    await user.click(await screen.findByRole('button', { name: 'Ahorré ARS' }))
    await user.click(screen.getByRole('button', { name: 'Volver a opciones de aporte' }))

    expect(screen.getByRole('heading', { name: 'Registrar aporte' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ahorré ARS' })).toBeVisible()
  })

  it('starts a contextual catch-up contribution with its month and amount', async () => {
    vi.mocked(getSavingContributionContext).mockResolvedValue({ profile: 'present', context })

    renderSheet({ kind: 'saving', currency: 'ARS', amount: '25000.00', month: '2026-07' })

    expect(await screen.findByRole('heading', { name: 'Registrar ahorro' })).toBeVisible()
    expect(screen.getByText('Este aporte se registrará para Julio de 2026.')).toBeVisible()
    expect(screen.getByLabelText('Monto en pesos')).toHaveValue('25.000')
    expect(screen.queryByRole('button', { name: 'Ahorré ARS' })).not.toBeInTheDocument()
  })
})

function renderSheet(catchUpContribution?: { kind: 'saving'; currency: 'ARS'; amount: string; month: string }) {
  return render(
    <ContributionActionSheet
      open
      onOpenChange={vi.fn()}
      catchUpContribution={catchUpContribution}
    />,
  )
}
