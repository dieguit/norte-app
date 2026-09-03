// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSavingsPlaceSelection, SavingsPlacePicker } from './SavingsPlacePicker'

describe('SavingsPlacePicker', () => {
  afterEach(cleanup)

  it('maps select values to the controlled savings-place value', () => {
    expect(getSavingsPlaceSelection('__new__')).toEqual({ kind: 'new', name: '' })
    expect(getSavingsPlaceSelection('place-1')).toEqual({ kind: 'existing', placeId: 'place-1' })
    expect(getSavingsPlaceSelection(null)).toBeUndefined()
  })

  it('lists existing places and ends with the new-place option', async () => {
    const user = userEvent.setup()

    render(
      <SavingsPlacePicker
        places={[
          { id: 'place-1', name: 'Banco Santander' },
          { id: 'place-2', name: 'Caja de ahorro' },
        ]}
        value={null}
        onChange={vi.fn()}
      />,
    )

    const combobox = screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' })
    expect(combobox).toHaveAttribute('id', 'savings-place-trigger')
    expect(combobox).toHaveTextContent('Seleccionar lugar')

    await user.click(combobox)

    expect(await screen.findByRole('option', { name: 'Banco Santander' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Caja de ahorro' })).toBeInTheDocument()
    expect((await screen.findAllByRole('option')).at(-1)).toHaveTextContent('Otro (agregar nuevo)')
  })

  it('keeps the new option selected and emits the typed name', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    function ControlledPicker() {
      const [value, setValue] = useState<Parameters<typeof SavingsPlacePicker>[0]['value']>(null)
      return (
        <SavingsPlacePicker
          places={[]}
          value={value}
          onChange={(nextValue) => {
            setValue(nextValue)
            onChange(nextValue)
          }}
        />
      )
    }

    render(<ControlledPicker />)

    await user.click(screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' }))
    await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))

    const input = screen.getByRole('textbox', { name: 'Nombre del lugar nuevo' })
    expect(input).toHaveAttribute('id', 'new-savings-place-name')
    expect(screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' })).toHaveTextContent(
      'Otro (agregar nuevo)',
    )
    expect(screen.getByText('Este lugar se va a guardar para que puedas volver a usarlo')).toBeInTheDocument()

    await user.type(input, 'Caja fuerte')

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'new', name: 'Caja fuerte' })
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('changing the uncontrolled value state of Select to be controlled'),
    )
    consoleError.mockRestore()
  })

  it('hides the new-place input and emits an existing place ID when changed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function ControlledPicker() {
      const [value, setValue] = useState<Parameters<typeof SavingsPlacePicker>[0]['value']>({
        kind: 'new',
        name: 'Caja fuerte',
      })
      return <SavingsPlacePicker places={[{ id: 'place-1', name: 'Banco Santander' }]} value={value} onChange={(nextValue) => { setValue(nextValue); onChange(nextValue) }} />
    }

    render(<ControlledPicker />)

    expect(screen.getByRole('textbox', { name: 'Nombre del lugar nuevo' })).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' }))
    await user.click(await screen.findByRole('option', { name: 'Banco Santander' }))

    expect(screen.queryByRole('textbox', { name: 'Nombre del lugar nuevo' })).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'existing', placeId: 'place-1' })
  })

  it('displays a persisted place and emits its ID when selected again', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const placeId = 'place-1'

    render(
      <SavingsPlacePicker
        places={[{ id: placeId, name: 'Banco Santander' }]}
        value={{ kind: 'existing', placeId }}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' })).toHaveTextContent(
      'Banco Santander',
    )
    await user.click(screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' }))
    await user.click(await screen.findByRole('option', { name: 'Banco Santander' }))

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'existing', placeId })
  })

  it('associates the label and error state with the disabled picker', () => {
    render(
      <SavingsPlacePicker
        places={[]}
        value={null}
        onChange={vi.fn()}
        disabled
        error="Elegí un lugar para tu ahorro."
      />,
    )

    const combobox = screen.getByRole('combobox', { name: '¿Dónde está este ahorro?' })
    expect(combobox).toBeDisabled()
    expect(combobox).toHaveAttribute('aria-label', '¿Dónde está este ahorro?')
    expect(combobox).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Elegí un lugar para tu ahorro.')).toBeInTheDocument()
    expect(screen.getByText('Elegí un lugar para tu ahorro.').closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'true',
    )
  })

  it('associates a new-place validation error with the new-name input', () => {
    const error = 'Escribí un nombre para el lugar.'

    render(
      <SavingsPlacePicker
        places={[]}
        value={{ kind: 'new', name: '' }}
        onChange={vi.fn()}
        error={error}
      />,
    )

    const input = screen.getByRole('textbox', { name: 'Nombre del lugar nuevo' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'new-savings-place-error')
    expect(screen.getByText(error)).toHaveAttribute('data-slot', 'field-error')
  })
})
