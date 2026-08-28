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
    {
      id: 'bank',
      name: 'Banco Nación',
      balances: { ARS: '125000.00', USD: '2345.67' },
      hasMovements: true,
    },
    {
      id: 'cash',
      name: 'Efectivo',
      balances: { ARS: '500.00', USD: '0.00' },
      hasMovements: false,
    },
  ],
  movements: [
    {
      kind: 'contribution' as const,
      id: 'contribution_bank',
      placeId: 'bank',
      placeName: 'Banco Nación',
      amount: '25.00',
      currency: 'USD' as const,
      createdAt: '2026-08-20T12:00:00.000Z',
    },
    {
      kind: 'transfer' as const,
      id: 'transfer_into_bank',
      fromPlaceId: 'cash',
      fromPlaceName: 'Efectivo',
      toPlaceId: 'bank',
      toPlaceName: 'Banco Nación',
      amount: '1000.00',
      currency: 'ARS' as const,
      createdAt: '2026-08-19T12:00:00.000Z',
    },
    {
      kind: 'transfer' as const,
      id: 'transfer_out_of_bank',
      fromPlaceId: 'bank',
      fromPlaceName: 'Banco Nación',
      toPlaceId: 'cash',
      toPlaceName: 'Efectivo',
      amount: '500.00',
      currency: 'ARS' as const,
      createdAt: '2026-08-18T12:00:00.000Z',
    },
  ],
}

