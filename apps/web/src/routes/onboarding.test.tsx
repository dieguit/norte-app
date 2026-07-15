// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingPage } from './onboarding'
import { getOnboardingDraft, saveOnboardingDraft } from '../onboarding/server'
import { getActiveSteps, validateStep, type OnboardingAnswers } from '../onboarding/definition'
import type { OnboardingDraft } from '../db/schema'

const deviceId = '6f0a7482-29a0-4c03-a3e1-256add2f91a8'
const initialAnswers: OnboardingAnswers = {
  nombre: 'Ada',
  contacto_canal: 'Email',
  email: 'ada@example.com',
}

function makeDraft(answers: OnboardingAnswers): OnboardingDraft {
  const timestamp = new Date('2026-07-15T00:00:00.000Z')
  return {
    deviceId,
    answers: { ...initialAnswers, ...answers },
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function setDraft(answers: OnboardingAnswers) {
  vi.mocked(getOnboardingDraft).mockResolvedValue(makeDraft(answers))
}

async function continueStep(user: ReturnType<typeof userEvent.setup>) {
  const continueButton = screen.getByRole('button', { name: /continuar/i })
  await user.click(continueButton)
  await waitForElementToBeRemoved(continueButton)
}

async function advanceToCardP17(cardIndex: number) {
  cleanup()
  localStorage.clear()
  localStorage.setItem('onboarding-welcome-seen', 'true')
  setDraft({
    p1_pesa: 'Otra',
    ing_total: 500000,
    fijo_total_directo: 1,
    var_total_directo: 1,
    d_salidas: 1,
    t1_resumen_ars: 1,
    p15_tarjetas: cardIndex,
  })
  render(<OnboardingPage />)
  await screen.findByRole('heading', { name: /Tarjeta 1 - las cuotas que siguen/i })
}

vi.mock('../onboarding/server', () => ({
  getOnboardingDraft: vi.fn(),
  saveOnboardingDraft: vi.fn(),
}))

describe('OnboardingPage component tests', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('onboarding-welcome-seen', 'true')
    vi.clearAllMocks()
    vi.mocked(getOnboardingDraft).mockResolvedValue(makeDraft({}))
    vi.mocked(saveOnboardingDraft).mockResolvedValue({} as any)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders all fields in the current step and blocks Next for a missing required field', async () => {
    const user = userEvent.setup()
    vi.mocked(getOnboardingDraft).mockResolvedValue({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
        answers: { ...initialAnswers, p1_pesa: 'Otra' },
      stepIndex: 3,
      completed: false,
      updatedAt: new Date().toISOString(),
    } as any)
    render(<OnboardingPage />)

    const input = await screen.findByLabelText(/Monto mensual/i)
    expect(input).toBeDefined()
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByText('Este campo es requerido.')).toBeDefined()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('ing_total-error')
  })

  it('does not let pending server hydration overwrite a local edit', async () => {
    const user = userEvent.setup()
    let resolveDraft!: (draft: OnboardingDraft) => void
    vi.mocked(getOnboardingDraft).mockReturnValue(new Promise((resolve) => {
      resolveDraft = resolve
    }) as any)
    render(<OnboardingPage />)

    await user.type(await screen.findByLabelText(/^Nombre/), 'Ada')
    await continueStep(user)
    await user.click(await screen.findByRole('radio', { name: 'Email' }))
    await user.type(screen.getByRole('textbox', { name: /^Email/ }), 'ada@example.com')
    await continueStep(user)
    const localChoice = await screen.findByRole('radio', { name: /otra/i })
    await user.click(localChoice)

    resolveDraft(makeDraft({ p1_pesa: 'Gano bien pero no sé a dónde se va la plata' }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect((localChoice as HTMLInputElement).checked).toBe(true)
  })

  it('formats numeric amounts with Argentine separators but saves a number', async () => {
    const user = userEvent.setup()
    vi.mocked(getOnboardingDraft).mockResolvedValue({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers: { ...initialAnswers, p1_pesa: 'Otra' },
      stepIndex: 3,
      completed: false,
      updatedAt: new Date().toISOString(),
    } as any)
    render(<OnboardingPage />)

    const input = await screen.findByLabelText(/Monto mensual/i)
    await user.type(input, '1000000')

    expect(input.getAttribute('value')).toBe('1.000.000')
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    expect(saveOnboardingDraft).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        answers: expect.objectContaining({ ing_total: 1000000 }),
      }),
    }))
  })

  it('normalizes pasted separators and keeps an empty numeric field empty', async () => {
    const user = userEvent.setup()
    vi.mocked(getOnboardingDraft).mockResolvedValue({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers: { ...initialAnswers, p1_pesa: 'Otra' },
      stepIndex: 3,
      completed: false,
      updatedAt: new Date().toISOString(),
    } as any)
    render(<OnboardingPage />)

    const input = await screen.findByLabelText(/Monto mensual/i)
    await user.click(input)
    await user.paste('1.000.000')
    expect(input.getAttribute('value')).toBe('1.000.000')
    await user.clear(input)
    expect(input.getAttribute('value')).toBe('')
  })

  it('clears conditional answers when their condition is turned off', async () => {
    const user = userEvent.setup()
    setDraft({ p1_pesa: 'Otra', ing_total: 500000 })
    render(<OnboardingPage />)

    await user.type(await screen.findByLabelText(/directamente el total/i), '1')
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    await user.click(await screen.findByRole('radio', { name: /^sí$/i }))
    const amount = (await screen.findAllByLabelText(/cuota mensual/i))[0]!
    await user.type(amount, '100000')
    await user.click(screen.getByRole('radio', { name: /^no,/i }))
    await user.click(screen.getByRole('radio', { name: /^sí$/i }))

    expect((screen.getAllByLabelText(/cuota mensual/i)[0] as HTMLInputElement).value).toBe('')
  })

  it('saves the completed step before moving forward', async () => {
    const user = userEvent.setup()
    vi.mocked(getOnboardingDraft).mockResolvedValue({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
        answers: { ...initialAnswers, p1_pesa: 'Otra' },
      stepIndex: 3,
      completed: false,
      updatedAt: new Date().toISOString(),
    } as any)
    render(<OnboardingPage />)

    const input = await screen.findByLabelText(/Monto mensual/i)
    await user.type(input, '1000000')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(saveOnboardingDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          answers: expect.objectContaining({
            ing_total: 1000000,
          }),
        }),
      }),
    )
  })

  it('asserts a rejected save displays a retry message and does not render the next step', async () => {
    const user = userEvent.setup()
    vi.mocked(saveOnboardingDraft).mockRejectedValueOnce(new Error('Network Error'))
    vi.mocked(getOnboardingDraft).mockResolvedValue({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
        answers: { ...initialAnswers, p1_pesa: 'Otra' },
      stepIndex: 3,
      completed: false,
      updatedAt: new Date().toISOString(),
    } as any)
    render(<OnboardingPage />)

    const input = await screen.findByLabelText(/Monto mensual/i)
    await user.type(input, '1000000')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    // Displays retry/error message
    expect(await screen.findByText(/error al guardar/i)).toBeDefined()
    // Does not render the next step
    expect(screen.queryByLabelText(/Alquiler \/ vivienda/i)).toBeNull()
  })

  it('renders P1 in Spanish and blocks the required answer', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)

    expect(await screen.findByRole('heading', { name: /que te esta pesando mas hoy/i })).toBeDefined()
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    expect(screen.getByRole('alert').textContent).toContain('Elegí una opción')
  })

  it('uses fieldset legends and associates group errors with the fieldset', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)

    const group = await screen.findByRole('group', { name: /selecciona una opción/i })
    expect(group.querySelector('label[for="p1_pesa"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    const error = screen.getByText(/elegí una opción/i)
    expect(group.getAttribute('aria-describedby')).toBe('p1_pesa-error')
    expect(error.getAttribute('id')).toBe('p1_pesa-error')
  })

  it('restores from answers instead of reusing a stale filtered-step index', async () => {
    localStorage.setItem('onboarding-draft', JSON.stringify({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers: { ...initialAnswers, p1_pesa: 'Otra' },
      stepIndex: 15,
      completed: false,
      updatedAt: new Date().toISOString(),
    }))

    render(<OnboardingPage />)

    expect(await screen.findByLabelText(/Monto mensual/i)).toBeDefined()
  })

  it('shows the statement upload option as disabled', async () => {
    render(<OnboardingPage />)
    await advanceToCardP17(1)
    expect((screen.getByRole('radio', { name: /subir foto del resumen/i }) as HTMLInputElement).disabled).toBe(true)
  })

  it('shows P6 after selecting third-party income in P5', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)

    await user.click(await screen.findByRole('radio', { name: /otra/i }))
    await continueStep(user)
    await continueStep(user)
    await continueStep(user)
    await user.type(screen.getByLabelText(/monto mensual/i), '500000')
    await continueStep(user)

    await user.click(screen.getByRole('checkbox', { name: /aportes de un tercero/i }))
    await continueStep(user)

    expect(await screen.findByRole('heading', { name: /ese ingreso de un tercero/i })).toBeDefined()
  })

  it('renders P9, P11, and P12 rows as independent inputs without a table', async () => {
    const baseAnswers: OnboardingAnswers = {
      p1_pesa: 'Otra',
      ing_total: 500000,
    }
    const cases: Array<{ answers: OnboardingAnswers; labels: RegExp[] }> = [
      {
        answers: baseAnswers,
        labels: [/alquiler \/ vivienda/i, /directamente el total/i],
      },
      {
        answers: { ...baseAnswers, fijo_total_directo: 100000 },
        labels: [/comida \/ súper/i, /el total, si lo tenés/i],
      },
      {
        answers: { ...baseAnswers, fijo_total_directo: 100000, var_total_directo: 80000 },
        labels: [/salidas/i, /hobbies \/ actividades propias/i],
      },
    ]

    for (const { answers, labels } of cases) {
      cleanup()
      localStorage.clear()
      localStorage.setItem('onboarding-welcome-seen', 'true')
      setDraft(answers)
      render(<OnboardingPage />)
      expect(screen.queryByRole('table')).toBeNull()
      for (const label of labels) expect(await screen.findByLabelText(label)).toBeDefined()
    }
  })

  it('shows P13 decisions only for P12 amounts entered', async () => {
    const user = userEvent.setup()
    setDraft({
      p1_pesa: 'Otra',
      ing_total: 500000,
      fijo_total_directo: 100000,
      var_total_directo: 80000,
    })
    render(<OnboardingPage />)

    await user.type(await screen.findByLabelText(/salidas/i), '20000')
    await continueStep(user)
    expect(await screen.findByRole('heading', { name: /qué harías con cada gustito/i })).toBeDefined()
    expect(screen.getByRole('radio', { name: /llevo a cero/i })).toBeDefined()
    expect(screen.queryByRole('radio', { name: /ropa/i })).toBeNull()
  })

  it('shows P14 purchase rows only after selecting Sí', async () => {
    const user = userEvent.setup()
    setDraft({
      p1_pesa: 'Otra',
      ing_total: 500000,
      fijo_total_directo: 100000,
      var_total_directo: 80000,
    })
    render(<OnboardingPage />)

    await user.type(await screen.findByLabelText(/salidas/i), '20000')
    await continueStep(user)
    await continueStep(user)
    expect(await screen.findByRole('heading', { name: /compras necesarias/i })).toBeDefined()
    expect(screen.queryByLabelText(/^concepto$/i)).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    await user.click(screen.getByRole('radio', { name: /^sí$/i }))
    for (const label of [/^concepto 1$/i, /^concepto 2$/i, /^concepto 3$/i]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
    for (const label of [/monto aproximado 1/i, /monto aproximado 2/i, /monto aproximado 3/i]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('creates repeated P16-P20 steps for two selected cards', async () => {
    const user = userEvent.setup()
    setDraft({
      p1_pesa: 'Otra',
      ing_total: 500000,
      fijo_total_directo: 100000,
      var_total_directo: 80000,
      d_salidas: 20000,
    })
    render(<OnboardingPage />)

    await user.type(await screen.findByLabelText(/cuántas tarjetas/i), '2')
    await continueStep(user)
    expect(await screen.findByRole('heading', { name: /tarjeta 1 - el último resumen/i })).toBeDefined()

    await user.type(screen.getByLabelText(/en pesos/i), '10000')
    await continueStep(user)
    await user.click(screen.getByRole('radio', { name: /carga manual a ojo/i }))
    await user.type(await screen.findByLabelText(/monto mensual/i), '5000')
    await user.type(await screen.findByLabelText(/hasta \(mes\/año\)/i), '2026-12')
    await continueStep(user)
    for (const label of [/monto impago/i, /día de cierre/i, /a ojo/i]) {
      const input = screen.getByLabelText(label)
      if (label.source.includes('a ojo')) await user.type(input, '1000')
      await continueStep(user)
    }

    expect(await screen.findByRole('heading', { name: /tarjeta 2 - el último resumen/i })).toBeDefined()
  })

  it('supports manual P17 B and C paths while disabling A', async () => {
    const user = userEvent.setup()
    await advanceToCardP17(1)
    expect((screen.getByRole('radio', { name: /subir foto del resumen/i }) as HTMLInputElement).disabled).toBe(true)

    await user.click(screen.getByRole('radio', { name: /carga manual mes por mes/i }))
    expect(await screen.findByLabelText(/mes 1/i)).toBeDefined()
    await user.type(screen.getByLabelText(/mes 1/i), '3000')
    await continueStep(user)

    cleanup()
    await advanceToCardP17(1)
    await user.click(screen.getByRole('radio', { name: /carga manual a ojo/i }))
    await user.type(await screen.findByLabelText(/monto mensual/i), '3000')
    await user.type(await screen.findByLabelText(/hasta \(mes\/año\)/i), '2026-12')
    await continueStep(user)
    expect(await screen.findByRole('heading', { name: /tarjeta 1 - ¿quedó algo/i })).toBeDefined()
  })

  it('sends card-scoped values in the save payload', async () => {
    const user = userEvent.setup()
    await advanceToCardP17(1)
    await user.click(screen.getByRole('radio', { name: /carga manual a ojo/i }))
    await user.type(await screen.findByLabelText(/monto mensual/i), '4500')
    await user.type(await screen.findByLabelText(/hasta \(mes\/año\)/i), '2026-11')
    await continueStep(user)

    expect(saveOnboardingDraft).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        answers: expect.objectContaining({
          t1_cuotas_modo: 'Carga manual a ojo',
          t1_cuotas_mensual: 4500,
          t1_cuotas_hasta: '2026-11',
        }),
      }),
    }))
  })

  it('starts with the name and report delivery steps, without P21 or P22', () => {
    const [nameStep, contactStep] = getActiveSteps({})

    expect([nameStep?.id, contactStep?.id]).toEqual(['p0', 'p23'])
    expect(getActiveSteps({}).map((step) => step.id)).not.toContain('p21')
    expect(getActiveSteps({}).map((step) => step.id)).not.toContain('p22')
    expect(validateStep(nameStep, {})).toMatchObject({ nombre: 'Este campo es requerido.' })
    expect(validateStep(contactStep, {})).toMatchObject({ contacto_canal: 'Este campo es requerido.' })
    expect(validateStep(contactStep, { contacto_canal: 'WhatsApp' })).toMatchObject({
      whatsapp: 'Este campo es requerido.',
    })
    expect(validateStep(contactStep, { contacto_canal: 'Email' })).toMatchObject({
      email: 'Este campo es requerido.',
    })
  })

  it('collects the name before the report delivery channel', async () => {
    const user = userEvent.setup()
    vi.mocked(getOnboardingDraft).mockResolvedValue(undefined)
    render(<OnboardingPage />)

    expect(await screen.findByRole('heading', { name: '¿Cómo te llamás?' })).toBeDefined()
    await user.type(screen.getByLabelText(/^Nombre/), 'Ada')
    await continueStep(user)

    expect(await screen.findByRole('heading', { name: '¿A dónde te mandamos tu informe?' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: /cuánta plata tenés hoy/i })).toBeNull()
    expect(screen.queryByRole('heading', { name: /debés algo fuera de las tarjetas/i })).toBeNull()

    await user.click(screen.getByRole('radio', { name: 'WhatsApp' }))
    expect(screen.getByRole('textbox', { name: /^WhatsApp/ })).toBeDefined()
    expect(screen.queryByRole('textbox', { name: /^Email/ })).toBeNull()

    await user.click(screen.getByRole('radio', { name: 'Email' }))
    expect(screen.getByRole('textbox', { name: /^Email/ })).toBeDefined()
    expect(screen.queryByRole('textbox', { name: /^WhatsApp/ })).toBeNull()
  })

  it('renders the welcome screen when forced', async () => {
    localStorage.removeItem('onboarding-welcome-seen')
    localStorage.setItem('onboarding-welcome-force', 'true')
    const user = userEvent.setup()
    render(<OnboardingPage />)

    expect(await screen.findByRole('heading', { name: /te damos la bienvenida a norte/i })).toBeDefined()
    await user.click(screen.getByRole('button', { name: /continuar/i }))
    expect(await screen.findByRole('heading', { name: /que te esta pesando mas hoy/i })).toBeDefined()
  })

  it('personalizes the next step intro with the entered name', async () => {
    const user = userEvent.setup()
    vi.mocked(getOnboardingDraft).mockResolvedValue(undefined)
    render(<OnboardingPage />)

    await user.type(await screen.findByLabelText(/^Nombre/), 'Ana')
    await continueStep(user)
    await user.click(await screen.findByRole('radio', { name: 'Email' }))
    await user.type(screen.getByRole('textbox', { name: /^Email/ }), 'ana@example.com')
    await continueStep(user)
    await user.click(await screen.findByRole('radio', { name: /otra/i }))
    await continueStep(user)

    expect(await screen.findByText(/Ana, Selección múltiple/)).toBeDefined()
  })

  it('personalizes completion copy from the saved name', async () => {
    localStorage.setItem('onboarding-draft', JSON.stringify({
      deviceId,
      answers: { nombre: 'Ana' },
      stepIndex: 0,
      completed: true,
      updatedAt: new Date().toISOString(),
    }))

    render(<OnboardingPage />)

    expect(await screen.findByText(/Gracias, Ana/)).toBeDefined()
  })

  it('keeps the welcome and step title copy unchanged', async () => {
    localStorage.removeItem('onboarding-welcome-seen')
    localStorage.setItem('onboarding-welcome-force', 'true')
    const user = userEvent.setup()
    render(<OnboardingPage />)

    expect(await screen.findByRole('heading', { name: /te damos la bienvenida a norte/i })).toBeDefined()
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(await screen.findByRole('heading', { name: /que te esta pesando mas hoy/i })).toBeDefined()
  })
})
