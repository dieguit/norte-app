// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { createIncome, deleteIncome, updateIncome } from '../../../../features/financial/financial.functions'
import type { IncomeDraft } from '../../../../features/financial/incomes.schema'
import { IncomeSheet } from './IncomeSheet'

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
  createIncome: vi.fn(),
  deleteIncome: vi.fn(),
  updateIncome: vi.fn(),
}))

describe('IncomeSheet', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.resetAllMocks()
    routerInvalidate.mockResolvedValue(undefined)
  })

  function renderSheet(
    income?: Parameters<typeof IncomeSheet>[0]['income'],
    sources: Array<{ id: string; name: string }> = [],
  ) {
    return render(
      <IncomeSheet
        open
        onOpenChange={vi.fn()}
        month="2026-08"
        sources={sources}
        income={income}
      />,
    )
  }

  function renderDraftSheet({
    draft,
    onSaveDraft = vi.fn(),
  }: {
    draft?: IncomeDraft
    onSaveDraft?: (draft: IncomeDraft) => void
  } = {}) {
    return render(
      <IncomeSheet
        open
        onOpenChange={vi.fn()}
        month="2026-08"
        sources={[]}
        draft={draft}
        onSaveDraft={onSaveDraft}
        recurringOnly
      />,
    )
  }

  it('uses the selected workspace month for the initial recurring month', () => {
    renderSheet()

    expect(screen.getByRole('button', { name: 'Desde el mes' })).toHaveTextContent('Agosto de 2026')
  })

  it('preserves the persisted income month when editing an income', () => {
    renderSheet({
      id: 'income_1',
      sourceKind: 'salary',
      sourceId: null,
      sourceName: 'Sueldo',
      amount: '100.00',
      concept: 'Sueldo mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-06-01',
    })

    expect(screen.getByRole('button', { name: 'Desde el mes' })).toHaveTextContent('Junio de 2026')
  })

  it('formats the amount while typing', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')

    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('125.000')
  })

  it('submits a canonical amount when creating an income', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Sueldo' }))
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Sueldo')
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createIncome).toHaveBeenCalledWith({
      data: {
        draft: expect.objectContaining({ amount: '125000.00', concept: 'Sueldo' }),
      },
    })
    expect(posthogCapture).toHaveBeenCalledWith('income_created', {
      recurring: true,
      currency: 'ARS',
      source_kind: 'salary',
    })
  })

  it('submits a canonical amount when updating an income', async () => {
    const user = userEvent.setup()
    renderSheet({
      id: 'income_1',
      sourceKind: 'salary',
      sourceId: null,
      sourceName: 'Sueldo',
      amount: '100.00',
      concept: 'Sueldo mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
    })

    const amount = screen.getByRole('textbox', { name: 'Monto' })
    await user.clear(amount)
    await user.type(amount, '125,50')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updateIncome).toHaveBeenCalledWith({
      data: {
        incomeId: 'income_1',
        draft: expect.objectContaining({ amount: '125.50', concept: 'Sueldo mensual' }),
      },
    })
    expect(posthogCapture).toHaveBeenCalledWith('income_updated', {
      recurring: true,
      currency: 'ARS',
      source_kind: 'salary',
    })
  })

  it('captures a deletion event after a confirmed persisted-income delete', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(deleteIncome).mockResolvedValue(undefined)
    renderSheet({
      id: 'income_1',
      sourceKind: 'salary',
      sourceId: null,
      sourceName: 'Sueldo',
      amount: '100.00',
      concept: null,
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
    })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(deleteIncome).toHaveBeenCalledWith({ data: { incomeId: 'income_1' } })
    expect(posthogCapture).toHaveBeenCalledWith('income_deleted', {
      recurring: true,
      currency: 'ARS',
      source_kind: 'salary',
    })

    confirmSpy.mockRestore()
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
      id: 'income_1',
      sourceKind: 'salary',
      sourceId: null,
      sourceName: 'Sueldo',
      amount: '1250.50',
      concept: 'Sueldo mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
    })

    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('1.250,50')
    expect(screen.getByRole('textbox', { name: 'Concepto (opcional)' })).toHaveValue('Sueldo mensual')
  })

  it('initializes a legacy income without a concept as empty', () => {
    renderSheet({
      id: 'income_1',
      sourceKind: 'salary',
      sourceId: null,
      sourceName: 'Sueldo',
      amount: '100.00',
      concept: null,
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
    })

    expect(screen.getByRole('textbox', { name: 'Concepto (opcional)' })).toHaveValue('')
  })

  it('uses the recurrence Switch to show the one-time month picker', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('switch', { name: 'Es ingreso recurrente' }))

    expect(screen.getByRole('button', { name: 'Mes del ingreso' })).toBeInTheDocument()
  })

  it('shows the category selector after recurrence and clears a fixed source when recurrence changes', async () => {
    const user = userEvent.setup()
    renderSheet()

    const recurrence = screen.getByRole('switch', { name: 'Es ingreso recurrente' })
    const category = screen.getByRole('combobox', { name: 'Categoría del ingreso' })
    expect(recurrence.compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.click(category)
    await user.click(await screen.findByRole('option', { name: 'Sueldo' }))
    expect(category).toHaveTextContent('Sueldo')

    await user.click(recurrence)
    expect(category).toHaveTextContent('Seleccionar categoría')
    await user.click(category)
    expect(await screen.findByRole('option', { name: 'Bono / aguinaldo / premio' })).toBeInTheDocument()
  })

  it('keeps an uncategorized source selected when recurrence changes', async () => {
    const user = userEvent.setup()
    renderSheet()

    const category = screen.getByRole('combobox', { name: 'Categoría del ingreso' })
    await user.click(category)
    await user.click(await screen.findByRole('option', { name: 'Sin categoría' }))
    expect(category).toHaveTextContent('Sin categoría')

    await user.click(screen.getByRole('switch', { name: 'Es ingreso recurrente' }))
    expect(category).toHaveTextContent('Sin categoría')
  })

  it('keeps a custom source selected when recurrence changes', async () => {
    const user = userEvent.setup()
    renderSheet(undefined, [{ id: '00000000-0000-4000-8000-000000000001', name: 'Consultoría' }])

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Consultoría' }))
    await user.click(screen.getByRole('switch', { name: 'Es ingreso recurrente' }))

    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveTextContent('Consultoría')
  })

  it('submits a named custom source', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' }), 'Consultoría')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Honorarios')
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createIncome).toHaveBeenCalledWith({
      data: { draft: expect.objectContaining({ source: { kind: 'custom', name: 'Consultoría' }, concept: 'Honorarios', amount: '125000.00' }) },
    })
  })

  it('rejects an empty new custom source without creating an income', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const sourceField = screen.getByRole('combobox', { name: 'Categoría del ingreso' }).closest('[data-slot="field"]')
    expect(sourceField).toHaveAttribute('data-invalid', 'true')
    expect(sourceField).toHaveTextContent('Ingresá una categoría.')
    expect(createIncome).not.toHaveBeenCalled()
  })

  it('shows schema errors in their invalid fields', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const amountField = screen.getByRole('textbox', { name: 'Monto' }).closest('[data-slot="field"]')
    expect(amountField).toHaveAttribute('data-invalid', 'true')
    expect(amountField).toHaveTextContent('Ingresá un monto mayor a cero.')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveAttribute('aria-describedby', 'income-amount-error')
    expect(screen.getByText('Ingresá un monto mayor a cero.')).toHaveAttribute('id', 'income-amount-error')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveFocus()
  })

  it('links an invalid month control to its visible error', async () => {
    const user = userEvent.setup()
    render(
      <IncomeSheet
        open
        onOpenChange={vi.fn()}
        month=""
        sources={[]}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Sueldo')
    await user.click(screen.getByRole('switch', { name: 'Es ingreso recurrente' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const month = screen.getByRole('button', { name: 'Mes del ingreso' })
    expect(month).toHaveAttribute('aria-invalid', 'true')
    expect(month).toHaveAttribute('aria-describedby', 'income-month-error')
    expect(screen.getByText('Ingresá un mes válido.')).toHaveAttribute('id', 'income-month-error')
  })

  it('locks every field and the sheet while saving', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    let resolveCreate!: () => void
    vi.mocked(createIncome).mockImplementation(
      () => new Promise<void>((resolve) => { resolveCreate = resolve }),
    )
    render(
      <IncomeSheet
        open
        onOpenChange={onOpenChange}
        month="2026-08"
        sources={[]}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Sueldo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Sueldo')
    await user.click(screen.getByRole('switch', { name: 'Es ingreso recurrente' }))
    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Venta de bienes / usados' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(document.querySelector('form')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Concepto (opcional)' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Es ingreso recurrente' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Mes del ingreso' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()

    resolveCreate()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('closes and reports refresh failure after a successful create', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    routerInvalidate.mockRejectedValueOnce(new Error('No se pudo actualizar la vista.'))
    render(<IncomeSheet open onOpenChange={onOpenChange} month="2026-08" sources={[]} />)

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Sueldo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Sueldo')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(createIncome).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Ingreso agregado.')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'El ingreso se guardó, pero no pudimos actualizar la vista.',
    ))
    expect(createIncome).toHaveBeenCalledTimes(1)
  })

  it('closes and reports refresh failure after a successful update', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    routerInvalidate.mockRejectedValueOnce(new Error('No se pudo actualizar la vista.'))
    render(
      <IncomeSheet
        open
        onOpenChange={onOpenChange}
        month="2026-08"
        sources={[]}
        income={{
          id: 'income_1', sourceKind: 'salary', sourceId: null, sourceName: 'Sueldo',
          amount: '100.00', concept: 'Sueldo mensual', currency: 'ARS', recurring: true,
          effectiveMonth: '2026-08-01',
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(updateIncome).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Ingreso actualizado.')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'El ingreso se guardó, pero no pudimos actualizar la vista.',
    ))
    expect(updateIncome).toHaveBeenCalledTimes(1)
  })

  it('closes and reports refresh failure after a successful delete', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    routerInvalidate.mockRejectedValueOnce(new Error('No se pudo actualizar la vista.'))
    render(
      <IncomeSheet
        open
        onOpenChange={onOpenChange}
        month="2026-08"
        sources={[]}
        income={{
          id: 'income_1', sourceKind: 'salary', sourceId: null, sourceName: 'Sueldo',
          amount: '100.00', concept: 'Sueldo mensual', currency: 'ARS', recurring: true,
          effectiveMonth: '2026-08-01',
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(deleteIncome).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Ingreso eliminado.')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'El ingreso se eliminó, pero no pudimos actualizar la vista.',
    ))
    expect(deleteIncome).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })

  it('shows unselected category initially and validates category on submit', async () => {
    const user = userEvent.setup()
    renderSheet()

    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveTextContent(
      'Seleccionar categoría',
    )

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createIncome).not.toHaveBeenCalled()
    expect(screen.getByText('Seleccioná una categoría.')).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveFocus()
    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveAttribute(
      'aria-describedby',
      'income-source-error',
    )
  })

  it('creates an income with uncategorized source and null concept when concept is omitted', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Sin categoría' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createIncome).toHaveBeenCalledWith({
      data: {
        draft: expect.objectContaining({
          concept: null,
          source: { kind: 'uncategorized' },
          amount: '125000.00',
        }),
      },
    })
  })

  it('updates an existing income clearing concept to null while preserving category', async () => {
    const user = userEvent.setup()
    renderSheet({
      id: 'income_1',
      sourceKind: 'salary',
      sourceId: null,
      sourceName: 'Sueldo',
      amount: '100.00',
      concept: 'Sueldo mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
    })

    const concept = screen.getByRole('textbox', { name: 'Concepto (opcional)' })
    await user.clear(concept)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updateIncome).toHaveBeenCalledWith({
      data: {
        incomeId: 'income_1',
        draft: expect.objectContaining({
          concept: null,
          source: { kind: 'salary' },
        }),
      },
    })
  })

  it('renders optional concept label, helper description, and validates oversized concept', async () => {
    const user = userEvent.setup()
    renderSheet()

    const concept = screen.getByRole('textbox', { name: 'Concepto (opcional)' })
    expect(screen.getByText('Agregá una descripción para diferenciar este ingreso.')).toBeVisible()
    expect(concept).toHaveAttribute('aria-describedby', 'income-concept-description')

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Sin categoría' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(concept, 'a'.repeat(121))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(concept).toHaveAttribute(
      'aria-describedby',
      'income-concept-description income-concept-error',
    )
    expect(screen.getByText('Máximo 120 caracteres.')).toBeVisible()
    expect(createIncome).not.toHaveBeenCalled()
  })

  it('updates a persisted custom source without showing the new-source input', async () => {
    const user = userEvent.setup()
    const sourceId = '00000000-0000-4000-8000-000000000001'
    renderSheet({
      id: 'income_1',
      sourceKind: 'custom',
      sourceId,
      sourceName: 'Consultoría',
      amount: '100.00',
      concept: 'Honorarios',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
    }, [{ id: sourceId, name: 'Consultoría' }])

    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveTextContent('Consultoría')
    expect(screen.queryByRole('textbox', { name: 'Nombre de la categoría nueva' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(updateIncome).toHaveBeenCalledWith({
      data: { incomeId: 'income_1', draft: expect.objectContaining({ source: { kind: 'custom', sourceId }, concept: 'Honorarios' }) },
    })
  })

  it('renders the reduced recurring-income variant without persistence claims', async () => {
    const user = userEvent.setup()
    renderDraftSheet()

    expect(screen.getByRole('heading', { name: 'Nuevo ingreso recurrente' })).toBeVisible()
    expect(screen.getByText('Indicá cuánto recibís por mes y de dónde viene.')).toBeVisible()
    expect(screen.queryByRole('switch', { name: 'Es ingreso recurrente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mes/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))

    expect(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' })).toBeVisible()
    expect(screen.queryByText('Esta categoría se va a guardar para que puedas volver a usarla')).not.toBeInTheDocument()
  })

  it('returns a canonical recurring local draft without creating an income', async () => {
    const user = userEvent.setup()
    const onSaveDraft = vi.fn()
    renderDraftSheet({ onSaveDraft })

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Sueldo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Sueldo')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSaveDraft).toHaveBeenCalledWith({
      source: { kind: 'salary' },
      amount: '125000.00',
      concept: 'Sueldo',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08',
    })
    expect(createIncome).not.toHaveBeenCalled()
    expect(updateIncome).not.toHaveBeenCalled()
    expect(posthogCapture).not.toHaveBeenCalled()
  })

  it('populates and updates a local draft', async () => {
    const user = userEvent.setup()
    const onSaveDraft = vi.fn()
    renderDraftSheet({
      draft: {
        source: { kind: 'custom', name: 'Consultoría' },
        amount: '1250.50',
        concept: 'Honorarios',
        currency: 'USD',
        recurring: true,
        effectiveMonth: '2026-08',
      },
      onSaveDraft,
    })

    expect(screen.getByRole('heading', { name: 'Editar ingreso recurrente' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('1.250,50')
    expect(screen.getByRole('textbox', { name: 'Concepto (opcional)' })).toHaveValue('Honorarios')
    expect(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' })).toHaveValue('Consultoría')

    const amount = screen.getByRole('textbox', { name: 'Monto' })
    await user.clear(amount)
    await user.type(amount, '2000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({
      source: { kind: 'custom', name: 'Consultoría' },
      amount: '2000.00',
      concept: 'Honorarios',
      currency: 'USD',
      recurring: true,
      effectiveMonth: '2026-08',
    }))
  })

  it('does not render native monthly inputs', () => {
    renderSheet()

    expect(document.querySelector('input[type="month"]')).not.toBeInTheDocument()
  })

  it('renders a unique id for the form-level error when saving fails and sanitizes server error message', async () => {
    const user = userEvent.setup()
    vi.mocked(createIncome).mockRejectedValueOnce(new Error('Sensitive database column error'))
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Sueldo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto (opcional)' }), 'Sueldo')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const formError = await screen.findByText('No pudimos guardar el ingreso.')
    expect(formError).toBeInTheDocument()
    expect(formError).toHaveAttribute('id', 'income-form-error')
    expect(screen.queryByText('Sensitive database column error')).not.toBeInTheDocument()
  })

  it('sanitizes server error message when deleting fails', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(deleteIncome).mockRejectedValueOnce(new Error('Internal delete failure detail'))
    renderSheet({
      id: 'income_1',
      sourceKind: 'salary',
      sourceId: null,
      sourceName: 'Sueldo',
      amount: '100.00',
      concept: 'Sueldo mensual',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08-01',
    })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    const formError = await screen.findByText('No pudimos eliminar el ingreso.')
    expect(formError).toBeInTheDocument()
    expect(formError).toHaveAttribute('id', 'income-form-error')
    expect(screen.queryByText('Internal delete failure detail')).not.toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})
