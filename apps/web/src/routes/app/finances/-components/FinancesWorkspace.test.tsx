// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { FinancesWorkspace } from './FinancesWorkspace'

afterEach(cleanup)

describe('FinancesWorkspace', () => {
  it('shows the selected month total and only its applicable income', () => {
    render(
      <FinancesWorkspace
        workspace={{
          sources: [],
          incomes: [
            {
              id: 'income_1', sourceKind: 'salary', sourceId: null, sourceName: 'salary',
              amount: '100.00', currency: 'USD', recurring: true, effectiveMonth: '2026-08-01',
            },
            {
              id: 'income_2', sourceKind: 'custom', sourceId: 'source_1', sourceName: 'Freelance',
              amount: '500.00', currency: 'ARS', recurring: false, effectiveMonth: '2026-09-01',
            },
          ],
        }}
        initialMonth="2026-08"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Ingresos de agosto de 2026' })).toBeInTheDocument()
    expect(screen.getByText('ARS 150.000', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('USD 100.00')).toBeInTheDocument()
    expect(screen.getByText('Equivale a ARS 150.000')).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveClass('flex-col', 'sm:flex-row')
    expect(screen.queryByText('Freelance')).not.toBeInTheDocument()
  })

  it('opens an income editor from its title and keeps the amount noninteractive', async () => {
    const user = userEvent.setup()

    render(
      <FinancesWorkspace
        workspace={{
          sources: [],
          incomes: [{
            id: 'income_1', sourceKind: 'salary', sourceId: null, sourceName: 'salary',
            amount: '100.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-08-01',
          }],
        }}
        initialMonth="2026-08"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Editar ingreso Sueldo' }))

    expect(screen.getByRole('heading', { name: 'Editar ingreso' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ARS 100.00' })).not.toBeInTheDocument()
  })
})
