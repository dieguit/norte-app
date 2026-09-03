// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import { usePostHog } from '@posthog/react'
import { toast } from 'sonner'
import {
  confirmGoalCompletion,
  previewGoalCompletion,
} from './goals.functions'
import type {
  GoalCompletionContext,
  GoalCompletionPreviewResult,
} from './goal-completion'
import { GoalCompletion } from './GoalCompletion'

vi.mock('@tanstack/react-router', () => ({ useRouter: vi.fn() }))
vi.mock('@posthog/react', () => ({ usePostHog: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('./goals.functions', () => ({
  previewGoalCompletion: vi.fn(),
  confirmGoalCompletion: vi.fn(),
}))

const invalidate = vi.fn().mockResolvedValue(undefined)
const capture = vi.fn()

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ invalidate } as never)
  vi.mocked(usePostHog).mockReturnValue({ capture } as never)
})

const context: GoalCompletionContext = {
  goalId: 'goal-1',
  goalName: 'Viaje',
  targetAmount: { amount: '1000.00', currency: 'ARS' },
  savingsValue: { amount: '1000.00', currency: 'ARS' },
  currentMonth: '2026-08',
  plannedMonthlyContribution: { amount: '100000.00', currency: 'ARS' },
  savingsPlaces: [
    { id: 'place-1', name: 'Caja de ahorro', balance: { amount: '600.00', currency: 'ARS' } },
    { id: 'place-2', name: 'Efectivo', balance: { amount: '500.00', currency: 'ARS' } },
  ],
  activeGoals: [
    { id: 'goal-1', name: 'Viaje', currency: 'ARS' },
    { id: 'goal-2', name: 'Emergencias', currency: 'ARS' },
    { id: 'goal-3', name: 'Jubilación', currency: 'ARS' },
  ],
  currentAllocation: {
    effectiveMonth: '2026-08-01',
    entries: [
      { goalId: 'goal-1', percentage: '20.00' },
      { goalId: 'goal-2', percentage: '50.00' },
      { goalId: 'goal-3', percentage: '30.00' },
    ],
  },
}

const emptyAllocationPreview = () => ({
  monthlyContribution: { amount: '100000.00', currency: 'ARS' as const },
  effectiveMonth: '2026-09-01',
  totalPercentage: '100.00',
  entries: [
    { goalId: 'goal-1', goalName: 'Viaje', percentage: '0.00', pending: false },
    { goalId: 'goal-2', goalName: 'Emergencias', percentage: '62.50', pending: false },
    { goalId: 'goal-3', goalName: 'Jubilación', percentage: '37.50', pending: false },
  ],
})

const preview = (token = 'a'.repeat(64)): GoalCompletionPreviewResult => ({
  previewToken: token,
  proposal: {
    goalId: 'goal-1',
    goalName: 'Viaje',
    targetAmount: context.targetAmount,
    withdrawals: [
      { placeId: 'place-1', placeName: 'Caja de ahorro', amount: { amount: '600.00', currency: 'ARS' } },
      { placeId: 'place-2', placeName: 'Efectivo', amount: { amount: '400.00', currency: 'ARS' } },
    ],
    allocation: emptyAllocationPreview(),
    persistedAllocation: { effectiveMonth: '2026-09-01', entries: [] },
    pauseMonthlyCommitment: false,
    impacts: [
      {
        goalId: 'goal-2',
        goalName: 'Emergencias',
        before: { status: 'existing', projection: { status: 'available', completionMonth: '2027-01' }, allocatedMonthlyAmounts: [] },
        after: { status: 'available', completionMonth: '2026-12' },
      },
    ],
    proposedSource: {} as never,
  },
})

function renderCompletion(overrides: Partial<Parameters<typeof GoalCompletion>[0]> = {}) {
  return render(
    <GoalCompletion
      context={context}
      onCancel={vi.fn()}
      onUpdated={vi.fn()}
      {...overrides}
    />,
  )
}

async function fillWithdrawals() {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Monto a retirar de Caja de ahorro' }), '600')
  await user.type(screen.getByRole('textbox', { name: 'Monto a retirar de Efectivo' }), '400')
  return user
}

