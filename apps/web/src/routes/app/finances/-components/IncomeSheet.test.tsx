// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIncome, deleteIncome, updateIncome } from '../../../../features/financial/financial.functions'
import type { IncomeDraft } from '../../../../features/financial/incomes.schema'
import { IncomeSheet } from './IncomeSheet'

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

const posthogCapture = vi.fn()

vi.mock('@posthog/react', () => ({
  usePostHog: () => ({ capture: posthogCapture }),
}))

vi.mock('../../../../features/financial/financial.functions', () => ({
  createIncome: vi.fn(),
  deleteIncome: vi.fn(),
  updateIncome: vi.fn(),
}))

describe('IncomeSheet', () => {
  afterEach(cleanup)
  beforeEach(() => vi.clearAllMocks())

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

  it('formats the amount while typing', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')

    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('125.000')
  })

  it('submits a canonical amount when creating an income', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Sueldo')
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
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('Sueldo mensual')
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

    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('')
  })

  it('uses the recurrence Switch to show the one-time month picker', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('switch', { name: 'Es ingreso recurrente' }))

    expect(screen.getByRole('button', { name: 'Mes del ingreso' })).toBeInTheDocument()
  })

  it('shows the category selector after recurrence and resets a fixed source for one-time incomes', async () => {
    const user = userEvent.setup()
    renderSheet()

    const recurrence = screen.getByRole('switch', { name: 'Es ingreso recurrente' })
    const category = screen.getByRole('combobox', { name: 'Categoría del ingreso' })
    expect(recurrence.compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.click(recurrence)
    expect(category).toHaveTextContent('Venta de bienes / usados')
    await user.click(category)
    expect(await screen.findByRole('option', { name: 'Bono / aguinaldo / premio' })).toBeInTheDocument()
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
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Honorarios')
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
  })

  it('rejects a missing concept without creating an income', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const conceptField = screen.getByRole('textbox', { name: 'Concepto' }).closest('[data-slot="field"]')
    expect(conceptField).toHaveAttribute('data-invalid', 'true')
    expect(conceptField).toHaveTextContent('Ingresá un concepto.')
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveAttribute('aria-describedby', 'income-concept-error')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'income-concept-error')
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

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Sueldo')
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
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('Honorarios')
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
})
