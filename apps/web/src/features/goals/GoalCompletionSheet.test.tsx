// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmGoalCompletion,
  getGoalCompletionContext,
  previewGoalCompletion,
} from './goals.functions'
import type { GoalCompletionContext, GoalCompletionPreviewResult } from './goal-completion'
import { GoalCompletionSheet } from './GoalCompletionSheet'

vi.mock('./goals.functions', () => ({
  getGoalCompletionContext: vi.fn(),
  previewGoalCompletion: vi.fn(),
  confirmGoalCompletion: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ invalidate: vi.fn() }) }))
vi.mock('@posthog/react', () => ({ usePostHog: () => ({ capture: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const context: GoalCompletionContext = {
  goalId: 'goal-1',
  goalName: 'Viaje',
  targetAmount: { amount: '1000.00', currency: 'ARS' },
  savingsValue: { amount: '1000.00', currency: 'ARS' },
  currentMonth: '2026-08',
  savingsPlaces: [{ id: 'place-1', name: 'Caja', balance: { amount: '1000.00', currency: 'ARS' } }],
  activeGoals: [{ id: 'goal-1', name: 'Viaje', currency: 'ARS' }],
}

const present = { profile: 'present' as const, context }

const preview = (): GoalCompletionPreviewResult => ({
  previewToken: 'a'.repeat(64),
  proposal: {
    goalId: 'goal-1',
    goalName: 'Viaje',
    targetAmount: context.targetAmount,
    withdrawals: [{ placeId: 'place-1', placeName: 'Caja', amount: { amount: '1000.00', currency: 'ARS' } }],
      allocation: {
        monthlyContribution: { amount: '100000.00', currency: 'ARS' },
        effectiveMonth: '2026-09-01',
        totalPercentage: '100.00',
        entries: [
          { goalId: 'goal-1', goalName: 'Viaje', percentage: '0.00', pending: false },
        ],
      },
      persistedAllocation: { effectiveMonth: '2026-09-01', entries: [] },
    pauseMonthlyCommitment: false,
    impacts: [],
    proposedSource: {} as never,
  },
})

describe('GoalCompletionSheet', () => {
  it('does not fetch while closed or without a goal', () => {
    render(<GoalCompletionSheet open={false} goalId="goal-1" onOpenChange={vi.fn()} />)
    expect(getGoalCompletionContext).not.toHaveBeenCalled()

    render(<GoalCompletionSheet open={true} goalId={null} onOpenChange={vi.fn()} />)
    expect(getGoalCompletionContext).not.toHaveBeenCalled()
  })

  it('renders the exact shell copy and loading state, then fetches only on open with goalId', async () => {
    let resolve!: (value: typeof present) => void
    vi.mocked(getGoalCompletionContext).mockReturnValue(new Promise((res) => { resolve = res }) as never)
    render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Completar objetivo')).toBeInTheDocument()
    expect(screen.getByText(/usá los ahorros acumulados/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    expect(getGoalCompletionContext).toHaveBeenCalledWith({ data: { goalId: 'goal-1' } })

    resolve(present)
    expect(await screen.findByRole('heading', { name: '¿De dónde sale el dinero?' })).toBeInTheDocument()
  })

  it('shows missing profile and request errors', async () => {
    vi.mocked(getGoalCompletionContext).mockResolvedValueOnce({ profile: 'missing' })
    render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)
    expect(await screen.findByText(/completá tu perfil financiero/i)).toBeInTheDocument()

    cleanup()
    vi.mocked(getGoalCompletionContext).mockRejectedValueOnce(new Error('No pudimos cargar el objetivo.'))
    render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)
    expect(await screen.findByText('No pudimos cargar el objetivo.')).toBeInTheDocument()
  })

  it('ignores a cancelled request', async () => {
    let resolve!: (value: typeof present) => void
    vi.mocked(getGoalCompletionContext).mockReturnValue(new Promise((res) => { resolve = res }) as never)
    const { rerender } = render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)
    rerender(<GoalCompletionSheet open={false} goalId="goal-1" onOpenChange={vi.fn()} />)
    resolve(present)
    await waitFor(() => expect(screen.queryByRole('heading', { name: '¿De dónde sale el dinero?' })).not.toBeInTheDocument())

    vi.mocked(getGoalCompletionContext).mockResolvedValue(present)
    rerender(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)
    await screen.findByRole('heading', { name: '¿De dónde sale el dinero?' })
    expect(getGoalCompletionContext).toHaveBeenCalledTimes(2)
  })

  it('ignores a stale response after switching goals', async () => {
    let resolveFirst!: (value: typeof present) => void
    let resolveSecond!: (value: typeof present) => void
    const secondContext = {
      ...context,
      goalId: 'goal-2',
      goalName: 'Emergencias',
      savingsPlaces: [{ id: 'place-2', name: 'Caja nueva', balance: { amount: '1000.00', currency: 'ARS' as const } }],
    }
    vi.mocked(getGoalCompletionContext)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }) as never)
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }) as never)
    const { rerender } = render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)
    rerender(<GoalCompletionSheet open={true} goalId="goal-2" onOpenChange={vi.fn()} />)

    resolveFirst(present)
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Monto a retirar de Caja' })).not.toBeInTheDocument())
    resolveSecond({ profile: 'present', context: secondContext })
    expect(await screen.findByText('Completar Emergencias significa usar los ahorros acumulados para alcanzar el objetivo; las deducciones quedan registradas y reducen esos lugares de ahorro.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Monto a retirar de Caja' })).not.toBeInTheDocument()
  })

  it('refetches after stale confirmation without leaving the sheet, displays refreshed context, and blocks confirmation', async () => {
    const refreshedContext: GoalCompletionContext = {
      ...context,
      savingsPlaces: [{ id: 'place-1', name: 'Caja actualizada', balance: { amount: '900.00', currency: 'ARS' } }],
      activeGoals: [
        ...context.activeGoals,
        { id: 'goal-3', name: 'Fondo nuevo', currency: 'ARS' },
      ],
    }
    vi.mocked(getGoalCompletionContext)
      .mockResolvedValueOnce(present)
      .mockResolvedValueOnce({ profile: 'present', context: refreshedContext })
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'stale', preview: preview() })

    render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(await screen.findByRole('textbox', { name: 'Monto a retirar de Caja' }), '1000')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))

    expect(await screen.findByText('Caja actualizada')).toBeInTheDocument()
    expect(screen.getByText('Fondo nuevo')).toBeInTheDocument()
    const alert = screen.getByText(/Tus saldos o tu Plan cambiaron\./)
    expect(alert).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeDisabled()
    expect(getGoalCompletionContext).toHaveBeenCalledTimes(2)
  })

  it('refetches after invalid confirmation, stays open, keeps the alert focused, and blocks confirmation', async () => {
    const refreshedContext: GoalCompletionContext = {
      ...context,
      savingsPlaces: [{ id: 'place-1', name: 'Caja revisada', balance: { amount: '900.00', currency: 'ARS' } }],
    }
    vi.mocked(getGoalCompletionContext)
      .mockResolvedValueOnce(present)
      .mockResolvedValueOnce({ profile: 'present', context: refreshedContext })
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'invalid', message: 'El objetivo ya no está disponible.' })

    render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(await screen.findByRole('textbox', { name: 'Monto a retirar de Caja' }), '1000')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))

    expect(await screen.findByText('Caja revisada')).toBeInTheDocument()
    const alert = screen.getByText('El objetivo ya no está disponible.')
    expect(alert).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeDisabled()
    expect(getGoalCompletionContext).toHaveBeenCalledTimes(2)
  })

  it('clears the form and shows the refetch error when refreshed context cannot load', async () => {
    vi.mocked(getGoalCompletionContext)
      .mockResolvedValueOnce(present)
      .mockRejectedValueOnce(new Error('No pudimos actualizar los datos.'))
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'stale', preview: preview() })

    render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(await screen.findByRole('textbox', { name: 'Monto a retirar de Caja' }), '1000')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))

    expect(await screen.findByText('No pudimos actualizar los datos.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '¿De dónde sale el dinero?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Monto a retirar de Caja' })).not.toBeInTheDocument()
  })

  it('passes close through onOpenChange', async () => {
    const onOpenChange = vi.fn()
    vi.mocked(getGoalCompletionContext).mockResolvedValue(present)
    render(<GoalCompletionSheet open={true} goalId="goal-1" onOpenChange={onOpenChange} />)
    await screen.findByRole('heading', { name: '¿De dónde sale el dinero?' })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    onOpenChange(false)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
