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

    await user.click(screen.getByRole('button', { name: /eliminar aporte de inversión/i }))
    await user.click(screen.getByRole('button', { name: 'Eliminar inversión' }))

    await waitFor(() => {
      expect(deleteSavingContribution).toHaveBeenCalled()
    })
    expect(posthogCapture).not.toHaveBeenCalled()
  })
})
