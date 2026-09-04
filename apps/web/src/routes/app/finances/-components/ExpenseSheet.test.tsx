// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { createExpense, deleteExpense, updateExpense } from '../../../../features/financial/financial.functions'
import { ExpenseSheet } from './ExpenseSheet'

const routerInvalidate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: routerInvalidate }),
}))

const posthogCapture = vi.fn()

vi.mock('@posthog/react', () => ({
  usePostHog: () => ({ capture: posthogCapture }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../../features/financial/financial.functions', () => ({
  createExpense: vi.fn(),
  deleteExpense: vi.fn(),
  updateExpense: vi.fn(),
}))

describe('ExpenseSheet', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.resetAllMocks()
    routerInvalidate.mockResolvedValue(undefined)
  })

  function renderSheet(
    expense?: Parameters<typeof ExpenseSheet>[0]['expense'],
    sources: Array<{ id: string; name: string }> = [],
  ) {
    return render(
      <ExpenseSheet
        open
        onOpenChange={vi.fn()}
        month="2026-08"
        sources={sources}
        expense={expense}
      />,
    )
  }

  it('defaults the expense month picker to the selected workspace month', () => {
    renderSheet()

    expect(screen.getByRole('button', { name: 'Desde el mes' })).toHaveTextContent('Agosto de 2026')
    expect(document.querySelector('input[type="month"]')).not.toBeInTheDocument()
  })

  it('uses the recurrence Switch to show the one-time month picker', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('switch', { name: 'Es gasto recurrente' }))

    expect(screen.getByRole('button', { name: 'Mes del gasto' })).toBeInTheDocument()
  })

  it('shows the category selector after recurrence and clears a fixed source when recurrence changes', async () => {
    const user = userEvent.setup()
    renderSheet()

    const recurrence = screen.getByRole('switch', { name: 'Es gasto recurrente' })
    const category = screen.getByRole('combobox', { name: 'Categoría del gasto' })
    expect(recurrence.compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.click(category)
    await user.click(await screen.findByRole('option', { name: 'Alquiler / vivienda' }))
    expect(category).toHaveTextContent('Alquiler / vivienda')

    await user.click(recurrence)
    expect(category).toHaveTextContent('Seleccionar categoría')
    await user.click(category)
    expect(await screen.findByRole('option', { name: 'Regalo' })).toBeInTheDocument()
  })

  it('keeps an uncategorized source selected when recurrence changes', async () => {
    const user = userEvent.setup()
    renderSheet()

    const category = screen.getByRole('combobox', { name: 'Categoría del gasto' })
    await user.click(category)
    await user.click(await screen.findByRole('option', { name: 'Sin categoría' }))
    expect(category).toHaveTextContent('Sin categoría')

    await user.click(screen.getByRole('switch', { name: 'Es gasto recurrente' }))
    expect(category).toHaveTextContent('Sin categoría')
  })

  it('keeps a custom source selected when recurrence changes', async () => {
    const user = userEvent.setup()
    renderSheet(undefined, [{ id: '00000000-0000-4000-8000-000000000001', name: 'Gimnasio' }])

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Gimnasio' }))
    await user.click(screen.getByRole('switch', { name: 'Es gasto recurrente' }))

    expect(screen.getByRole('combobox', { name: 'Categoría del gasto' })).toHaveTextContent('Gimnasio')
  })

  it('formats the amount while typing', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')

    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('125.000')
  })

  it('submits the selected effective month when creating an expense', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Alquiler / vivienda' }))
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Alquiler')
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Desde el mes' }))
    await user.click(screen.getByRole('button', { name: 'Sep' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createExpense).toHaveBeenCalledWith({
      data: expect.objectContaining({
        draft: expect.objectContaining({ concept: 'Alquiler' }),
        effectiveMonth: '2026-09',
      }),
    })
    expect(posthogCapture).toHaveBeenCalledWith('expense_created', {
      recurring: true,
      currency: 'ARS',
      source_kind: 'housing',
    })
  })

  it('submits a custom concept when creating an expense', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' }), 'Gimnasio')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Membresía')
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createExpense).toHaveBeenCalledWith({
      data: {
        draft: expect.objectContaining({
          source: { kind: 'custom', name: 'Gimnasio' },
          concept: 'Membresía',
          amount: '125000.00',
        }),
        effectiveMonth: '2026-08',
      },
    })
  })

  it('submits a canonical amount and selected month boundary when updating an expense', async () => {
    const user = userEvent.setup()
    renderSheet({
      id: 'exp_1',
      sourceKind: 'housing',
      sourceId: null,
      sourceName: 'Alquiler / vivienda',
      amount: '100.00',
      concept: 'Alquiler mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-06-01',
      endMonth: null,
    })

    const amount = screen.getByRole('textbox', { name: 'Monto' })
    await user.clear(amount)
    await user.type(amount, '125,50')
    await user.click(screen.getByRole('button', { name: 'Desde el mes' }))
    await user.click(screen.getByRole('button', { name: 'Sep' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updateExpense).toHaveBeenCalledWith({
      data: {
        expenseId: 'exp_1',
        draft: expect.objectContaining({ amount: '125.50', concept: 'Alquiler mensual' }),
        effectiveMonth: '2026-09',
      },
    })
    expect(posthogCapture).toHaveBeenCalledWith('expense_updated', {
      recurring: true,
      currency: 'ARS',
      source_kind: 'housing',
    })
  })

  it('uses the selected workspace month when saving an untouched recurring edit', async () => {
    const user = userEvent.setup()
    renderSheet({
      id: 'exp_1', sourceKind: 'housing', sourceId: null, sourceName: 'Alquiler / vivienda',
      amount: '100.00', concept: 'Alquiler mensual', currency: 'ARS', recurring: true,
      effectiveMonth: '2026-06-01', endMonth: null,
    })

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updateExpense).toHaveBeenCalledWith({
      data: {
        expenseId: 'exp_1',
        draft: expect.objectContaining({ concept: 'Alquiler mensual' }),
        effectiveMonth: '2026-08',
      },
    })
  })

  it('uses a currency Select and shows the USD equivalent', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Moneda' }))
    await user.click(screen.getByRole('option', { name: 'Dólares (USD)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')

    expect(screen.getByText('Equivale a ARS 187.500.000')).toBeInTheDocument()
  })

  it('preserves decimal precision in the USD equivalent', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Moneda' }))
    await user.click(screen.getByRole('option', { name: 'Dólares (USD)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125,50')

    expect(screen.getByText('Equivale a ARS 188.250')).toBeInTheDocument()
  })

  it('formats a canonical edit amount for the Argentine input', () => {
    renderSheet({
      id: 'exp_1',
      sourceKind: 'housing',
      sourceId: null,
      sourceName: 'Alquiler / vivienda',
      amount: '1250.50',
      concept: 'Alquiler mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-06-01',
      endMonth: null,
    })

    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('1.250,50')
    expect(screen.getByRole('textbox', { name: 'Concepto (opcional)' })).toHaveValue('Alquiler mensual')
  })

  it('initializes a legacy expense without a concept as empty', () => {
    renderSheet({
      id: 'exp_1',
      sourceKind: 'housing',
      sourceId: null,
      sourceName: 'Alquiler / vivienda',
      amount: '100.00',
      concept: null,
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-06-01',
      endMonth: null,
    })

    expect(screen.getByRole('textbox', { name: 'Concepto (opcional)' })).toHaveValue('')
  })

  it('rejects an empty new custom source without creating an expense', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const sourceField = screen.getByRole('combobox', { name: 'Categoría del gasto' }).closest('[data-slot="field"]')
    expect(sourceField).toHaveAttribute('data-invalid', 'true')
    expect(sourceField).toHaveTextContent('Ingresá una categoría.')
    expect(createExpense).not.toHaveBeenCalled()
  })

  it('shows schema errors in their invalid fields', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const amountField = screen.getByRole('textbox', { name: 'Monto' }).closest('[data-slot="field"]')
    expect(amountField).toHaveAttribute('data-invalid', 'true')
    expect(amountField).toHaveTextContent('Ingresá un monto mayor a cero.')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveAttribute('aria-describedby', 'expense-amount-error')
    expect(screen.getByText('Ingresá un monto mayor a cero.')).toHaveAttribute('id', 'expense-amount-error')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveFocus()
  })

  it('links an invalid month control to its visible error', async () => {
    const user = userEvent.setup()
    render(
      <ExpenseSheet
        open
        onOpenChange={vi.fn()}
        month=""
        sources={[]}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Alquiler')
    await user.click(screen.getByRole('switch', { name: 'Es gasto recurrente' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const month = screen.getByRole('button', { name: 'Mes del gasto' })
    expect(month).toHaveAttribute('aria-invalid', 'true')
    expect(month).toHaveAttribute('aria-describedby', 'expense-month-error')
    expect(screen.getByText('Ingresá un mes válido.')).toHaveAttribute('id', 'expense-month-error')
  })

  it('locks every field and the sheet while saving', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    let resolveCreate!: () => void
    vi.mocked(createExpense).mockImplementation(
      () => new Promise<void>((resolve) => { resolveCreate = resolve }),
    )
    render(
      <ExpenseSheet open onOpenChange={onOpenChange} month="2026-08" sources={[]} />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Alquiler / vivienda' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Alquiler')
    await user.click(screen.getByRole('switch', { name: 'Es gasto recurrente' }))
    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Compra de ropa' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(document.querySelector('form')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Concepto (opcional)' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Categoría del gasto' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Es gasto recurrente' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Mes del gasto' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()

    resolveCreate()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('closes and reports refresh failure after a successful create', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    routerInvalidate.mockRejectedValueOnce(new Error('No se pudo actualizar la vista.'))
    render(<ExpenseSheet open onOpenChange={onOpenChange} month="2026-08" sources={[]} />)

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Alquiler / vivienda' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Alquiler')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(createExpense).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Gasto agregado.')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'El gasto se guardó, pero no pudimos actualizar la vista.',
    ))
    expect(createExpense).toHaveBeenCalledTimes(1)
  })

  it('closes and reports refresh failure after a successful update', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    routerInvalidate.mockRejectedValueOnce(new Error('No se pudo actualizar la vista.'))
    render(
      <ExpenseSheet
        open
        onOpenChange={onOpenChange}
        month="2026-08"
        sources={[]}
        expense={{
          id: 'exp_1', sourceKind: 'housing', sourceId: null, sourceName: 'Alquiler / vivienda',
          amount: '100.00', concept: 'Alquiler mensual', currency: 'ARS', recurring: true,
          effectiveMonth: '2026-08-01', endMonth: null,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(updateExpense).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Gasto actualizado.')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'El gasto se guardó, pero no pudimos actualizar la vista.',
    ))
    expect(updateExpense).toHaveBeenCalledTimes(1)
  })

  it('closes and reports refresh failure after a successful delete', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    routerInvalidate.mockRejectedValueOnce(new Error('No se pudo actualizar la vista.'))
    render(
      <ExpenseSheet
        open
        onOpenChange={onOpenChange}
        month="2026-08"
        sources={[]}
        expense={{
          id: 'exp_1', sourceKind: 'housing', sourceId: null, sourceName: 'Alquiler / vivienda',
          amount: '100.00', concept: 'Alquiler mensual', currency: 'ARS', recurring: true,
          effectiveMonth: '2026-08-01', endMonth: null,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(deleteExpense).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Gasto eliminado.')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'El gasto se eliminó, pero no pudimos actualizar la vista.',
    ))
    expect(deleteExpense).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })

  it('shows unselected category initially and validates category on submit', async () => {
    const user = userEvent.setup()
    renderSheet()

    expect(screen.getByRole('combobox', { name: 'Categoría del gasto' })).toHaveTextContent(
      'Seleccionar categoría',
    )

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createExpense).not.toHaveBeenCalled()
    expect(screen.getByText('Seleccioná una categoría.')).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Categoría del gasto' })).toHaveFocus()
    expect(screen.getByRole('combobox', { name: 'Categoría del gasto' })).toHaveAttribute(
      'aria-describedby',
      'expense-source-error',
    )
  })

  it('creates an expense with uncategorized source and null concept when concept is omitted', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Sin categoría' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createExpense).toHaveBeenCalledWith({
      data: {
        draft: expect.objectContaining({
          concept: null,
          source: { kind: 'uncategorized' },
          amount: '125000.00',
        }),
        effectiveMonth: '2026-08',
      },
    })
  })

  it('updates an existing expense clearing concept to null while preserving category', async () => {
    const user = userEvent.setup()
    renderSheet({
      id: 'exp_1',
      sourceKind: 'housing',
      sourceId: null,
      sourceName: 'Alquiler / vivienda',
      amount: '100.00',
      concept: 'Alquiler mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
      endMonth: null,
    })

    const concept = screen.getByRole('textbox', { name: 'Concepto (opcional)' })
    await user.clear(concept)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updateExpense).toHaveBeenCalledWith({
      data: {
        expenseId: 'exp_1',
        draft: expect.objectContaining({
          concept: null,
          source: { kind: 'housing' },
        }),
        effectiveMonth: '2026-08',
      },
    })
  })

  it('renders optional concept label, helper description, and validates oversized concept', async () => {
    const user = userEvent.setup()
    renderSheet()

    const concept = screen.getByRole('textbox', { name: 'Concepto (opcional)' })
    expect(screen.getByText('Agregá una descripción para diferenciar este gasto.')).toBeVisible()
    expect(concept).toHaveAttribute('aria-describedby', 'expense-concept-description')

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Sin categoría' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(concept, 'a'.repeat(121))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(concept).toHaveAttribute(
      'aria-describedby',
      'expense-concept-description expense-concept-error',
    )
    expect(screen.getByText('Máximo 120 caracteres.')).toBeVisible()
    expect(createExpense).not.toHaveBeenCalled()
  })

  it('updates a persisted custom source without showing the new-source input', async () => {
    const user = userEvent.setup()
    const sourceId = '00000000-0000-4000-8000-000000000001'
    renderSheet({
      id: 'exp_1',
      sourceKind: 'custom',
      sourceId,
      sourceName: 'Gimnasio',
      amount: '100.00',
      concept: 'Membresía',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-06-01',
      endMonth: null,
    }, [{ id: sourceId, name: 'Gimnasio' }])

    expect(screen.getByRole('combobox', { name: 'Categoría del gasto' })).toHaveTextContent('Gimnasio')
    expect(screen.queryByRole('textbox', { name: 'Nombre de la categoría nueva' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updateExpense).toHaveBeenCalledWith({
      data: {
        expenseId: 'exp_1',
        draft: expect.objectContaining({ source: { kind: 'custom', sourceId }, concept: 'Membresía' }),
        effectiveMonth: '2026-08',
      },
    })
  })

  it('confirms before deleting an expense with the selected month boundary', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderSheet({
      id: 'exp_1',
      sourceKind: 'housing',
      sourceId: null,
      sourceName: 'Alquiler / vivienda',
      amount: '100.00',
      concept: null,
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-06-01',
      endMonth: null,
    })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar este gasto desde el mes seleccionado?')
    expect(deleteExpense).toHaveBeenCalledWith({
      data: { expenseId: 'exp_1', effectiveMonth: '2026-08' },
    })
    expect(posthogCapture).toHaveBeenCalledWith('expense_deleted', {
      recurring: true,
      currency: 'ARS',
      source_kind: 'housing',
    })

    confirmSpy.mockRestore()
  })

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderSheet({
      id: 'exp_1',
      sourceKind: 'housing',
      sourceId: null,
      sourceName: 'Alquiler / vivienda',
      amount: '100.00',
      concept: null,
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-06-01',
      endMonth: null,
    })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar este gasto desde el mes seleccionado?')
    expect(deleteExpense).not.toHaveBeenCalled()
    expect(posthogCapture).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('saves a local recurring draft without month controls or server mutations', async () => {
    const user = userEvent.setup()
    const onSaveDraft = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ExpenseSheet
        open
        onOpenChange={onOpenChange}
        month="2026-08"
        sources={[]}
        draft={{
          source: { kind: 'custom', name: 'Gimnasio' },
          amount: '1250.50',
          concept: 'Membresía',
          currency: 'ARS',
          recurring: true,
        }}
        onSaveDraft={onSaveDraft}
        recurringOnly
      />,
    )

    expect(screen.getByRole('heading', { name: 'Editar gasto recurrente' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('1.250,50')
    expect(screen.queryByRole('switch', { name: 'Es gasto recurrente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mes/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/se va a guardar para que puedas volver a usarlo/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSaveDraft).toHaveBeenCalledWith({
      source: { kind: 'custom', name: 'Gimnasio' },
      amount: '1250.50',
      concept: 'Membresía',
      currency: 'ARS',
      recurring: true,
    })
    expect(createExpense).not.toHaveBeenCalled()
    expect(updateExpense).not.toHaveBeenCalled()
    expect(posthogCapture).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders the reduced recurring-expense variant for new draft without persistence claims', async () => {
    const user = userEvent.setup()
    const onSaveDraft = vi.fn()

    render(
      <ExpenseSheet
        open
        onOpenChange={vi.fn()}
        month="2026-08"
        sources={[]}
        onSaveDraft={onSaveDraft}
        recurringOnly
      />,
    )

    expect(screen.getByRole('heading', { name: 'Nuevo gasto recurrente' })).toBeVisible()
    expect(screen.getByText('Indicá cuánto gastás por mes y elegí una categoría.')).toBeVisible()
    expect(screen.queryByRole('switch', { name: 'Es gasto recurrente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mes/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))

    expect(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' })).toBeVisible()
    expect(screen.queryByText(/se va a guardar para que puedas volver a usarlo/i)).not.toBeInTheDocument()
  })

  it('sanitizes server error message when saving fails', async () => {
    const user = userEvent.setup()
    vi.mocked(createExpense).mockRejectedValueOnce(new Error('Internal server table constraint error'))
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Alquiler / vivienda' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Alquiler')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const formError = await screen.findByText('No pudimos guardar el gasto.')
    expect(formError).toBeInTheDocument()
    expect(screen.queryByText('Internal server table constraint error')).not.toBeInTheDocument()
  })

  it('sanitizes server error message when deleting fails', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(deleteExpense).mockRejectedValueOnce(new Error('Internal server delete constraint error'))
    renderSheet({
      id: 'exp_1',
      sourceKind: 'housing',
      sourceId: null,
      sourceName: 'Alquiler / vivienda',
      amount: '100.00',
      concept: 'Alquiler mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-06-01',
      endMonth: null,
    })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    const formError = await screen.findByText('No pudimos eliminar el gasto.')
    expect(formError).toBeInTheDocument()
    expect(screen.queryByText('Internal server delete constraint error')).not.toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})
