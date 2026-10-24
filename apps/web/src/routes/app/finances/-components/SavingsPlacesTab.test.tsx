// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SavingsPlacesTab } from './SavingsPlacesTab'

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

vi.mock('../../../../features/savings-places/savings-places.functions', () => ({
  createSavingsPlace: vi.fn(),
  deleteSavingsPlace: vi.fn(),
  renameSavingsPlace: vi.fn(),
  transferSavings: vi.fn(),
}))

afterEach(cleanup)

const workspace = {
  places: [
    { id: 'bank', name: 'Banco Nación', balances: { ARS: '125000.00', USD: '2345.67' }, hasMovements: true },
    { id: 'cash', name: 'Efectivo', balances: { ARS: '500.00', USD: '0.00' }, hasMovements: false },
  ],
  movements: [
    { kind: 'contribution' as const, id: 'contribution_bank', placeId: 'bank', placeName: 'Banco Nación', amount: '25.00', currency: 'USD' as const, createdAt: '2026-08-20T12:00:00.000Z' },
    { kind: 'transfer' as const, id: 'transfer_into_bank', fromPlaceId: 'cash', fromPlaceName: 'Efectivo', toPlaceId: 'bank', toPlaceName: 'Banco Nación', amount: '1000.00', currency: 'ARS' as const, createdAt: '2026-08-19T12:00:00.000Z' },
    { kind: 'transfer' as const, id: 'transfer_out_of_bank', fromPlaceId: 'bank', fromPlaceName: 'Banco Nación', toPlaceId: 'cash', toPlaceName: 'Efectivo', amount: '500.00', currency: 'ARS' as const, createdAt: '2026-08-18T12:00:00.000Z' },
  ],
}

async function openAction(user: ReturnType<typeof userEvent.setup>, place: string, action: string) {
  await user.click(screen.getByRole('button', { name: `Acciones de ${place}` }))
  await user.click(await screen.findByRole('button', { name: action }))
}

