// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalCreationSheet } from './GoalCreationSheet'
import { getGoalCreationContext } from '../../../../features/goals/goals.functions'
import type { GoalCreationContext } from '../../../../features/goals/goal-creation'

vi.mock('../../../../features/goals/goals.functions', () => ({
  getGoalCreationContext: vi.fn(),
  previewGoalCreation: vi.fn(),
  confirmGoalCreation: vi.fn(),
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

const sampleContext: GoalCreationContext = {
  currentMonth: '2026-08',
  expensesKnowledge: 'known',
  fundingOptions: [
    {
      fundingMethod: 'save',
      destinationCurrency: 'ARS',
      baseCurrency: 'ARS',
      monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
      commitmentStatus: 'active',
    },
  ],
}

describe('GoalCreationSheet', () => {
  it('does not render sheet contents when open is false', () => {
    render(<GoalCreationSheet open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders loading skeleton and then GoalCreation when open is true', async () => {
    vi.mocked(getGoalCreationContext).mockResolvedValue({
      profile: 'present',
      context: sampleContext,
    })

    render(<GoalCreationSheet open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Nuevo objetivo')).toBeInTheDocument()

    expect(await screen.findByLabelText('Nombre del objetivo')).toBeInTheDocument()
  })

  it('renders error state when context loading fails', async () => {
    vi.mocked(getGoalCreationContext).mockRejectedValue(new Error('Network error'))

    render(<GoalCreationSheet open={true} onOpenChange={vi.fn()} />)

    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup()
    const handleOpenChange = vi.fn()
    vi.mocked(getGoalCreationContext).mockResolvedValue({
      profile: 'present',
      context: sampleContext,
    })

    render(<GoalCreationSheet open={true} onOpenChange={handleOpenChange} />)

    const cancelBtn = await screen.findByRole('button', { name: 'Cancelar' })
    await user.click(cancelBtn)

    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })
})
