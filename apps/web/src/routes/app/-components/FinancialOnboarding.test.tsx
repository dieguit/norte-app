// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { FinancialOnboarding } from './FinancialOnboarding'

afterEach(cleanup)

describe('FinancialOnboarding', () => {
  it('introduces goals, finances, and the roadmap before asking for data', () => {
    render(<FinancialOnboarding />)

    expect(screen.getByText('Paso 1 de 4')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Tu plan empieza con una dirección clara' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Objetivos' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Finanzas' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Hoja de ruta' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Empezar' })).toBeVisible()
    expect(screen.queryByLabelText('Tipo de objetivo')).not.toBeInTheDocument()
  })

  it('starts the objective screen with a derived emergency fund', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Empezar' }))

    expect(screen.getByText('Paso 2 de 4')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Elegí tu primer objetivo' })).toBeVisible()
    expect(screen.getByLabelText('Tipo de objetivo')).toHaveTextContent('Colchón financiero')
    expect(screen.getByLabelText('Nombre del objetivo')).toHaveValue('Colchón financiero')
    expect(screen.getByText('Dólares (USD)')).toBeVisible()
    expect(screen.getByText('El colchón equivale a 6 meses de gastos y se calculará automáticamente.')).toBeVisible()
    expect(screen.queryByLabelText('Monto objetivo')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Ahorrar' })).not.toBeInTheDocument()
    expect(screen.queryByText(/distribución/i)).not.toBeInTheDocument()
  })

  it('requires canonical details for a non-emergency objective', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(screen.getByLabelText('Tipo de objetivo'))
    await user.click(screen.getByRole('option', { name: 'Compra o gasto grande' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Ingresá un nombre.')).toBeVisible()
    expect(screen.getByText('Ingresá un monto objetivo mayor a cero.')).toBeVisible()
    expect(screen.getByLabelText('Moneda')).toBeVisible()
    expect(screen.getByLabelText('Mes objetivo')).toBeVisible()
    expect(screen.getByText('Paso 2 de 4')).toBeVisible()
  })

  it('retains the objective while navigating through the deferred financial steps', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(screen.getByLabelText('Tipo de objetivo'))
    await user.click(screen.getByRole('option', { name: 'Otro objetivo' }))
    await user.type(screen.getByLabelText('Nombre del objetivo'), 'Viaje al sur')
    await user.type(screen.getByLabelText('Monto objetivo'), '2.000.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Paso 3 de 4')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Ingresos' })).toBeVisible()
    expect(screen.getByText('Este paso se completa en la próxima etapa.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Paso 4 de 4')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Gastos' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /finalizar|guardar|ver mi plan/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Volver' }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByLabelText('Nombre del objetivo')).toHaveValue('Viaje al sur')
    expect(screen.getByLabelText('Monto objetivo')).toHaveValue('2.000.000')
  })
})

