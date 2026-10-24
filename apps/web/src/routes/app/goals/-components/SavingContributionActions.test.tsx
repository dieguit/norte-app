// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteSavingContribution } from '../../../../features/contributions/saving-contribution.functions'
import { SavingContributionActions } from './SavingContributionActions'

const invalidate = vi.fn().mockResolvedValue(undefined)
const posthogCapture = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate }),
}))
vi.mock('@posthog/react', () => ({
  usePostHog: () => ({ capture: posthogCapture }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../../features/contributions/saving-contribution.functions', () => ({
  deleteSavingContribution: vi.fn(),
}))
vi.mock('../../-components/SavingContribution', () => ({
  SavingContribution: () => null,
}))

afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

describe('SavingContributionActions', () => {
  it('captures a successful contribution deletion', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteSavingContribution).mockResolvedValue({ status: 'deleted' })
    render(
      <SavingContributionActions
        goalId="goal-1"
        contributions={[{
          id: 'contribution-1',
          kind: 'investment',
          amount: '100.00',
          currency: 'USD',
          createdAt: '2026-08-01T00:00:00.000Z',
          allocations: [],
        }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /acciones del aporte de inversión/i }))
    await user.click(screen.getByRole('button', { name: /eliminar aporte de inversión/i }))
    await user.click(screen.getByRole('button', { name: 'Eliminar inversión' }))

    await waitFor(() => {
      expect(posthogCapture).toHaveBeenCalledWith('contribution_deleted', {
        kind: 'investment',
        currency: 'USD',
      })
    })
  })

  it('does not capture when deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteSavingContribution).mockRejectedValue(new Error('Network error'))
    render(
      <SavingContributionActions
        goalId="goal-1"
        contributions={[{
          id: 'contribution-1',
          kind: 'investment',
          amount: '100.00',
          currency: 'USD',
          createdAt: '2026-08-01T00:00:00.000Z',
          allocations: [],
        }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /acciones del aporte de inversión/i }))
    await user.click(screen.getByRole('button', { name: /eliminar aporte de inversión/i }))
    await user.click(screen.getByRole('button', { name: 'Eliminar inversión' }))

    await waitFor(() => {
      expect(deleteSavingContribution).toHaveBeenCalled()
    })
    expect(posthogCapture).not.toHaveBeenCalled()
  })

  it('renders completed history as read-only', () => {
    render(
      <SavingContributionActions
        goalId="goal-1"
        readOnly
        contributions={[{
          id: 'contribution-1',
          kind: 'saving',
          amount: '100.00',
          currency: 'USD',
          createdAt: '2026-08-01T00:00:00.000Z',
          allocations: [],
        }]}
      />,
    )

    expect(screen.getByRole('listitem')).toHaveTextContent('+US$ 100,00')
    expect(screen.queryByRole('button', { name: /acciones del aporte/i })).not.toBeInTheDocument()
  })

  it('renders negative corrections with a minus sign in negative tone', () => {
    render(
      <SavingContributionActions
        goalId="goal-1"
        contributions={[{ id: 'neg', kind: 'saving', amount: '-5.00', currency: 'USD', placeName: 'Alcancía', createdAt: '2026-10-20T10:00:00Z', allocations: [] }]}
      />,
    )
    const amount = screen.getByText('−US$ 5')
    expect(amount).toHaveClass('text-negative')
    expect(screen.getByText('Ahorro · Alcancía')).toBeInTheDocument()
  })

  it('resets delete confirmation when canceled and reopened', async () => {
    const user = userEvent.setup()
    render(
      <SavingContributionActions
        goalId="goal-1"
        contributions={[{
          id: 'contribution-1',
          kind: 'saving',
          amount: '100.00',
          currency: 'USD',
          placeName: 'Alcancía',
          createdAt: '2026-08-01T00:00:00.000Z',
          allocations: [],
        }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /acciones del aporte de ahorro/i }))
    await user.click(screen.getByRole('button', { name: /eliminar aporte de ahorro/i }))
    expect(screen.getByText(/¿Estás seguro/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByText(/¿Estás seguro/i)).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /acciones del aporte de ahorro/i }))
    expect(screen.getByRole('button', { name: /corregir aporte/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /eliminar aporte/i })).toBeInTheDocument()
    expect(screen.queryByText(/¿Estás seguro/i)).not.toBeInTheDocument()
  })
})
