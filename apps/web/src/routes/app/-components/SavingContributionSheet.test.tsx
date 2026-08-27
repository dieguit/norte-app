// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SavingContributionSheet } from './SavingContributionSheet'
import { getSavingContributionContext } from '../../../features/contributions/saving-contribution.functions'
import type { SavingContributionContext } from '../../../features/contributions/saving-contribution'

vi.mock('../../../features/contributions/saving-contribution.functions', () => ({
  getSavingContributionContext: vi.fn(),
  previewSavingContribution: vi.fn(),
  confirmSavingContribution: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    invalidate: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const sampleContext: SavingContributionContext = {
  currentMonth: '2026-08',
  eligibleGoals: [
    { id: 'goal-ars-1', name: 'Viaje a Bariloche', percentage: '100.00' },
  ],
  eligibleGoalsUsd: [],
      places: [],
    }

describe('SavingContributionSheet', () => {
  it('does not render sheet contents when open is false', () => {
    render(<SavingContributionSheet open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders loading skeleton and then SavingContribution when open is true', async () => {
    vi.mocked(getSavingContributionContext).mockResolvedValue({
      profile: 'present',
      context: sampleContext,
    })

    render(<SavingContributionSheet open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Registrar ahorro')).toBeInTheDocument()

    expect(await screen.findByText('Ahorré ARS')).toBeInTheDocument()
    expect(await screen.findByLabelText(/monto/i)).toBeInTheDocument()
  })

  it('renders error state when context loading fails and allows retry', async () => {
    const user = userEvent.setup()
    vi.mocked(getSavingContributionContext)
      .mockRejectedValueOnce(new Error('Error de conexión'))
      .mockResolvedValueOnce({
        profile: 'present',
        context: sampleContext,
      })

    render(<SavingContributionSheet open={true} onOpenChange={vi.fn()} />)

    expect(await screen.findByText('Error de conexión')).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /reintentar/i })
    await user.click(retryBtn)

    expect(await screen.findByText('Ahorré ARS')).toBeInTheDocument()
  })

  it('renders missing profile error when profile is not found', async () => {
    vi.mocked(getSavingContributionContext).mockResolvedValue({
      profile: 'missing',
    })

    render(<SavingContributionSheet open={true} onOpenChange={vi.fn()} />)

    expect(
      await screen.findByText('Completá tu perfil financiero antes de registrar un ahorro.'),
    ).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup()
    const handleOpenChange = vi.fn()
    vi.mocked(getSavingContributionContext).mockResolvedValue({
      profile: 'present',
      context: sampleContext,
    })

    render(<SavingContributionSheet open={true} onOpenChange={handleOpenChange} />)

    const cancelBtn = await screen.findByRole('button', { name: 'Cancelar' })
    await user.click(cancelBtn)

    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })
})
