// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import {
  createSavingsPlace,
  deleteSavingsPlace,
  renameSavingsPlace,
} from '../../../../features/savings-places/savings-places.functions'
import { toast } from 'sonner'
import type { SavingsPlaceSummary } from '../../../../features/savings-places/savings-places'
import { SavingsPlaceSheet } from './SavingsPlaceSheet'

const routerInvalidate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}))

vi.mock('../../../../features/savings-places/savings-places.functions', () => ({
  createSavingsPlace: vi.fn(),
  deleteSavingsPlace: vi.fn(),
  renameSavingsPlace: vi.fn(),
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
  balances: { ARS: '100.00', USD: '0.00' },
  hasMovements: true,
}

const cash: SavingsPlaceSummary = {
  id: 'cash',
  name: 'Efectivo',
  balances: { ARS: '0.00', USD: '0.00' },
  hasMovements: false,
}

function renderSheet(
  props: Partial<Parameters<typeof SavingsPlaceSheet>[0]> = {},
) {
  return render(
    <SavingsPlaceSheet open onOpenChange={vi.fn()} {...props} />,
  )
}

describe('SavingsPlaceSheet', () => {
  it('uses the right-side sheet shell and associated name field', () => {
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
    expect(screen.getByRole('heading', { name: 'Nuevo lugar' })).toHaveClass(
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
    expect(screen.getByRole('textbox', { name: 'Nombre del lugar' })).toHaveAttribute(
      'id',
      'place-name',
    )
  })

  it('creates a place, invalidates, closes, and shows a success toast', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.mocked(createSavingsPlace).mockResolvedValue({ placeId: 'new-place' })

    render(<SavingsPlaceSheet open onOpenChange={onOpenChange} />)
    await user.type(screen.getByRole('textbox', { name: 'Nombre del lugar' }), 'Banco Nación')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(createSavingsPlace).toHaveBeenCalledWith({
      data: { name: 'Banco Nación' },
    }))
    expect(routerInvalidate).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalledWith('Lugar creado.')
  })

  it('populates and renames the selected place', async () => {
    const user = userEvent.setup()
    vi.mocked(renameSavingsPlace).mockResolvedValue(undefined)

    renderSheet({ place: bank })

    expect(screen.getByRole('heading', { name: 'Editar lugar' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre del lugar' })).toHaveValue('Banco Nación')
    await user.clear(screen.getByRole('textbox', { name: 'Nombre del lugar' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre del lugar' }), 'Banco Galicia')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(renameSavingsPlace).toHaveBeenCalledWith({
      data: { placeId: 'bank', name: 'Banco Galicia' },
    }))
  })

  it('shows the rename success toast, invalidates, and closes', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.mocked(renameSavingsPlace).mockResolvedValue(undefined)

    render(<SavingsPlaceSheet open onOpenChange={onOpenChange} place={bank} />)
    const input = screen.getByRole('textbox', { name: 'Nombre del lugar' })
    await user.clear(input)
    await user.type(input, 'Banco Galicia')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(renameSavingsPlace).toHaveBeenCalledWith({
      data: { placeId: 'bank', name: 'Banco Galicia' },
    }))
    expect(toast.success).toHaveBeenCalledWith('Lugar renombrado.')
    expect(routerInvalidate).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('preserves the renamed name and displays a server error when rename fails', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.mocked(renameSavingsPlace).mockRejectedValue(new Error('No se pudo renombrar.'))

    render(<SavingsPlaceSheet open onOpenChange={onOpenChange} place={bank} />)
    const input = screen.getByRole('textbox', { name: 'Nombre del lugar' })
    await user.clear(input)
    await user.type(input, 'Banco Galicia')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo renombrar.'))
    expect(input).toHaveValue('Banco Galicia')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('resets the name and errors when reopening or switching places', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const view = render(
      <SavingsPlaceSheet open onOpenChange={onOpenChange} place={bank} />,
    )
    const input = screen.getByRole('textbox', { name: 'Nombre del lugar' })
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Escribí un nombre para el lugar.')
    await user.type(input, 'Nombre temporal')

    view.rerender(<SavingsPlaceSheet open onOpenChange={onOpenChange} place={cash} />)
    await waitFor(() => expect(input).toHaveValue('Efectivo'))

    view.rerender(<SavingsPlaceSheet open={false} onOpenChange={onOpenChange} place={cash} />)
    view.rerender(<SavingsPlaceSheet open onOpenChange={onOpenChange} />)
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nombre del lugar' })).toHaveValue(''))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the required name error instead of silently returning', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const field = screen.getByRole('textbox', { name: 'Nombre del lugar' }).closest('[data-slot="field"]')
    expect(field).toHaveAttribute('data-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Nombre del lugar' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Escribí un nombre para el lugar.')
    expect(createSavingsPlace).not.toHaveBeenCalled()
  })

  it('shows the pending copy and disables the save action', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    let resolveSave!: () => void
    vi.mocked(createSavingsPlace).mockImplementation(
      () => new Promise<{ placeId: string }>((resolve) => { resolveSave = () => resolve({ placeId: 'new-place' }) }),
    )
    render(<SavingsPlaceSheet open onOpenChange={onOpenChange} />)

    await user.type(screen.getByRole('textbox', { name: 'Nombre del lugar' }), 'Efectivo')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()
    resolveSave()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('preserves the entered name and shows a server error', async () => {
    const user = userEvent.setup()
    vi.mocked(createSavingsPlace).mockRejectedValue(new Error('Ese lugar ya existe.'))
    renderSheet()

    const input = screen.getByRole('textbox', { name: 'Nombre del lugar' })
    await user.type(input, 'Efectivo')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ese lugar ya existe.'))
    expect(input).toHaveValue('Efectivo')
  })

  it('keeps rename actions disabled through a place change and ignores close until completion', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    let resolveRename!: () => void
    vi.mocked(renameSavingsPlace).mockImplementation(
      () => new Promise<void>((resolve) => { resolveRename = resolve }),
    )
    const view = render(
      <SavingsPlaceSheet open onOpenChange={onOpenChange} place={bank} />,
    )

    const input = screen.getByRole('textbox', { name: 'Nombre del lugar' })
    await user.clear(input)
    await user.type(input, 'Banco Galicia')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(renameSavingsPlace).toHaveBeenCalled())

    view.rerender(<SavingsPlaceSheet open onOpenChange={onOpenChange} place={cash} />)
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    view.rerender(<SavingsPlaceSheet open={false} onOpenChange={onOpenChange} place={cash} />)
    view.rerender(<SavingsPlaceSheet open onOpenChange={onOpenChange} place={cash} />)
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()

    resolveRename()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('disables delete and save actions while deletion is pending', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    let resolveDelete!: () => void
    vi.mocked(deleteSavingsPlace).mockImplementation(
      () => new Promise<void>((resolve) => { resolveDelete = resolve }),
    )

    render(<SavingsPlaceSheet open onOpenChange={onOpenChange} place={bank} />)
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(deleteSavingsPlace).toHaveBeenCalledWith({
      data: { placeId: 'bank' },
    }))
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()

    resolveDelete()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    confirmSpy.mockRestore()
  })

  it('cancels deletion when confirmation is declined', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderSheet({ place: bank })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar este lugar?')
    expect(deleteSavingsPlace).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('deletes after confirmation, invalidates, closes, and shows a success toast', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(deleteSavingsPlace).mockResolvedValue(undefined)
    render(<SavingsPlaceSheet open onOpenChange={onOpenChange} place={bank} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(deleteSavingsPlace).toHaveBeenCalledWith({
      data: { placeId: 'bank' },
    }))
    expect(routerInvalidate).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalledWith('Lugar eliminado.')
    vi.restoreAllMocks()
  })
})