describe('GoalCompletion', () => {
  it('explains completion, renders only supplied places, starts empty, and reports the running total', () => {
    renderCompletion()

    expect(screen.getByText('Completar Viaje significa usar los ahorros acumulados para alcanzar el objetivo; las deducciones quedan registradas y reducen esos lugares de ahorro.')).toBeInTheDocument()
    expect(screen.getByText(/las deducciones/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '¿De dónde sale el dinero?' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Monto a retirar de Caja de ahorro' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Monto a retirar de Efectivo' })).toHaveValue('')
    expect(screen.queryByText('Lugar no suministrado')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Seleccionado: $ 0,00 de $ 1.000,00')
  })

  it('shows inline errors for malformed, below-target, and above-balance amounts', async () => {
    const user = userEvent.setup()
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    renderCompletion()

    const caja = screen.getByRole('textbox', { name: 'Monto a retirar de Caja de ahorro' })
    await user.type(caja, '0')
    expect(screen.getByText('Ingresá un monto mayor a cero, con hasta dos decimales.')).toBeInTheDocument()

    await user.clear(caja)
    await user.type(caja, '500')
    await user.type(screen.getByRole('textbox', { name: 'Monto a retirar de Efectivo' }), '400')
    expect(screen.getByText('Los montos deben sumar exactamente el objetivo.')).toBeInTheDocument()

    await user.clear(caja)
    await user.type(caja, '601')
    expect(screen.getByText('El monto supera el saldo disponible en Caja de ahorro.')).toBeInTheDocument()

    await user.clear(caja)
    await user.type(caja, '600')
    await user.clear(screen.getByRole('textbox', { name: 'Monto a retirar de Efectivo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto a retirar de Efectivo' }), '500')
    expect(screen.getByText('Los montos deben sumar exactamente el objetivo.')).toBeInTheDocument()
  })

  it('omits the completed target from redistribution and explains the released contribution', () => {
    renderCompletion()

    const planSection = screen.getByRole('heading', { name: 'Redistribuí tu Plan' }).closest('section')
    expect(planSection).not.toBeNull()
    const section = within(planSection as HTMLElement)

    expect(section.getByText('Al completar este objetivo, su aporte mensual queda disponible para tus otros objetivos.')).toBeInTheDocument()
    expect(section.queryByText('Viaje')).not.toBeInTheDocument()
    expect(section.queryByText('Sin asignación de aporte mensual')).not.toBeInTheDocument()
    expect(section.queryByText('Completado')).not.toBeInTheDocument()
    expect(section.queryByTestId('completion-target-row')).not.toBeInTheDocument()
  })

  it('keeps the allocation editor disabled until withdrawals are valid and shows the exact total', async () => {
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    renderCompletion()
    const user = userEvent.setup()
    const editorInput = screen.getByRole('textbox', { name: 'Porcentaje para Emergencias' })
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeDisabled()
    expect(editorInput).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: 'Monto a retirar de Caja de ahorro' }), '600')
    await user.type(screen.getByRole('textbox', { name: 'Monto a retirar de Efectivo' }), '400')
    await waitFor(() => expect(editorInput).toBeEnabled())
    expect(screen.getByRole('status')).toHaveTextContent('Seleccionado: $ 1.000,00 de $ 1.000,00')
  })

  it('requests a valid preview, renders pending/synced state, and shows allocation impact', async () => {
    let resolvePreview!: (value: GoalCompletionPreviewResult) => void
    vi.mocked(previewGoalCompletion).mockReturnValue(new Promise((resolve) => { resolvePreview = resolve }) as never)
    renderCompletion()
    await fillWithdrawals()

    await waitFor(() => expect(previewGoalCompletion).toHaveBeenCalledWith({
      data: expect.objectContaining({
        goalId: 'goal-1',
        withdrawals: [
          { placeId: 'place-1', amount: '600.00' },
          { placeId: 'place-2', amount: '400.00' },
        ],
      }),
    }))
    expect(screen.getByText('Actualizando impacto...')).toBeInTheDocument()
    resolvePreview(preview())
    expect(await screen.findByText('Impacto en las fechas')).toBeInTheDocument()
    expect(screen.getAllByText('Emergencias').length).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled()

    const percentage = screen.getByRole('textbox', { name: 'Porcentaje para Emergencias' })
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    fireEvent.change(percentage, { target: { value: '60' } })
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeDisabled()
    expect(await screen.findByText('Proyección pendiente de actualización')).toBeInTheDocument()
  })

  it('keeps ordinary preview failures local and leaves the form retryable', async () => {
    const onContextInvalid = vi.fn().mockResolvedValue(undefined)
    vi.mocked(previewGoalCompletion).mockRejectedValue(new Error('No pudimos calcular la proyección.'))
    renderCompletion({ onContextInvalid })

    await fillWithdrawals()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos calcular la proyección.')
    expect(alert).toHaveFocus()
    expect(onContextInvalid).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Revisar datos actualizados' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeDisabled()
  })

  it('shows an aggregate balance shortfall and blocks the completion controls', () => {
    renderCompletion({
      context: {
        ...context,
        targetAmount: { amount: '1200.00', currency: 'ARS' },
        savingsValue: { amount: '1200.00', currency: 'ARS' },
      },
    })

    expect(screen.getByText('El saldo disponible entre tus lugares de ahorro no alcanza para este objetivo. Faltan $ 100,00.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Porcentaje para Emergencias' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeDisabled()
  })

  it('allows an empty allocation when completing the final active goal', async () => {
    const finalContext = { ...context, activeGoals: [{ id: 'goal-1', name: 'Viaje', currency: 'ARS' as const }] }
    const finalPreview = preview()
    finalPreview.proposal.allocation = {
      ...finalPreview.proposal.allocation,
      totalPercentage: '0.00',
      entries: [{ goalId: 'goal-1', goalName: 'Viaje', percentage: '0.00', pending: false }],
    }
    vi.mocked(previewGoalCompletion).mockResolvedValue(finalPreview)
    renderCompletion({ context: finalContext })
    expect(screen.getByText(/el plan mensual se va a pausar/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Porcentaje para Viaje' })).not.toBeInTheDocument()

    const user = await fillWithdrawals()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))
    expect(confirmGoalCompletion).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        allocations: [{ goalId: 'goal-1', percentage: '0.00' }],
      }),
    }))
  })

  it('handles stale confirmation with focused refreshed state', async () => {
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'stale', preview: preview('b'.repeat(64)) })
    renderCompletion()
    const user = await fillWithdrawals()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Tus saldos o tu Plan cambiaron. Revisá los retiros y la distribución actualizados antes de confirmar.')
    expect(alert).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Revisar datos actualizados' })).toBeInTheDocument()
  })

  it('keeps a valid refreshed stale preview blocked until the explicit review action succeeds', async () => {
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'stale', preview: preview('b'.repeat(64)) })
    renderCompletion()
    const user = await fillWithdrawals()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))

    expect(screen.getByRole('button', { name: 'Revisar datos actualizados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Revisar datos actualizados' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    expect(screen.queryByRole('button', { name: 'Revisar datos actualizados' })).not.toBeInTheDocument()
  })

  it('keeps review-refresh failures local instead of reloading context', async () => {
    const onContextInvalid = vi.fn().mockResolvedValue(undefined)
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'stale', preview: preview('b'.repeat(64)) })
    renderCompletion({ onContextInvalid })
    const user = await fillWithdrawals()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))
    expect(onContextInvalid).toHaveBeenCalledOnce()

    vi.mocked(previewGoalCompletion).mockRejectedValueOnce(new Error('No pudimos actualizar la proyección.'))
    await user.click(screen.getByRole('button', { name: 'Revisar datos actualizados' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos actualizar la proyección.')
    expect(alert).toHaveFocus()
    expect(onContextInvalid).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Revisar datos actualizados' })).toBeInTheDocument()
  })

  it('refetches context on invalid state and focuses the safe alert', async () => {
    const onContextInvalid = vi.fn().mockResolvedValue(undefined)
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'invalid', message: 'El objetivo ya no está disponible.' })
    renderCompletion({ onContextInvalid })
    const user = await fillWithdrawals()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El objetivo ya no está disponible.')
    expect(alert).toHaveFocus()
    expect(onContextInvalid).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Revisar datos actualizados' })).toBeInTheDocument()
  })

  it('focuses generic confirmation errors and completes with analytics, invalidation, toast, and update', async () => {
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockRejectedValue(new Error('No pudimos guardar el cambio.'))
    const onUpdated = vi.fn()
    renderCompletion({ onUpdated })
    const user = await fillWithdrawals()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar el cambio.')
    expect(screen.getByRole('alert')).toHaveFocus()

    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'completed', completedAt: '2026-08-01T00:00:00Z' })
    await user.click(screen.getByRole('button', { name: 'Confirmar, marcar como completado' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalled())
    expect(capture).toHaveBeenCalledWith('goal_completed')
    expect(toast.success).toHaveBeenCalled()
    expect(onUpdated).toHaveBeenCalled()
  })

  it('locks withdrawal inputs while confirmation is pending and preserves the submitted draft', async () => {
    let resolveConfirm!: (value: { status: 'completed'; completedAt: string }) => void
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockReturnValue(new Promise((resolve) => { resolveConfirm = resolve }) as never)
    renderCompletion()
    const user = await fillWithdrawals()
    const confirm = screen.getByRole('button', { name: 'Confirmar, marcar como completado' })
    await waitFor(() => expect(confirm).toBeEnabled())

    fireEvent.click(confirm)
    await waitFor(() => expect(confirmGoalCompletion).toHaveBeenCalled())
    for (const input of screen.getAllByRole('textbox')) expect(input).toBeDisabled()

    const caja = screen.getByRole('textbox', { name: 'Monto a retirar de Caja de ahorro' })
    fireEvent.change(caja, { target: { value: '500' } })
    expect(caja).toHaveValue('600')
    expect(confirmGoalCompletion).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        withdrawals: [
          { placeId: 'place-1', amount: '600.00' },
          { placeId: 'place-2', amount: '400.00' },
        ],
      }),
    }))

    resolveConfirm({ status: 'completed', completedAt: '2026-08-01T00:00:00Z' })
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  })

  it('invalidates the old preview when context data changes with the same draft', async () => {
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    const props = { context, onCancel: vi.fn(), onUpdated: vi.fn() }
    const { rerender } = render(<GoalCompletion {...props} />)
    await fillWithdrawals()
    const confirm = screen.getByRole('button', { name: 'Confirmar, marcar como completado' })
    await waitFor(() => expect(confirm).toBeEnabled())

    const changedContext = {
      ...context,
      savingsPlaces: context.savingsPlaces.map((place) =>
        place.id === 'place-1' ? { ...place, balance: { amount: '700.00', currency: 'ARS' as const } } : place,
      ),
    }
    rerender(<GoalCompletion {...props} context={changedContext} />)

    await waitFor(() => expect(confirm).toBeDisabled())
    expect(previewGoalCompletion).toHaveBeenCalledTimes(1)
    expect(confirmGoalCompletion).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Revisar datos actualizados' })).toBeInTheDocument()
  })

  it('keeps the initial confirmation disabled and submits the exact completion payload', async () => {
    vi.mocked(previewGoalCompletion).mockResolvedValue(preview())
    vi.mocked(confirmGoalCompletion).mockResolvedValue({ status: 'completed', completedAt: '2026-08-01T00:00:00Z' })
    renderCompletion()
    const confirm = screen.getByRole('button', { name: 'Confirmar, marcar como completado' })
    expect(confirm).toBeDisabled()
    const user = await fillWithdrawals()
    await waitFor(() => expect(confirm).toBeEnabled())
    await user.click(confirm)

    expect(confirmGoalCompletion).toHaveBeenCalledWith({
      data: {
        goalId: 'goal-1',
        withdrawals: [
          { placeId: 'place-1', amount: '600.00' },
          { placeId: 'place-2', amount: '400.00' },
        ],
        allocations: [
          { goalId: 'goal-1', percentage: '0.00' },
          { goalId: 'goal-2', percentage: '62.50' },
          { goalId: 'goal-3', percentage: '37.50' },
        ],
        previewToken: 'a'.repeat(64),
      },
    })
  })

  it('stacks full-width footer buttons on mobile and uses a row on larger screens', () => {
    renderCompletion()
    const cancel = screen.getByRole('button', { name: 'Cancelar' })
    const footer = cancel.parentElement
    expect(footer).toHaveClass('flex-col', 'sm:flex-row')
    expect(cancel).toHaveClass('w-full', 'sm:w-auto')
    expect(screen.getByRole('button', { name: 'Confirmar, marcar como completado' })).toHaveClass('w-full', 'sm:w-auto')
  })

  it('calls cancel without completing', async () => {
    const onCancel = vi.fn()
    renderCompletion({ onCancel })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalled()
    expect(confirmGoalCompletion).not.toHaveBeenCalled()
  })
})
