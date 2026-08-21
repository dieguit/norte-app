// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalEditSheet } from './GoalEditSheet'
import { getGoalEditContext } from '../../../../features/goals/goals.functions'
import type { GoalCreationDraft } from '../../../../features/goals/goal-creation.schema'
import type { GoalCreationContext } from '../../../../features/goals/goal-creation'

vi.mock('../../../../features/goals/goals.functions', () => ({
  getGoalEditContext: vi.fn(),
  previewGoalEdit: vi.fn(),
  confirmGoalEdit: vi.fn(),
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
  hasEmergencyFund: false,
  plannedMonthlyContribution: { amount: '100000.00', currency: 'ARS' },
  currentAllocation: {
    effectiveMonth: '2026-08-01',
    entries: [{ goalId: 'goal-1', percentage: '100.00' }],
  },
}

const sampleDraft: GoalCreationDraft = {
  type: 'purchase',
  name: 'Viaje a Japón',
  targetAmount: '5.000.000',
  currency: 'USD',
  desiredMonth: '2027-10',
  priority: 'medium',
  strategy: 'invest',
  annualReturnRate: '12',
  availability: 'available_from',
  availableFromMonth: '2027-01',
  allocations: [{ goalId: 'goal-1', percentage: '100.00' }],
}

describe('GoalEditSheet', () => {
  it('does not render sheet contents when open is false', () => {
    render(<GoalEditSheet open={false} goalId="goal-1" onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getGoalEditContext).not.toHaveBeenCalled()
  })

  it('does not fetch context when goalId is null', () => {
    render(<GoalEditSheet open={true} goalId={null} onOpenChange={vi.fn()} />)
    expect(getGoalEditContext).not.toHaveBeenCalled()
  })

  it('renders loading skeleton and then GoalCreation when open is true with goalId', async () => {
    vi.mocked(getGoalEditContext).mockResolvedValue({
      profile: 'present',
      goalId: 'goal-1',
      draft: sampleDraft,
      context: sampleContext,
    })

    render(<GoalEditSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Editar objetivo')).toBeInTheDocument()
    expect(
      screen.getByText('Actualizá el objetivo, su Plan y revisá el impacto antes de confirmar.'),
    ).toBeInTheDocument()

    expect(await screen.findByLabelText('Nombre del objetivo')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del objetivo')).toHaveValue('Viaje a Japón')
  })

  it('renders error state when context loading fails', async () => {
    vi.mocked(getGoalEditContext).mockRejectedValue(new Error('No se pudo cargar el objetivo.'))

    render(<GoalEditSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)

    expect(await screen.findByText('No se pudo cargar el objetivo.')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup()
    const handleOpenChange = vi.fn()
    vi.mocked(getGoalEditContext).mockResolvedValue({
      profile: 'present',
      goalId: 'goal-1',
      draft: sampleDraft,
      context: sampleContext,
    })

    render(<GoalEditSheet open={true} goalId="goal-1" onOpenChange={handleOpenChange} />)

    const cancelBtn = await screen.findByRole('button', { name: 'Cancelar' })
    await user.click(cancelBtn)

    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders GoalCreation for a paused goal', async () => {
    vi.mocked(getGoalEditContext).mockResolvedValue({
      profile: 'present',
      goalId: 'goal-2',
      status: 'paused',
      draft: {
        ...sampleDraft,
        name: 'Auto usado',
      },
      context: sampleContext,
    })

    render(<GoalEditSheet open={true} goalId="goal-2" onOpenChange={vi.fn()} />)

    expect(await screen.findByLabelText('Nombre del objetivo')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del objetivo')).toHaveValue('Auto usado')
  })
})
