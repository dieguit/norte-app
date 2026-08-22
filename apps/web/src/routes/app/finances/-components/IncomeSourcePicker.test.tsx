// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IncomeSourcePicker } from './IncomeSourcePicker'

describe('IncomeSourcePicker', () => {
  afterEach(cleanup)

  it('puts add new before source items and does not show a search textbox', async () => {
    const user = userEvent.setup()

    render(
      <IncomeSourcePicker
        sources={[{ id: 'source_1', name: 'Consultoría' }]}
        value={{ kind: 'salary' }}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))

    const addNew = screen.getByRole('button', { name: '+ Agregar nuevo' })
    const source = screen.getByRole('button', { name: 'Consultoría' })

    expect(addNew.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('reports a custom source while typing its name', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <IncomeSourcePicker
        sources={[]}
        value={{ kind: 'salary' }}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))
    await user.click(screen.getByRole('button', { name: '+ Agregar nuevo' }))
    await user.type(screen.getByRole('textbox', { name: 'Nueva fuente' }), 'Consultoría')

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', name: 'Consultoría' })
  })

  it('does not change the selected source when add-new is activated', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <IncomeSourcePicker
        sources={[]}
        value={{ kind: 'salary' }}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))
    await user.click(screen.getByRole('button', { name: '+ Agregar nuevo' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('resets add mode after selecting an existing source', async () => {
    const user = userEvent.setup()

    render(
      <IncomeSourcePicker
        sources={[{ id: 'source_1', name: 'Consultoría' }]}
        value={{ kind: 'salary' }}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))
    await user.click(screen.getByRole('button', { name: '+ Agregar nuevo' }))

    expect(screen.getByRole('textbox', { name: 'Nueva fuente' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Consultoría' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))
    expect(screen.queryByRole('textbox', { name: 'Nueva fuente' })).not.toBeInTheDocument()
  })

  it('resets add mode when the popover is dismissed with Escape', async () => {
    const user = userEvent.setup()

    render(
      <IncomeSourcePicker
        sources={[]}
        value={{ kind: 'salary' }}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))
    await user.click(screen.getByRole('button', { name: '+ Agregar nuevo' }))
    expect(screen.getByRole('textbox', { name: 'Nueva fuente' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))
    expect(screen.queryByRole('textbox', { name: 'Nueva fuente' })).not.toBeInTheDocument()
  })

  it('resets add mode when the popover is dismissed by clicking outside', async () => {
    const user = userEvent.setup()

    render(
      <>
        <button type="button">Fuera</button>
        <IncomeSourcePicker
          sources={[]}
          value={{ kind: 'salary' }}
          onChange={vi.fn()}
        />
      </>,
    )

    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))
    await user.click(screen.getByRole('button', { name: '+ Agregar nuevo' }))
    expect(screen.getByRole('textbox', { name: 'Nueva fuente' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fuera' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '¿De dónde viene este ingreso?', expanded: false }))
    expect(screen.queryByRole('textbox', { name: 'Nueva fuente' })).not.toBeInTheDocument()
  })

  it('falls back to selecting a source when the custom name is empty', () => {
    render(
      <IncomeSourcePicker
        sources={[]}
        value={{ kind: 'custom', name: '' }}
        onChange={vi.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: '¿De dónde viene este ingreso?' })
    expect(trigger).toHaveTextContent('Seleccionar fuente')
  })
})