describe('SavingsPlacesTab', () => {
  it('renders savings places as an actionable list with formatted balances', () => {
    render(<SavingsPlacesTab workspace={workspace} />)

    const section = screen.getByRole('region', { name: 'Lugares de ahorro' })
    expect(section).toHaveClass(
      'overflow-hidden',
      'rounded-2xl',
      'border',
      'border-[var(--line)]',
      'bg-[var(--surface-strong)]',
    )
    expect(within(section).getByRole('list')).toHaveClass(
      'divide-y',
      'divide-[var(--line)]',
    )

    const firstPlace = within(section).getAllByRole('listitem')[0]
    expect(firstPlace).toHaveClass(
      'flex',
      'flex-col',
      'items-stretch',
      'justify-between',
      'gap-5',
      'p-5',
      'sm:flex-row',
      'sm:items-center',
    )

    const name = within(firstPlace).getByRole('heading', {
      name: 'Banco Nación',
    })
    expect(name).toHaveClass('font-semibold', 'text-[var(--sea-ink)]')
    expect(name).not.toHaveClass('font-serif', 'text-lg')
    expect(name.closest('button')).toBeNull()
    const titleGroup = name.parentElement
    expect(titleGroup).toHaveClass('flex', 'items-center')
    const editButton = within(titleGroup!).getByRole('button', {
      name: 'Editar lugar Banco Nación',
    })
    expect(editButton).toBeInTheDocument()
    const editIcon = editButton.querySelector('[data-icon="inline-start"]')
    expect(editIcon).toHaveClass('lucide-pencil')
    expect(editIcon).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    const transferButton = within(firstPlace).getByRole('button', {
      name: 'Transferir desde Banco Nación',
    })
    expect(transferButton).toHaveTextContent('Transferir')
    const transferIcon = transferButton.querySelector('[data-icon="inline-start"]')
    expect(transferIcon).toHaveClass('lucide-arrow-right-left')
    expect(transferIcon).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    const movementButton = within(titleGroup!).getByRole('button', {
      name: 'Ver movimientos de Banco Nación',
    })
    expect(movementButton).toHaveTextContent('Movimientos')
    expect(within(titleGroup!).getAllByRole('button')).toEqual([
      editButton,
      transferButton,
      movementButton,
    ])

    const header = screen.getByRole('heading', { name: 'Tus ahorros' })
      .parentElement?.parentElement
    expect(within(header!).getAllByRole('button')).toHaveLength(1)
    expect(within(header!).queryByRole('button', { name: 'Movimientos' })).not.toBeInTheDocument()
    expect(within(header!).getByRole('button', { name: 'Nuevo lugar' })).toBeInTheDocument()

    const balance = within(firstPlace).getByText('$ 125.000,00 · US$ 2.345,67')
    expect(balance).toHaveClass('text-right', 'whitespace-nowrap', 'tabular-nums')
    expect(within(firstPlace).queryByText('ARS')).not.toBeInTheDocument()
    expect(within(firstPlace).queryByText('USD')).not.toBeInTheDocument()
  })

  it('does not render movement details inline', () => {
    render(
      <SavingsPlacesTab
        workspace={{
          ...workspace,
          movements: [
            {
              kind: 'contribution',
              id: 'movement_1',
              placeId: 'bank',
              placeName: 'Banco Nación',
              amount: '25.00',
              currency: 'USD',
              createdAt: '2026-08-20T12:00:00.000Z',
            },
          ],
        }}
      />,
    )

    expect(screen.queryByText('Ahorro en Banco Nación')).not.toBeInTheDocument()
    expect(screen.queryByText('US$ 25,00')).not.toBeInTheDocument()
  })

  it('opens the selected place movements sheet and excludes outgoing transfers', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await user.click(
      screen.getByRole('button', { name: 'Ver movimientos de Banco Nación' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Movimientos de Banco Nación' }),
    ).toBeInTheDocument()
    const section = screen.getByRole('region', {
      name: 'Entradas de Banco Nación',
    })
    expect(within(section).getByText('Ahorro registrado')).toBeInTheDocument()
    expect(within(section).getByText('Transferencia desde Efectivo')).toBeInTheDocument()
    expect(
      within(section).queryByText('Transferencia de Banco Nación a Efectivo'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Movimientos de Banco Nación' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('opens the current edit sheet from the explicit place action', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await user.click(
      screen.getByRole('button', { name: 'Editar lugar Banco Nación' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Editar lugar' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre del lugar' })).toHaveValue('Banco Nación')
  })

  it('opens the transfer sheet from the explicit place action without making the row clickable', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    const firstPlace = within(
      screen.getByRole('region', { name: 'Lugares de ahorro' }),
    ).getAllByRole('listitem')[0]
    await user.click(
      within(firstPlace).getByRole('button', {
        name: 'Transferir desde Banco Nación',
      }),
    )

    expect(screen.getByRole('heading', { name: 'Transferir desde Banco Nación' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Desde' })).not.toBeInTheDocument()
    expect(firstPlace.tagName).toBe('LI')
    expect(firstPlace).not.toHaveAttribute('role', 'button')
    expect(screen.getByRole('combobox', { name: 'Hacia' })).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    expect(await screen.findByRole('option', { name: 'Efectivo' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Banco Nación' })).not.toBeInTheDocument()
  })

  it('switches transfer source and resets the draft', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await user.click(screen.getByRole('button', { name: 'Transferir desde Banco Nación' }))
    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    await user.click(screen.getByRole('combobox', { name: 'Moneda' }))
    await user.click(await screen.findByRole('option', { name: 'Dólares (USD)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '25')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Transferir desde Banco Nación' })).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Transferir desde Efectivo' }))

    expect(screen.getByRole('heading', { name: 'Transferir desde Efectivo' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Hacia' })).toHaveTextContent('Seleccionar destino')
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('Pesos (ARS)')
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('')
    expect(screen.getByText('Disponible: $ 500,00')).toBeInTheDocument()
  })

  it('updates the edit sheet with the newly selected place', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await user.click(screen.getByRole('button', { name: 'Editar lugar Banco Nación' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Editar lugar' })).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Editar lugar Efectivo' }))

    expect(screen.getByRole('textbox', { name: 'Nombre del lugar' })).toHaveValue('Efectivo')
  })

  it('opens a new place from the header', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={workspace} />)

    await user.click(screen.getByRole('button', { name: 'Nuevo lugar' }))
    expect(
      screen.getByRole('heading', { name: 'Nuevo lugar' }),
    ).toBeInTheDocument()
  })

  it('keeps the empty state useful for creating a place', async () => {
    const user = userEvent.setup()
    render(<SavingsPlacesTab workspace={{ places: [], movements: [] }} />)

    expect(screen.getByRole('heading', { name: 'Tus ahorros' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Movimientos' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo lugar' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Nuevo lugar' }))

    expect(
      screen.getByRole('heading', { name: 'Nuevo lugar' }),
    ).toBeInTheDocument()
  })
})
