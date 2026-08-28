// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType } from 'react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import { transferSavings } from '../../../../features/savings-places/savings-places.functions'
import type { SavingsPlaceSummary } from '../../../../features/savings-places/savings-places'
import { toast } from 'sonner'
import { SavingsTransferSheet } from './SavingsTransferSheet'

const routerInvalidate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../../features/savings-places/savings-places.functions', () => ({
  transferSavings: vi.fn(),
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useRouter).mockReturnValue({ invalidate: routerInvalidate } as never)
  routerInvalidate.mockResolvedValue(undefined)
})

const bank: SavingsPlaceSummary = {
  id: 'bank',
  name: 'Banco Nación',
  balances: { ARS: '125000.00', USD: '2345.67' },
  hasMovements: true,
}

const cash: SavingsPlaceSummary = {
  id: 'cash',
  name: 'Efectivo',
  balances: { ARS: '500.00', USD: '0.00' },
  hasMovements: false,
}

const places = [bank, cash]

type TransferSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromPlace: SavingsPlaceSummary
  places: SavingsPlaceSummary[]
}

const TransferSheet = SavingsTransferSheet as unknown as ComponentType<TransferSheetProps>

function renderSheet(
  props: Partial<{
    open: boolean
    onOpenChange: (open: boolean) => void
    fromPlace: SavingsPlaceSummary
    places: SavingsPlaceSummary[]
  }> = {},
) {
  return render(
    <TransferSheet
      open
      onOpenChange={vi.fn()}
      fromPlace={bank}
      places={places}
      {...props}
    />,
  )
}