describe('SavingsPlacesTab', () => {
  it('summarizes pesos and dollars in two donuts and lists places by balance', () => {
    const crypto = { id: 'crypto', name: 'Binance', balances: { ARS: '-50.00', USD: '100.00' }, hasMovements: true }
    render(<SavingsPlacesTab workspace={{ ...workspace, places: [crypto, ...workspace.places].reverse() }} />)

    const pesos = screen.getByRole('figure', { name: 'Pesos' })
    expect(pesos).toHaveTextContent('ARS')
    expect(pesos).toHaveTextContent('$ 125.450')
    expect(pesos).toHaveTextContent('2 lugares')
    const dollars = screen.getByRole('figure', { name: 'Dólares' })
    expect(dollars).toHaveTextContent('US$ 2.445')
    expect(dollars).toHaveTextContent('2 lugares')

    const list = screen.getByRole('region', { name: 'Lugares de ahorro' })
    expect(list).toHaveTextContent('3 lugares')
    expect(within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Banco Nación', 'Efectivo', 'Binance'])
    const bank = screen.getByRole('region', { name: 'Banco Nación' })
    expect(bank).toHaveTextContent('$ 125.000,00')
    expect(bank).toHaveTextContent('US$ 2.345,67')
    expect(screen.getByRole('region', { name: 'Efectivo' })).not.toHaveTextContent('US$')
    expect(screen.getByRole('region', { name: 'Binance' })).toHaveTextContent('−$ 50,00')
  })

  it('shows the latest three incoming movements under each place, newest first', () => {
    render(
      <SavingsPlacesTab
        workspace={{
          ...workspace,
          movements: [
            ...workspace.movements,
            { kind: 'completion', id: 'completion_bank', goalId: 'goal_trip', goalName: 'Vacaciones', placeId: 'bank', placeName: 'Banco Nación', amount: '300.00', currency: 'ARS', createdAt: '2026-08-21T12:00:00.000Z' },
            { kind: 'contribution', id: 'contribution_old', placeId: 'bank', placeName: 'Banco Nación', amount: '10.00', currency: 'ARS', createdAt: '2026-08-01T12:00:00.000Z' },
          ],
        }}
      />,
    )

    const rows = within(screen.getByRole('region', { name: 'Banco Nación' })).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('21 ago')
    expect(rows[0]).toHaveTextContent('Objetivo: Vacaciones')
    expect(rows[0]).toHaveTextContent('−$ 300,00')
    expect(rows[1]).toHaveTextContent('Ahorro registrado')
    expect(rows[1]).toHaveTextContent('+US$ 25,00')
    expect(rows[2]).toHaveTextContent('Desde Efectivo')
    expect(rows[2]).toHaveTextContent('+$ 1.000,00')
    expect(within(screen.getByRole('region', { name: 'Efectivo' })).getByRole('listitem')).toHaveTextContent('Desde Banco Nación')
  })

  it('opens the selected place movements sheet from the place menu', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await openAction(user, 'Banco Nación', 'Ver movimientos de Banco Nación')
    const section = screen.getByRole('region', { name: 'Movimientos de Banco Nación' })
    expect(within(section).getByText('Ahorro registrado')).toBeInTheDocument()
    expect(within(section).getByText('Transferencia desde Efectivo')).toBeInTheDocument()
    expect(within(section).queryByText('Transferencia de Banco Nación a Efectivo')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Movimientos de Banco Nación' })).not.toBeInTheDocument())
  })

  it('opens the edit sheet from the place menu', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await openAction(user, 'Banco Nación', 'Editar lugar Banco Nación')
    expect(screen.getByRole('heading', { name: 'Editar lugar' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre del lugar' })).toHaveValue('Banco Nación')
  })

  it('opens the transfer sheet from the place menu', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await openAction(user, 'Banco Nación', 'Transferir desde Banco Nación')

    expect(screen.getByRole('heading', { name: 'Transferir desde Banco Nación' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Desde' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    expect(await screen.findByRole('option', { name: 'Efectivo' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Banco Nación' })).not.toBeInTheDocument()
  })

  it('switches transfer source and resets the draft', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await openAction(user, 'Banco Nación', 'Transferir desde Banco Nación')
    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    await user.click(screen.getByRole('combobox', { name: 'Moneda' }))
    await user.click(await screen.findByRole('option', { name: 'Dólares (USD)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '25')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Transferir desde Banco Nación' })).not.toBeInTheDocument())

    await openAction(user, 'Efectivo', 'Transferir desde Efectivo')

    expect(screen.getByRole('heading', { name: 'Transferir desde Efectivo' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Hacia' })).toHaveTextContent('Seleccionar destino')
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('Pesos (ARS)')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('')
    expect(screen.getByText('Disponible: $ 500,00')).toBeInTheDocument()
  })

  it('updates the edit sheet with the newly selected place', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await openAction(user, 'Banco Nación', 'Editar lugar Banco Nación')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Editar lugar' })).not.toBeInTheDocument())
    await openAction(user, 'Efectivo', 'Editar lugar Efectivo')

    expect(screen.getByRole('textbox', { name: 'Nombre del lugar' })).toHaveValue('Efectivo')
  })

  it('opens a new place from the floating add button', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await user.click(screen.getByRole('button', { name: 'Agregar lugar' }))
    expect(screen.getByRole('heading', { name: 'Nuevo lugar' })).toBeInTheDocument()
  })

  it('keeps the empty state useful for creating a place', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={{ places: [], movements: [] }} />)

    expect(screen.getByText('Todavía no tenés lugares de ahorro.')).toBeInTheDocument()
    const pesos = screen.getByRole('figure', { name: 'Pesos' })
    expect(pesos).toHaveTextContent('—')
    expect(pesos).toHaveTextContent('0 lugares')
    expect(screen.queryByRole('region', { name: 'Lugares de ahorro' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Agregar lugar' }))
    expect(screen.getByRole('heading', { name: 'Nuevo lugar' })).toBeInTheDocument()
  })
})