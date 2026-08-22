// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IncomeSourcePicker } from './IncomeSourcePicker'

describe('IncomeSourcePicker', () => {
  afterEach(cleanup)

  it('lists existing sources and ends with the new-source option', async () => {
    const user = userEvent.setup()

    render(
      <IncomeSourcePicker
        sources={[{ id: 'source_1', name: 'Consultoría' }]}
        value={{ kind: 'salary' }}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' }))

    expect(await screen.findByRole('option', { name: 'Consultoría' })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' })).toBeInTheDocument()
  })

  it('puts the new-source option after every regular option', async () => {
    const user = userEvent.setup()

    render(
      <IncomeSourcePicker
        sources={[{ id: 'source_1', name: 'Consultoría' }]}
        value={{ kind: 'salary' }}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' }))

    expect((await screen.findAllByRole('option')).at(-1)).toHaveTextContent('Otro (agregar nuevo)')
  })

  it('shows a name input and keeps the other option selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function ControlledPicker() {
      const [value, setValue] = useState<Parameters<typeof IncomeSourcePicker>[0]['value']>({ kind: 'salary' })
      return <IncomeSourcePicker sources={[]} value={value} onChange={(nextValue) => { setValue(nextValue); onChange(nextValue) }} />
    }

    render(<ControlledPicker />)

    await user.click(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' }))
    await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre del ingreso nuevo' }), 'Consultoría')

    expect(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' })).toHaveTextContent('Otro (agregar nuevo)')
    expect(screen.getByText('Este ingreso se va a guardar para que puedas volver a usarlo')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', name: 'Consultoría' })
  })

  it('hides the new-source input when a regular option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    const { rerender } = render(
      <IncomeSourcePicker sources={[]} value={{ kind: 'salary' }} onChange={onChange} />,
    )

    await user.click(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' }))
    await user.click(await screen.findByRole('option', { name: 'Otro (agregar nuevo)' }))
    rerender(<IncomeSourcePicker sources={[]} value={{ kind: 'custom', name: '' }} onChange={onChange} />)
    await user.click(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' }))
    await user.click(await screen.findByRole('option', { name: 'Trabajo independiente' }))
    rerender(<IncomeSourcePicker sources={[]} value={{ kind: 'independent' }} onChange={onChange} />)

    expect(screen.queryByRole('textbox', { name: 'Nombre del ingreso nuevo' })).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'independent' })
  })

  it('displays persisted custom sources and emits their source ID', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const sourceId = '00000000-0000-4000-8000-000000000001'

    render(
      <IncomeSourcePicker
        sources={[{ id: sourceId, name: 'Consultoría' }]}
        value={{ kind: 'custom', sourceId }}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' })).toHaveTextContent('Consultoría')
    await user.click(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' }))
    await user.click(await screen.findByRole('option', { name: 'Consultoría' }))

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', sourceId })
  })

})
