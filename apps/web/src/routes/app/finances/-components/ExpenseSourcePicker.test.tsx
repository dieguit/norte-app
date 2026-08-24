// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpenseSourcePicker } from './ExpenseSourcePicker'

describe('ExpenseSourcePicker', () => {
  afterEach(cleanup)

  it('lists recurrent fixed and custom sources, ending with the new-source option', async () => {
    const user = userEvent.setup()
    render(<ExpenseSourcePicker recurring sources={[{ id: 'source_1', name: 'Gimnasio' }]} value={{ kind: 'housing' }} onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox', { name: 'Concepto del gasto' }))

    expect(await screen.findByRole('option', { name: 'Alquiler / vivienda' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Compra de ropa' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gimnasio' })).toBeInTheDocument()
    expect((await screen.findAllByRole('option')).at(-1)).toHaveTextContent('Otro (agregar nuevo)')
  })

  it('lists one-time fixed and custom sources, ending with the new-source option', async () => {
    const user = userEvent.setup()
    render(<ExpenseSourcePicker recurring={false} sources={[{ id: 'source_1', name: 'Gimnasio' }]} value={{ kind: 'clothing' }} onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox', { name: 'Concepto del gasto' }))

    expect(await screen.findByRole('option', { name: 'Compra de ropa' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Alquiler / vivienda' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gimnasio' })).toBeInTheDocument()
    expect((await screen.findAllByRole('option')).at(-1)).toHaveTextContent('Otro (agregar nuevo)')
  })

  it('shows a name input and keeps the other option selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function ControlledPicker() {
      const [value, setValue] = useState<Parameters<typeof ExpenseSourcePicker>[0]['value']>({ kind: 'housing' })
      return <ExpenseSourcePicker recurring sources={[]} value={value} onChange={(nextValue) => { setValue(nextValue); onChange(nextValue) }} />
    }

    render(<ControlledPicker />)

    await user.click(screen.getByRole('combobox', { name: 'Concepto del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre del gasto nuevo' }), 'Gimnasio')

    expect(screen.getByRole('combobox', { name: 'Concepto del gasto' })).toHaveTextContent('Otro (agregar nuevo)')
    expect(screen.getByText('Este gasto se va a guardar para que puedas volver a usarlo')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', name: 'Gimnasio' })
  })

  it('hides the new-source input when a regular option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    const { rerender } = render(
      <ExpenseSourcePicker recurring sources={[]} value={{ kind: 'housing' }} onChange={onChange} />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Concepto del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))
    rerender(<ExpenseSourcePicker recurring sources={[]} value={{ kind: 'custom', name: '' }} onChange={onChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Concepto del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Servicios' }))
    rerender(<ExpenseSourcePicker recurring sources={[]} value={{ kind: 'utilities' }} onChange={onChange} />)

    expect(screen.queryByRole('textbox', { name: 'Nombre del gasto nuevo' })).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'utilities' })
  })

  it('displays persisted custom sources and emits their source ID', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const sourceId = '00000000-0000-4000-8000-000000000001'

    render(
      <ExpenseSourcePicker
        recurring
        sources={[{ id: sourceId, name: 'Gimnasio' }]}
        value={{ kind: 'custom', sourceId }}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Concepto del gasto' })).toHaveTextContent('Gimnasio')
    await user.click(screen.getByRole('combobox', { name: 'Concepto del gasto' }))
    await user.click(await screen.findByRole('option', { name: 'Gimnasio' }))

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', sourceId })
  })
})
