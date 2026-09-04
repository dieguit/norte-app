// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpenseItem, IncomeItem } from './FinanceListItems'

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

describe('finance list items', () => {
  afterEach(() => {
    cleanup()
  })
  it('renders an income concept, category, month, and edit action', () => {
    render(
      <IncomeItem
        item={{
          id: 'income-1',
          sourceKind: 'salary',
          sourceId: null,
          sourceName: 'Sueldo',
          concept: 'Sueldo mensual',
          amount: '1000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-08-01',
        }}
        selectedMonth="2026-08"
        onEdit={vi.fn()}
      />,
    )

    expect(screen.getByText('Sueldo mensual')).toBeInTheDocument()
    expect(screen.getByText('Sueldo')).toBeInTheDocument()
    expect(screen.getByText('Todos los meses desde Agosto de 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar ingreso Sueldo mensual' })).toBeInTheDocument()
  })

  it('renders a one-time USD expense and its ARS equivalent', () => {
    render(
      <ExpenseItem
        item={{
          id: 'expense-1',
          sourceKind: 'custom',
          sourceId: 'flight',
          sourceName: 'Vuelo',
          concept: 'Pasaje aéreo',
          amount: '200.00',
          currency: 'USD',
          recurring: false,
          effectiveMonth: '2026-08-01',
          endMonth: null,
        }}
        selectedMonth="2026-08"
        onEdit={vi.fn()}
      />,
    )

    expect(screen.getByText('Pasaje aéreo')).toBeInTheDocument()
    expect(screen.getByText('Vuelo')).toBeInTheDocument()
    expect(screen.getByText('Equivale a ARS 300.000')).toBeInTheDocument()
  })

  it('renders income fallback when concept is null and sourceKind is uncategorized', () => {
    render(
      <IncomeItem
        item={{
          id: 'income-fallback-1',
          sourceKind: 'uncategorized',
          sourceId: null,
          sourceName: 'uncategorized',
          concept: null,
          amount: '500.00',
          currency: 'ARS',
          recurring: false,
          effectiveMonth: '2026-08-01',
        }}
        selectedMonth="2026-08"
        onEdit={vi.fn()}
      />,
    )

    expect(screen.getByText('Sin categoría')).toBeInTheDocument()
    expect(screen.queryAllByText('Sin categoría')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Editar ingreso Sin categoría' })).toBeVisible()
  })

  it('renders expense fallback when concept is null and sourceKind is uncategorized', () => {
    render(
      <ExpenseItem
        item={{
          id: 'expense-fallback-1',
          sourceKind: 'uncategorized',
          sourceId: null,
          sourceName: 'uncategorized',
          concept: null,
          amount: '150.00',
          currency: 'ARS',
          recurring: false,
          effectiveMonth: '2026-08-01',
          endMonth: null,
        }}
        selectedMonth="2026-08"
        onEdit={vi.fn()}
      />,
    )

    expect(screen.getByText('Sin categoría')).toBeInTheDocument()
    expect(screen.queryAllByText('Sin categoría')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Editar gasto Sin categoría' })).toBeVisible()
  })
})
