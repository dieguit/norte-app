// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getActiveSteps,
  filterAnswersForActiveSteps,
  getFirstIncompleteStep,
  getVisibleFields,
  onboardingSteps,
  validateStep,
  type OnboardingAnswers,
} from './definition'
import { loadDraft, saveDraft } from './draft'

describe('onboarding draft', () => {
  beforeEach(() => localStorage.clear())

  it('adds third-party-income follow-up only when selected', () => {
    expect(getActiveSteps({ p5_fuentes: ['Sueldo fijo (relacion de dependencia)'] }).map((step) => step.id))
      .not.toContain('p6')
    expect(getActiveSteps({ p5_fuentes: ['Aportes de un tercero'] }).map((step) => step.id))
      .toContain('p6')
  })

  it('creates five card questions for every selected card', () => {
    const ids = getActiveSteps({ p15_tarjetas: 2 }).map((step) => step.id)
    expect(ids).toEqual(expect.arrayContaining(['t1_p16', 't1_p17', 't2_p16', 't2_p17']))
    expect(ids).not.toContain('t3_p16')
  })

  it('keeps fields grouped by step and validates requiredness independently from type', () => {
    const p4Step = onboardingSteps.find(s => s.id === 'p4')
    expect(p4Step?.fields).toHaveLength(1)
    expect(validateStep(p4Step, {})).toEqual({ ing_total: 'Este campo es requerido.' })
    expect(validateStep(p4Step, { ing_total: 1000000 })).toEqual({})
  })

  it('rejects whitespace-only required names', () => {
    const p0Step = onboardingSteps.find(s => s.id === 'p0')
    expect(validateStep(p0Step, { nombre: '   ' })).toEqual({
      nombre: 'Este campo es requerido.',
    })
  })

  it('rejects invalid report delivery channels', () => {
    const p23Step = onboardingSteps.find(s => s.id === 'p23')
    expect(validateStep(p23Step, { contacto_canal: 'SMS' })).toMatchObject({
      contacto_canal: 'Elegí una opción válida.',
    })
  })

  it('rejects array values for radio options', () => {
    const p23Step = onboardingSteps.find(s => s.id === 'p23')
    expect(validateStep(p23Step, { contacto_canal: ['Email'] })).toMatchObject({
      contacto_canal: 'Elegí una opción válida.',
    })
  })

  it('rejects scalar values for checkbox options', () => {
    const p2Step = onboardingSteps.find(s => s.id === 'p2')
    expect(validateStep(p2Step, { p2_ultimo: 'Comida' })).toMatchObject({
      p2_ultimo: 'Elegí una opción válida.',
    })
  })

  it('rejects non-finite income values', () => {
    const p4Step = onboardingSteps.find(s => s.id === 'p4')
    expect(validateStep(p4Step, { ing_total: Number.NaN })).toEqual({
      ing_total: 'Ingresá un número válido.',
    })
  })

  it('rejects wrong runtime types for number fields', () => {
    const p4Step = onboardingSteps.find(s => s.id === 'p4')
    expect(validateStep(p4Step, { ing_total: [] })).toEqual({
      ing_total: 'Ingresá un número válido.',
    })
  })

  it('treats whitespace-only P4 income as missing', () => {
    const p4Step = onboardingSteps.find(s => s.id === 'p4')
    expect(validateStep(p4Step, { ing_total: '   ' })).toEqual({
      ing_total: 'Este campo es requerido.',
    })
  })

  it('validates only the selected P23 delivery channel', () => {
    const p23Step = onboardingSteps.find(s => s.id === 'p23')
    expect(validateStep(p23Step, {
      contacto_canal: 'Email',
      email: 'ada@example.com',
      whatsapp: 'invalid',
    })).toEqual({})
    expect(validateStep(p23Step, {
      contacto_canal: 'WhatsApp',
      whatsapp: '+54 11 5555-5555',
      email: 'invalid',
    })).toEqual({})
  })

  it('rejects a WhatsApp value without digits', () => {
    const p23Step = onboardingSteps.find(s => s.id === 'p23')
    expect(validateStep(p23Step, {
      contacto_canal: 'WhatsApp',
      whatsapp: '------',
    })).toMatchObject({
      whatsapp: 'El formato del teléfono no es válido.',
    })
  })

  it('treats an empty required checkbox array as missing', () => {
    const step = {
      id: 'required-checkbox',
      title: 'Required checkbox',
      fields: [{
        id: 'choices',
        type: 'checkbox' as const,
        label: 'Choices',
        options: ['A'],
        required: true,
      }],
    }
    expect(validateStep(step, { choices: [] })).toEqual({
      choices: 'Este campo es requerido.',
    })
  })

  it('resumes at the first incomplete step', () => {
    // P1 is now the first required question.
    expect(getFirstIncompleteStep({})).toBe(0)
    // Optional P2/P3 remain skipped until P4 becomes incomplete.
    expect(getFirstIncompleteStep({
      nombre: 'Ada',
      contacto_canal: 'Email',
      email: 'ada@example.com',
      p1_pesa: 'Otra',
      ing_total: 500000,
    })).toBe(9)
  })

  it('rejects a third priority selection', () => {
    const step = getActiveSteps({}).find(({ id }) => id === 'p2')
    expect(validateStep(step, { p2_ultimo: ['Comida', 'Alquiler / vivienda', 'Prepaga / cobertura medica'] }))
      .toMatchObject({ p2_ultimo: expect.any(String) })
  })

  it('round-trips a local draft', () => {
    saveDraft({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers: { ing_total: 1000000 },
      stepIndex: 1,
      completed: false,
      updatedAt: '2026-07-14T00:00:00.000Z',
    })

    expect(loadDraft()).toMatchObject({ stepIndex: 1, completed: false })
  })

  it('round-trips multi-select and conditional values in a local draft', () => {
    saveDraft({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers: {
        p2_ultimo: ['Comida', 'Alquiler / vivienda'],
        p5_fuentes: ['Aportes de un tercero'],
        ing_tercero_falla: 'Sí, a veces falla o se atrasa',
        ing_tercero_monto: 50000,
      },
      stepIndex: 2,
      completed: false,
      updatedAt: '2026-07-15T00:00:00.000Z',
    })

    expect(loadDraft()?.answers).toEqual({
      p2_ultimo: ['Comida', 'Alquiler / vivienda'],
      p5_fuentes: ['Aportes de un tercero'],
      ing_tercero_falla: 'Sí, a veces falla o se atrasa',
      ing_tercero_monto: 50000,
    })
  })

  it('removes known inactive answers before local persistence but preserves unknown system-safe answers', () => {
    const answers = filterAnswersForActiveSteps({
      p15_tarjetas: 1,
      t1_resumen_ars: 100,
      t2_resumen_ars: 200,
      extra_tipo: 'No',
      extra_monto: 300,
      unknownSystemValue: 'keep me',
    })
    saveDraft({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers,
      stepIndex: 0,
      completed: false,
      updatedAt: '2026-07-15T00:00:00.000Z',
    })

    expect(loadDraft()?.answers).toEqual({
      p15_tarjetas: 1,
      t1_resumen_ars: 100,
      extra_tipo: 'No',
      unknownSystemValue: 'keep me',
    })
  })

  it('only exposes conditional follow-up fields when their answer applies', () => {
    const step = (id: string) => onboardingSteps.find(step => step.id === id)!

    expect(getVisibleFields(step('p7'), { extra_tipo: 'No' })
      .map(field => field.id)).toEqual(['extra_tipo'])
    expect(getVisibleFields(step('p10'), { p10_tiene_vencimiento: 'No' })
      .map(field => field.id)).toEqual(['p10_tiene_vencimiento'])
    expect(getVisibleFields(step('p14'), { p14_tiene_compras: 'No' })
      .map(field => field.id)).toEqual(['p14_tiene_compras'])
    expect(getVisibleFields(step('p14'), { p14_tiene_compras: 'Sí' })
      .map(field => field.id)).toEqual([
        'p14_tiene_compras',
        'n1_concepto',
        'n1_monto',
        'n2_concepto',
        'n2_monto',
        'n3_concepto',
        'n3_monto',
      ])
  })

  it('filters hidden P14 purchase pairs and validates each visible amount concept', () => {
    expect(filterAnswersForActiveSteps({
      p14_tiene_compras: 'No',
      n1_concepto: 'Auto',
      n1_monto: 1000,
      n2_concepto: 'Anteojos',
      n2_monto: 2000,
      n3_concepto: 'Lavarropas',
      n3_monto: 3000,
    })).toEqual({ p14_tiene_compras: 'No' })

    const step = onboardingSteps.find(({ id }) => id === 'p14')
    expect(validateStep(step, {
      p14_tiene_compras: 'Sí',
      n1_monto: 1000,
      n2_monto: 2000,
      n3_monto: 3000,
    })).toEqual({
      n1_concepto: 'Debe ingresar el concepto.',
      n2_concepto: 'Debe ingresar el concepto.',
      n3_concepto: 'Debe ingresar el concepto.',
    })
  })

  it('shows P13 decisions only for completed P12 items', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p13')
    expect(getVisibleFields(step, { d_salidas: 100, d_ropa: 0 }).map(field => field.id))
      .toEqual(['e13_salidas', 'e13_ropa'])
  })

  it('skips required validation for hidden fields', () => {
    const step = {
      id: 'conditional-test',
      title: 'Conditional test',
      fields: [{
        id: 'follow_up',
        type: 'text' as const,
        label: 'Follow-up',
        required: true,
        visibleWhen: (answers: OnboardingAnswers) => answers.trigger === 'yes',
      }],
    }

    expect(validateStep(step, { trigger: 'no' })).toEqual({})
    expect(validateStep(step, { trigger: 'yes' })).toEqual({ follow_up: 'Este campo es requerido.' })
  })

  it('rejects invalid card counts with a Spanish range error', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p15')
    expect(validateStep(step, { p15_tarjetas: -1 })).toEqual({
      p15_tarjetas: 'Ingresá un número entero entre 0 y 5.',
    })
    expect(validateStep(step, { p15_tarjetas: 1.5 })).toEqual({
      p15_tarjetas: 'Ingresá un número entero entre 0 y 5.',
    })
    expect(validateStep(step, { p15_tarjetas: 5 })).toEqual({})
  })

  it('requires the uploaded statement key when Option A is selected', () => {
    const step = onboardingSteps.find(({ id }) => id === 't1_p17')
    expect(validateStep(step, { t1_cuotas_modo: 'Subir foto del resumen' })).toEqual({
      t1_upload_url: 'Subí el resumen para continuar.',
    })
  })
})