describe('SavingsTransferSheet', () => {
  it('uses the transfer sheet shell and stable labelled fields', () => {
    renderSheet()

    const sheet = screen.getByRole('dialog')
    expect(sheet).toHaveClass(
      'flex',
      'flex-col',
      'gap-0',
      'p-0',
      'data-[side=right]:w-full',
      'data-[side=right]:sm:w-[450px]',
      'data-[side=right]:sm:max-w-[450px]',
    )
    expect(document.querySelector('[data-slot="sheet-header"]')).toHaveClass(
      'border-b',
      'px-6',
      'py-5',
    )
    expect(screen.getByRole('heading', { name: 'Transferir desde Banco Nación' })).toHaveClass(
      'font-serif',
      'text-2xl',
      'text-[var(--sea-ink)]',
    )
    expect(document.querySelector('form')).toHaveClass(
      'flex',
      'flex-1',
      'flex-col',
      'gap-5',
      'overflow-y-auto',
      'p-6',
    )
    expect(screen.queryByRole('combobox', { name: 'Desde' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Hacia' })).toHaveAttribute(
      'id',
      'savings-transfer-destination-trigger',
    )
    expect(screen.getByRole('combobox', { name: 'Hacia' }).closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'false',
    )
    expect(document.querySelector('label[for="savings-transfer-destination-trigger"]')).toHaveAttribute(
      'for',
      'savings-transfer-destination-trigger',
    )
    expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveAttribute(
      'id',
      'savings-transfer-currency-trigger',
    )
    expect(screen.getByRole('combobox', { name: 'Moneda' }).closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'false',
    )
    expect(document.querySelector('label[for="savings-transfer-currency-trigger"]')).toHaveAttribute(
      'for',
      'savings-transfer-currency-trigger',
    )
    expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveAttribute(
      'id',
      'savings-transfer-amount',
    )
    expect(document.querySelector('label[for="savings-transfer-amount"]')).toHaveAttribute(
      'for',
      'savings-transfer-amount',
    )
    expect(screen.getByRole('textbox', { name: 'Monto' }).closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'false',
    )
  })

  it('excludes the source from destinations and shows its formatted balance', async () => {
    const user = userEvent.setup()
    renderSheet()

    expect(screen.getByText('Disponible: $ 125.000,00')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))

    expect(await screen.findByRole('option', { name: 'Efectivo' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Banco Nación' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: 'Efectivo' }))
    expect(screen.getByRole('combobox', { name: 'Hacia' })).toHaveTextContent('Efectivo')
    expect(screen.getByRole('combobox', { name: 'Hacia' })).not.toHaveTextContent('cash')
  })

  it('shows field errors and disables invalid or insufficient submissions', async () => {
    const user = userEvent.setup()
    renderSheet({
      fromPlace: { ...bank, balances: { ARS: '100.00', USD: '0.00' } },
    })

    fireEvent.submit(document.querySelector('form')!)
    expect(screen.getByRole('combobox', { name: 'Hacia' }).closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'true',
    )
    expect(screen.getByText('Elegí un destino.')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '125')

    expect(screen.getByText('Saldo insuficiente en el origen.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Monto' }).closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'true',
    )
    expect(transferSavings).not.toHaveBeenCalled()
  })

  it('shows an inline error for a non-positive typed amount', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '0')

    expect(screen.getByText('Ingresá un monto mayor a cero.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Monto' }).closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeDisabled()
  })

  it('parses a positive localized amount and always sends the contextual source', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '1.250,50')
    await user.click(screen.getByRole('button', { name: 'Transferir' }))

    await waitFor(() => expect(transferSavings).toHaveBeenCalledWith({
      data: {
        fromPlaceId: 'bank',
        toPlaceId: 'cash',
        currency: 'ARS',
        amount: '1250.50',
      },
    }))
  })

  it('preserves the form and displays a server error', async () => {
    const user = userEvent.setup()
    vi.mocked(transferSavings).mockRejectedValue(new Error('No se pudo transferir.'))
    renderSheet()

    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    const amount = screen.getByRole('textbox', { name: 'Monto' })
    await user.type(amount, '25')
    await user.click(screen.getByRole('button', { name: 'Transferir' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo transferir.'))
    expect(amount).toHaveValue('25')
  })

  it('keeps the request pending, prevents duplicate submission, and ignores close', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    let resolveTransfer!: () => void
    vi.mocked(transferSavings).mockImplementation(
      () => new Promise<{ transferId: string }>((resolve) => {
        resolveTransfer = () => resolve({ transferId: 'transfer' })
      }),
    )
    renderSheet({ onOpenChange })

    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '25')
    await user.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByRole('button', { name: 'Transfiriendo...' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Transfiriendo...' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(transferSavings).toHaveBeenCalledTimes(1)

    resolveTransfer()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('invalidates, closes, and shows success after a transfer', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.mocked(transferSavings).mockResolvedValue({ transferId: 'transfer' })
    renderSheet({ onOpenChange })

    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '25')
    await user.click(screen.getByRole('button', { name: 'Transferir' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(routerInvalidate).toHaveBeenCalled()
    expect((await import('sonner')).toast.success).toHaveBeenCalledWith('Transferencia realizada.')
  })

  it('closes exactly once after transfer success even when refresh fails', async () => {
    const user = userEvent.setup()
    let rejectRefresh!: (cause: Error) => void
    vi.mocked(transferSavings).mockResolvedValue({ transferId: 'transfer' })
    routerInvalidate.mockImplementation(
      () => new Promise<void>((_, reject) => { rejectRefresh = reject }),
    )

    function ControlledSheet() {
      const [open, setOpen] = useState(true)
      return (
        <TransferSheet
          open={open}
          onOpenChange={setOpen}
          fromPlace={bank}
          places={places}
        />
      )
    }

    render(<ControlledSheet />)
    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '25')
    await user.click(screen.getByRole('button', { name: 'Transferir' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(transferSavings).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Transferencia realizada.')

    rejectRefresh(new Error('No se pudo actualizar la vista.'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'La transferencia se realizó, pero no pudimos actualizar la vista.',
    ))
    expect(transferSavings).toHaveBeenCalledTimes(1)
  })

  it('resets destination, currency, amount, and errors when reopened for another source', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const view = renderSheet({ onOpenChange })

    await user.click(screen.getByRole('button', { name: 'Transferir' }))
    await user.click(screen.getByRole('combobox', { name: 'Hacia' }))
    await user.click(await screen.findByRole('option', { name: 'Efectivo' }))
    await user.click(screen.getByRole('combobox', { name: 'Moneda' }))
    await user.click(await screen.findByRole('option', { name: 'Dólares (USD)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '25')

    view.rerender(
      <TransferSheet
        open
        onOpenChange={onOpenChange}
        fromPlace={cash}
        places={places}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Transferir desde Efectivo' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Hacia' })).toHaveTextContent('Seleccionar destino')
      expect(screen.getByRole('combobox', { name: 'Moneda' })).toHaveTextContent('Pesos (ARS)')
      expect(screen.getByRole('textbox', { name: 'Monto' })).toHaveValue('')
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
