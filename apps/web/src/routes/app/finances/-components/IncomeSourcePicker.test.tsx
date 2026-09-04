// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IncomeSourcePicker } from './IncomeSourcePicker'

describe('IncomeSourcePicker', () => {
  afterEach(cleanup)

  it('lists recurrent fixed and custom sources, ending with the new-source option', async () => {
    const user = userEvent.setup()

    render(
      <IncomeSourcePicker
        recurring
        sources={[{ id: 'source_1', name: 'Consultoría' }]}
        value={{ kind: 'salary' }}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))

    expect(await screen.findByRole('option', { name: 'Sueldo' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Venta de bienes / usados' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Consultoría' })).toBeInTheDocument()
    const options = await screen.findAllByRole('option')
    expect(options.at(-2)).toHaveTextContent('Sin categoría')
    expect(options.at(-1)).toHaveTextContent('Otro (agregar nuevo)')
  })

  it('lists one-time fixed and custom sources, ending with the new-source option', async () => {
    const user = userEvent.setup()

    render(
      <IncomeSourcePicker
        recurring={false}
        sources={[{ id: 'source_1', name: 'Consultoría' }]}
        value={{ kind: 'asset_sale' }}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))

    expect(await screen.findByRole('option', { name: 'Venta de bienes / usados' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Sueldo' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Consultoría' })).toBeInTheDocument()
    const options = await screen.findAllByRole('option')
    expect(options.at(-2)).toHaveTextContent('Sin categoría')
    expect(options.at(-1)).toHaveTextContent('Otro (agregar nuevo)')
  })

  it('shows the category placeholder when no category is selected', () => {
    render(
      <IncomeSourcePicker
        recurring
        sources={[]}
        value={undefined}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveTextContent(
      'Seleccionar categoría',
    )
  })

  it('shows a name input and keeps the other option selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function ControlledPicker() {
      const [value, setValue] = useState<Parameters<typeof IncomeSourcePicker>[0]['value']>({ kind: 'salary' })
      return <IncomeSourcePicker recurring sources={[]} value={value} onChange={(nextValue) => { setValue(nextValue); onChange(nextValue) }} />
    }

    render(<ControlledPicker />)

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' }), 'Consultoría')

    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveTextContent('Otro (agregar nuevo)')
    expect(screen.getByText('Esta categoría se va a guardar para que puedas volver a usarla')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', name: 'Consultoría' })
  })

  it('hides the new-source input when a regular option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    const { rerender } = render(
      <IncomeSourcePicker recurring sources={[]} value={{ kind: 'salary' }} onChange={onChange} />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))
    rerender(<IncomeSourcePicker recurring sources={[]} value={{ kind: 'custom', name: '' }} onChange={onChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Trabajo independiente' }))
    rerender(<IncomeSourcePicker recurring sources={[]} value={{ kind: 'independent' }} onChange={onChange} />)

    expect(screen.queryByRole('textbox', { name: 'Nombre de la categoría nueva' })).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'independent' })
  })

  it('displays persisted custom sources and emits their source ID', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const sourceId = '00000000-0000-4000-8000-000000000001'

    render(
      <IncomeSourcePicker
        recurring
        sources={[{ id: sourceId, name: 'Consultoría' }]}
        value={{ kind: 'custom', sourceId }}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveTextContent('Consultoría')
    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Consultoría' }))

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', sourceId })
  })

  it('associates category errors with the trigger and custom category input', () => {
    const { rerender } = render(
      <IncomeSourcePicker
        recurring
        sources={[]}
        value={{ kind: 'salary' }}
        error="Ingresá una categoría."
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).toHaveAttribute('aria-describedby', 'income-source-error')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'income-source-error')

    rerender(
      <IncomeSourcePicker
        recurring
        sources={[]}
        value={{ kind: 'custom', name: '' }}
        error="Ingresá una categoría."
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('combobox', { name: 'Categoría del ingreso' })).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' })).toHaveAttribute('aria-describedby', 'income-source-error')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(document.querySelectorAll('#income-source-error')).toHaveLength(1)
  })

})
