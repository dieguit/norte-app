// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type {
  GoalLifecycleContext,
  GoalLifecyclePreviewResult,
} from '../../../../features/goals/goal-lifecycle'
import {
  confirmGoalLifecycle,
  getGoalLifecycleContext,
  previewGoalLifecycle,
} from '../../../../features/goals/goals.functions'
import { GoalLifecycle } from './GoalLifecycle'
import { GoalLifecycleSheet } from './GoalLifecycleSheet'

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../../features/goals/goals.functions', () => ({
  getGoalLifecycleContext: vi.fn(),
  previewGoalLifecycle: vi.fn(),
  confirmGoalLifecycle: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockRouterInvalidate = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    invalidate: mockRouterInvalidate,
  } as any)
})

describe('GoalLifecycle component', () => {
  const pauseContext: GoalLifecycleContext = {
    goalId: 'goal-travel',
    lifecycle: 'pause',
    goalName: 'Viaje',
    currentMonth: '2026-08',
    plannedMonthlyContribution: { amount: '100000.00', currency: 'ARS' },
    activeGoals: [
      { id: 'goal-travel', name: 'Viaje', currency: 'ARS' },
      { id: 'goal-emergency', name: 'Fondo de emergencia', currency: 'ARS' },
      { id: 'goal-retirement', name: 'Jubilación', currency: 'ARS' },
    ],
    currentAllocation: {
      effectiveMonth: '2026-08-01',
      entries: [
        { goalId: 'goal-travel', percentage: '20.00' },
        { goalId: 'goal-emergency', percentage: '40.00' },
        { goalId: 'goal-retirement', percentage: '40.00' },
      ],
    },
  }

  const resumeContext: GoalLifecycleContext = {
    goalId: 'goal-travel',
    lifecycle: 'resume',
    goalName: 'Viaje',
    currentMonth: '2026-08',
    plannedMonthlyContribution: { amount: '100000.00', currency: 'ARS' },
    activeGoals: [
      { id: 'goal-emergency', name: 'Fondo de emergencia', currency: 'ARS' },
      { id: 'goal-retirement', name: 'Jubilación', currency: 'ARS' },
    ],
    currentAllocation: {
      effectiveMonth: '2026-08-01',
      entries: [
        { goalId: 'goal-emergency', percentage: '50.00' },
        { goalId: 'goal-retirement', percentage: '50.00' },
      ],
    },
  }

  const singleGoalPauseContext: GoalLifecycleContext = {
    goalId: 'goal-only',
    lifecycle: 'pause',
    goalName: 'Fondo único',
    currentMonth: '2026-08',
    plannedMonthlyContribution: { amount: '50000.00', currency: 'ARS' },
    activeGoals: [{ id: 'goal-only', name: 'Fondo único', currency: 'ARS' }],
    currentAllocation: {
      effectiveMonth: '2026-08-01',
      entries: [{ goalId: 'goal-only', percentage: '100.00' }],
    },
  }

  const makeMockPausePreview = (): GoalLifecyclePreviewResult => ({
    previewToken: '1'.repeat(64),
    proposal: {
      lifecycle: 'pause',
      goalId: 'goal-travel',
      nextStatus: 'paused',
      transition: { goalId: 'goal-travel', status: 'paused' },
      pauseMonthlyCommitment: false,
      allocation: {
        monthlyContribution: { amount: '100000.00', currency: 'ARS' },
        effectiveMonth: '2026-09-01',
        totalPercentage: '100.00',
        entries: [
          {
            goalId: 'goal-travel',
            goalName: 'Viaje',
            percentage: '0.00',
            allocatedBaseAmount: { amount: '0.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '0.00', currency: 'ARS' },
            pending: false,
          },
          {
            goalId: 'goal-emergency',
            goalName: 'Fondo de emergencia',
            percentage: '50.00',
            allocatedBaseAmount: { amount: '50000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '50000.00', currency: 'ARS' },
            pending: false,
          },
          {
            goalId: 'goal-retirement',
            goalName: 'Jubilación',
            percentage: '50.00',
            allocatedBaseAmount: { amount: '50000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '50000.00', currency: 'ARS' },
            pending: false,
          },
        ],
      },
      persistedAllocation: {
        effectiveMonth: '2026-09-01',
        entries: [
          { goalId: 'goal-emergency', percentage: '50.00' },
          { goalId: 'goal-retirement', percentage: '50.00' },
        ],
      },
      impacts: [
        {
          goalId: 'goal-travel',
          goalName: 'Viaje',
          before: {
            status: 'existing',
            projection: { status: 'available', completionMonth: '2027-06' },
            allocatedMonthlyAmounts: [{ amount: '20000.00', currency: 'ARS' }],
          },
          after: { status: 'target_unavailable' },
        },
        {
          goalId: 'goal-emergency',
          goalName: 'Fondo de emergencia',
          before: {
            status: 'existing',
            projection: { status: 'available', completionMonth: '2027-01' },
            allocatedMonthlyAmounts: [{ amount: '40000.00', currency: 'ARS' }],
          },
          after: { status: 'available', completionMonth: '2026-12' },
        },
        {
          goalId: 'goal-retirement',
          goalName: 'Jubilación',
          before: {
            status: 'existing',
            projection: { status: 'available', completionMonth: '2030-01' },
            allocatedMonthlyAmounts: [{ amount: '40000.00', currency: 'ARS' }],
          },
          after: { status: 'available', completionMonth: '2029-06' },
        },
      ],
      proposedSource: {
        profile: null,
        goals: [],
        savingsPositions: [],
        investmentPositions: [],
        snapshots: [],
        allocations: [],
      },
    },
  })

  const makeMockResumeInitialPreview = (): GoalLifecyclePreviewResult => ({
    previewToken: '2'.repeat(64),
    proposal: {
      lifecycle: 'resume',
      goalId: 'goal-travel',
      nextStatus: 'active',
      transition: { goalId: 'goal-travel', status: 'active' },
      pauseMonthlyCommitment: false,
      allocation: {
        monthlyContribution: { amount: '100000.00', currency: 'ARS' },
        effectiveMonth: '2026-09-01',
        totalPercentage: '100.00',
        entries: [
          {
            goalId: 'goal-travel',
            goalName: 'Viaje',
            percentage: '0.00',
            allocatedBaseAmount: { amount: '0.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '0.00', currency: 'ARS' },
            pending: false,
          },
          {
            goalId: 'goal-emergency',
            goalName: 'Fondo de emergencia',
            percentage: '50.00',
            allocatedBaseAmount: { amount: '50000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '50000.00', currency: 'ARS' },
            pending: false,
          },
          {
            goalId: 'goal-retirement',
            goalName: 'Jubilación',
            percentage: '50.00',
            allocatedBaseAmount: { amount: '50000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '50000.00', currency: 'ARS' },
            pending: false,
          },
        ],
      },
      persistedAllocation: {
        effectiveMonth: '2026-09-01',
        entries: [
          { goalId: 'goal-travel', percentage: '0.00' },
          { goalId: 'goal-emergency', percentage: '50.00' },
          { goalId: 'goal-retirement', percentage: '50.00' },
        ],
      },
      impacts: [
        {
          goalId: 'goal-travel',
          goalName: 'Viaje',
          before: {
            status: 'existing',
            projection: { status: 'target_unavailable' },
            allocatedMonthlyAmounts: [],
          },
          after: { status: 'target_unavailable' },
        },
      ],
      proposedSource: {
        profile: null,
        goals: [],
        savingsPositions: [],
        investmentPositions: [],
        snapshots: [],
        allocations: [],
      },
    },
  })

  const makeMockResumeRebalancedPreview = (): GoalLifecyclePreviewResult => ({
    previewToken: '3'.repeat(64),
    proposal: {
      lifecycle: 'resume',
      goalId: 'goal-travel',
      nextStatus: 'active',
      transition: { goalId: 'goal-travel', status: 'active' },
      pauseMonthlyCommitment: false,
      allocation: {
        monthlyContribution: { amount: '100000.00', currency: 'ARS' },
        effectiveMonth: '2026-09-01',
        totalPercentage: '100.00',
        entries: [
          {
            goalId: 'goal-travel',
            goalName: 'Viaje',
            percentage: '20.00',
            allocatedBaseAmount: { amount: '20000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '20000.00', currency: 'ARS' },
            pending: false,
          },
          {
            goalId: 'goal-emergency',
            goalName: 'Fondo de emergencia',
            percentage: '40.00',
            allocatedBaseAmount: { amount: '40000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '40000.00', currency: 'ARS' },
            pending: false,
          },
          {
            goalId: 'goal-retirement',
            goalName: 'Jubilación',
            percentage: '40.00',
            allocatedBaseAmount: { amount: '40000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '40000.00', currency: 'ARS' },
            pending: false,
          },
        ],
      },
      persistedAllocation: {
        effectiveMonth: '2026-09-01',
        entries: [
          { goalId: 'goal-travel', percentage: '20.00' },
          { goalId: 'goal-emergency', percentage: '40.00' },
          { goalId: 'goal-retirement', percentage: '40.00' },
        ],
      },
      impacts: [
        {
          goalId: 'goal-travel',
          goalName: 'Viaje',
          before: {
            status: 'existing',
            projection: { status: 'target_unavailable' },
            allocatedMonthlyAmounts: [],
          },
          after: { status: 'available', completionMonth: '2027-08' },
        },
      ],
      proposedSource: {
        profile: null,
        goals: [],
        savingsPositions: [],
        investmentPositions: [],
        snapshots: [],
        allocations: [],
      },
    },
  })

  it('starts a resume at 0%, requires a rebalanced 100% allocation, then confirms the preview token', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onUpdated = vi.fn()

    vi.mocked(previewGoalLifecycle)
      .mockResolvedValueOnce(makeMockResumeInitialPreview())
      .mockResolvedValueOnce(makeMockResumeRebalancedPreview())

    vi.mocked(confirmGoalLifecycle).mockResolvedValueOnce({ status: 'updated' })

    render(
      <GoalLifecycle
        lifecycle="resume"
        context={resumeContext}
        onCancel={onCancel}
        onUpdated={onUpdated}
      />,
    )

    // Wait for initial preview
    await waitFor(() => {
      expect(previewGoalLifecycle).toHaveBeenCalled()
    })

    expect(screen.getByDisplayValue('0,00')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reanudar objetivo' })).toBeDisabled()

    const input = screen.getByRole('textbox', { name: 'Porcentaje para Viaje' })
    fireEvent.change(input, { target: { value: '20' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reanudar objetivo' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Reanudar objetivo' }))

    expect(confirmGoalLifecycle).toHaveBeenCalledWith({
      data: expect.objectContaining({
        goalId: 'goal-travel',
        lifecycle: 'resume',
        previewToken: '3'.repeat(64),
      }),
    })

    await waitFor(() => {
      expect(mockRouterInvalidate).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Objetivo reanudado.')
      expect(onUpdated).toHaveBeenCalled()
    })
  })

  it('pauses an active goal with proportional redistribution, previews and confirms', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onUpdated = vi.fn()

    vi.mocked(previewGoalLifecycle).mockResolvedValue(makeMockPausePreview())
    vi.mocked(confirmGoalLifecycle).mockResolvedValueOnce({ status: 'updated' })

    render(
      <GoalLifecycle
        lifecycle="pause"
        context={pauseContext}
        onCancel={onCancel}
        onUpdated={onUpdated}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pausar objetivo' })).toBeEnabled()
    })

    expect(screen.getByText('Pausado')).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Porcentaje para Viaje' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Porcentaje para Fondo de emergencia' })).toHaveValue('50,00')
    expect(screen.getByRole('textbox', { name: 'Porcentaje para Jubilación' })).toHaveValue('50,00')

    await user.click(screen.getByRole('button', { name: 'Pausar objetivo' }))

    expect(confirmGoalLifecycle).toHaveBeenCalledWith({
      data: expect.objectContaining({
        goalId: 'goal-travel',
        lifecycle: 'pause',
        previewToken: '1'.repeat(64),
      }),
    })

    await waitFor(() => {
      expect(mockRouterInvalidate).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Objetivo pausado.')
      expect(onUpdated).toHaveBeenCalled()
    })
  })

  it('keeps the allocation draft and displays a stale-review message', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onUpdated = vi.fn()

    const initialPreview = makeMockPausePreview()
    const refreshedPreview: GoalLifecyclePreviewResult = {
      ...makeMockPausePreview(),
      previewToken: '4'.repeat(64),
    }

    vi.mocked(previewGoalLifecycle).mockResolvedValue(initialPreview)
    vi.mocked(confirmGoalLifecycle).mockResolvedValueOnce({
      status: 'stale',
      preview: refreshedPreview,
    })

    render(
      <GoalLifecycle
        lifecycle="pause"
        context={pauseContext}
        onCancel={onCancel}
        onUpdated={onUpdated}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pausar objetivo' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Pausar objetivo' }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.')
    expect(screen.getAllByText('Viaje')[0]).toBeVisible()
    expect(onUpdated).not.toHaveBeenCalled()
  })

  it('pauses the only active goal with 0% commitment', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onUpdated = vi.fn()

    const singleGoalPreview: GoalLifecyclePreviewResult = {
      previewToken: '5'.repeat(64),
      proposal: {
        lifecycle: 'pause',
        goalId: 'goal-only',
        nextStatus: 'paused',
        transition: { goalId: 'goal-only', status: 'paused' },
        pauseMonthlyCommitment: true,
        allocation: {
          monthlyContribution: undefined,
          effectiveMonth: '2026-09-01',
          totalPercentage: '0.00',
          entries: [
            {
              goalId: 'goal-only',
              goalName: 'Fondo único',
              percentage: '0.00',
              allocatedBaseAmount: undefined,
              allocatedDestinationAmount: undefined,
              pending: false,
            },
          ],
        },
        persistedAllocation: {
          effectiveMonth: '2026-09-01',
          entries: [],
        },
        impacts: [
          {
            goalId: 'goal-only',
            goalName: 'Fondo único',
            before: {
              status: 'existing',
              projection: { status: 'available', completionMonth: '2027-01' },
              allocatedMonthlyAmounts: [{ amount: '50000.00', currency: 'ARS' }],
            },
            after: { status: 'target_unavailable' },
          },
        ],
        proposedSource: {
          profile: null,
          goals: [],
          savingsPositions: [],
          investmentPositions: [],
          snapshots: [],
          allocations: [],
        },
      },
    }

    vi.mocked(previewGoalLifecycle).mockResolvedValue(singleGoalPreview)
    vi.mocked(confirmGoalLifecycle).mockResolvedValue({ status: 'updated' })

    render(
      <GoalLifecycle
        lifecycle="pause"
        context={singleGoalPauseContext}
        onCancel={onCancel}
        onUpdated={onUpdated}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pausar objetivo' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Pausar objetivo' }))

    expect(confirmGoalLifecycle).toHaveBeenCalledWith({
      data: expect.objectContaining({
        goalId: 'goal-only',
        lifecycle: 'pause',
        previewToken: '5'.repeat(64),
      }),
    })
  })

  it('displays server error when confirmation fails', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onUpdated = vi.fn()

    vi.mocked(previewGoalLifecycle).mockResolvedValue(makeMockPausePreview())
    vi.mocked(confirmGoalLifecycle).mockRejectedValueOnce(new Error('Network failure'))

    render(
      <GoalLifecycle
        lifecycle="pause"
        context={pauseContext}
        onCancel={onCancel}
        onUpdated={onUpdated}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pausar objetivo' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Pausar objetivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network failure')
    expect(onUpdated).not.toHaveBeenCalled()
  })

  it('calls onCancel when clicking Cancelar button', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onUpdated = vi.fn()

    vi.mocked(previewGoalLifecycle).mockResolvedValue(makeMockPausePreview())

    render(
      <GoalLifecycle
        lifecycle="pause"
        context={pauseContext}
        onCancel={onCancel}
        onUpdated={onUpdated}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('GoalLifecycleSheet component', () => {
  it('renders pause sheet copy and fetches context on open', async () => {
    vi.mocked(getGoalLifecycleContext).mockResolvedValueOnce({
      profile: 'present',
      goalId: 'goal-travel',
      lifecycle: 'pause',
      goalName: 'Viaje',
      currentMonth: '2026-08',
      activeGoals: [{ id: 'goal-travel', name: 'Viaje', currency: 'ARS' }],
    })
    vi.mocked(previewGoalLifecycle).mockResolvedValueOnce({
      previewToken: '6'.repeat(64),
      proposal: {
        lifecycle: 'pause',
        goalId: 'goal-travel',
        nextStatus: 'paused',
        transition: { goalId: 'goal-travel', status: 'paused' },
        pauseMonthlyCommitment: true,
        allocation: {
          monthlyContribution: undefined,
          effectiveMonth: '2026-09-01',
          totalPercentage: '0.00',
          entries: [],
        },
        persistedAllocation: {
          effectiveMonth: '2026-09-01',
          entries: [],
        },
        impacts: [],
        proposedSource: {
          profile: null,
          goals: [],
          savingsPositions: [],
          investmentPositions: [],
          snapshots: [],
          allocations: [],
        },
      },
    })

    render(
      <GoalLifecycleSheet
        open={true}
        goalId="goal-travel"
        lifecycle="pause"
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Pausar objetivo')).toBeVisible()
    expect(
      screen.getByText('Redistribuí tu Plan y revisá el impacto antes de pausar.'),
    ).toBeVisible()

    await waitFor(() => {
      expect(getGoalLifecycleContext).toHaveBeenCalledWith({
        data: { goalId: 'goal-travel', lifecycle: 'pause' },
      })
    })
  })

  it('renders resume sheet copy and handles missing profile error', async () => {
    vi.mocked(getGoalLifecycleContext).mockResolvedValueOnce({
      profile: 'missing',
    } as any)

    render(
      <GoalLifecycleSheet
        open={true}
        goalId="goal-travel"
        lifecycle="resume"
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Reanudar objetivo')).toBeVisible()
    expect(
      screen.getByText('Definí su lugar en tu Plan y revisá el impacto antes de reanudar.'),
    ).toBeVisible()

    expect(
      await screen.findByText('Completá tu perfil financiero antes de pausar o reanudar un objetivo.'),
    ).toBeVisible()
  })
})
