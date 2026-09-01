// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SavingsMovementsSheet } from './SavingsMovementsSheet'

afterEach(cleanup)

const movements = [
  {
    kind: 'contribution' as const,
    id: 'contribution_1',
    placeId: 'bank',
    placeName: 'Banco Nación',
    amount: '25.00',
    currency: 'USD' as const,
    createdAt: '2026-08-20T12:00:00.000Z',
  },
  {
    kind: 'completion' as const,
    id: 'completion_1',
    goalId: 'goal-1',
    goalName: 'Vacaciones',
    placeId: 'bank',
    placeName: 'Banco Nación',
    amount: '600.00',
    currency: 'ARS' as const,
    createdAt: '2026-08-18T12:00:00.000Z',
  },
  {
    kind: 'transfer' as const,
    id: 'transfer_1',
    fromPlaceId: 'cash',
    fromPlaceName: 'Efectivo',
    toPlaceId: 'bank',
    toPlaceName: 'Banco Nación',
    amount: '1000.00',
    currency: 'ARS' as const,
    createdAt: '2026-08-19T12:00:00.000Z',
  },
]

describe('SavingsMovementsSheet', () => {
  it('renders movements in one semantic divided list with localized copy and amounts', () => {
    render(
      <SavingsMovementsSheet
        open
        onOpenChange={vi.fn()}
        placeName="Banco Nación"
        movements={movements}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Movimientos de Banco Nación' })).toBeInTheDocument()
    expect(screen.getByText('Consultá los aportes, transferencias recibidas y objetivos completados en este lugar.')).toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Movimientos de Banco Nación' })
    const list = within(section).getByRole('list')
    expect(list).toHaveClass('divide-y', 'divide-[var(--line)]')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(within(section).getByText('Ahorro registrado')).toBeInTheDocument()
    expect(within(section).getByText('Objetivo completado: Vacaciones')).toBeInTheDocument()
    expect(within(section).getByText('Transferencia desde Efectivo')).toBeInTheDocument()
    expect(within(section).getByText('- $ 600,00')).toBeInTheDocument()
    expect(within(section).getByText('20/8/2026')).toBeInTheDocument()
    expect(within(section).getByText('19/8/2026')).toBeInTheDocument()
    expect(within(section).getByText('US$ 25,00')).toBeInTheDocument()
    expect(within(section).getByText('$ 1.000,00')).toBeInTheDocument()
    expect(within(section).queryByText(/USD USD/)).not.toBeInTheDocument()
  })

  it('renders the empty state inside the sheet', () => {
    render(
      <SavingsMovementsSheet
        open
        onOpenChange={vi.fn()}
        placeName="Banco Nación"
        movements={[]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Movimientos de Banco Nación' })).toBeInTheDocument()
    expect(screen.getByText('Consultá los aportes, transferencias recibidas y objetivos completados en este lugar.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Movimientos de Banco Nación' })).toHaveTextContent(
      'No hay movimientos todavía.',
    )
  })

  it('uses the accessible close action from the established sheet shell', async () => {
    const onOpenChange = vi.fn()
    render(
      <SavingsMovementsSheet
        open
        onOpenChange={onOpenChange}
        placeName="Banco Nación"
        movements={[]}
      />,
    )

    screen.getByRole('button', { name: 'Close' }).click()

    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false)
  })
})
