// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getActiveSteps,
  filterAnswersForActiveSteps,
  getFirstIncompleteStep,
  getVisibleFields,
  onboardingSteps,
  validateStep,
  getMonthlyDateOptions,
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

  it('creates one consolidated card step for every selected card', () => {
    const ids = getActiveSteps({ p15_tarjetas: 2 }).map((step) => step.id)

    expect(ids).toEqual(expect.arrayContaining(['t1_p16', 't2_p16']))
    expect(ids).not.toEqual(expect.arrayContaining(['t1_p17', 't1_p18', 't1_p19', 't1_p20']))
  })

  it('shows only the statement upload field in upload mode', () => {
    const step = onboardingSteps.find(({ id }) => id === 't1_p16')!

    expect(getVisibleFields(step, { t1_cuotas_modo: 'Subir foto o archivo' })
      .map(({ id }) => id)).toEqual([
        't1_cuotas_modo', 't1_upload_url',
      ])
  })

  it('shows every manual card field in month-by-month mode', () => {
    const step = onboardingSteps.find(({ id }) => id === 't1_p16')!

    expect(getVisibleFields(step, { t1_cuotas_modo: 'Copiar el renglón mes a mes' })
      .map(({ id }) => id)).toEqual([
        't1_cuotas_modo', 't1_resumen_ars', 't1_resumen_usd',
        't1_cierre_dia', 't1_vto_dia',
        't1_cuotas_m1', 't1_cuotas_m2', 't1_cuotas_m3', 't1_cuotas_m4', 't1_cuotas_m5', 't1_cuotas_m6',
        't1_cuotas_resto', 't1_cuotas_resto_hasta', 't1_arrastre',
        't1_postcierre', 't1_postcierre_upload',
      ])
  })

  it('shows only mode selection in WhatsApp mode', () => {
    const step = onboardingSteps.find(({ id }) => id === 't1_p16')!

    expect(getVisibleFields(step, { t1_cuotas_modo: 'No lo tengo a mano, que Norte me lo pida después por WhatsApp' })
      .map(({ id }) => id)).toEqual(['t1_cuotas_modo'])
  })

  it('clears inactive card answers when changing card mode', () => {
    expect(filterAnswersForActiveSteps({
      p15_tarjetas: 1,
      t1_cuotas_modo: 'No lo tengo a mano, que Norte me lo pida después por WhatsApp',
      t1_resumen_ars: 100,
      t1_upload_url: 'file-key',
    })).toEqual({
      p15_tarjetas: 1,
      t1_cuotas_modo: 'No lo tengo a mano, que Norte me lo pida después por WhatsApp',
    })
  })

  it('keeps fields grouped by step and validates requiredness independently from type', () => {
    const p4Step = onboardingSteps.find(s => s.id === 'p4')
    expect(p4Step?.fields).toHaveLength(1)
    expect(validateStep(p4Step, {})).toEqual({ ing_total: 'Este campo es requerido.' })
    expect(validateStep(p4Step, { ing_total: 1000000 })).toEqual({})
  })

  it('requires at least one income source in P5', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p5')!

    expect(validateStep(step, {})).toEqual({
      p5_fuentes: 'Este campo es requerido.',
    })
    expect(validateStep(step, {
      p5_fuentes: ['Sueldo fijo (relación de dependencia)'],
    })).toEqual({})
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
      p5_fuentes: ['Sueldo fijo (relación de dependencia)'],
    })).toBe(7)
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
      t1_cuotas_modo: 'Copiar el renglón mes a mes',
      t1_resumen_ars: 100,
      t2_resumen_ars: 200,
      extra_tiene: 'No',
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
      t1_cuotas_modo: 'Copiar el renglón mes a mes',
      t1_resumen_ars: 100,
      extra_tiene: 'No',
      unknownSystemValue: 'keep me',
    })
  })

  it('only exposes conditional follow-up fields when their answer applies', () => {
    const step = (id: string) => onboardingSteps.find(step => step.id === id)!

    expect(getVisibleFields(step('p7'), { extra_tiene: 'No' })
      .map(field => field.id)).toEqual(['extra_tiene'])
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

  it('shows expiring-payment dates only for positive detailed P9 amounts', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p10')!

    expect(getVisibleFields(step, {
      p10_tiene_vencimiento: 'Sí',
      fijo_alquiler: 100000,
      fijo_prestamos: 0,
      fijo_otro1_concepto: 'Expensas',
      fijo_otro1_monto: 25000,
    }).map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'p10_tiene_vencimiento', label: '¿Tiene vencimiento final?' },
      { id: 'fijo_alquiler_hasta', label: '¿Cuándo termina Alquiler / vivienda?' },
      { id: 'fijo_otro1_hasta', label: '¿Cuándo termina Expensas?' },
    ])
  })

  it('keeps generic expiring-payment fields when P9 has only a direct total', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p10')!

    expect(getVisibleFields(step, {
      p10_tiene_vencimiento: 'Sí',
      fijo_total_directo: 100000,
    }).map(({ id }) => id)).toEqual([
      'p10_tiene_vencimiento',
      'fin1_concepto', 'fin1_cuota', 'fin1_hasta',
      'fin2_concepto', 'fin2_cuota', 'fin2_hasta',
      'fin3_concepto', 'fin3_cuota', 'fin3_hasta',
      'fin4_concepto', 'fin4_cuota', 'fin4_hasta',
    ])
  })

  it('filters fixed-expense expiry answers when the P9 amount is no longer positive', () => {
    expect(filterAnswersForActiveSteps({
      p10_tiene_vencimiento: 'Sí',
      fijo_alquiler: 0,
      fijo_alquiler_hasta: 'sep-27',
    })).toEqual({ p10_tiene_vencimiento: 'Sí', fijo_alquiler: 0 })
  })

  it('shows P13 decisions only for positive P12 amounts', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p13')!
    expect(getVisibleFields(step, { d_salidas: 100, d_ropa: 0 }).map(field => field.id))
      .toEqual(['e13_salidas'])
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

  it('requires card mode or specific fields based on mode for consolidated p16 step', () => {
    const step = onboardingSteps.find(({ id }) => id === 't1_p16')!

    expect(validateStep(step, {})).toEqual({
      t1_cuotas_modo: 'Elegí una opción para continuar.',
    })
    expect(validateStep(step, { t1_cuotas_modo: 'Subir foto o archivo' })).toEqual({
      t1_upload_url: 'Subí el resumen para continuar.',
    })
    expect(validateStep(step, { t1_cuotas_modo: 'Copiar el renglón mes a mes' })).toEqual({
      t1_resumen_ars: 'Debe ingresar el monto de la tarjeta.',
      t1_cuotas_m1: 'Completá al menos una cuota mensual.',
    })
    expect(validateStep(step, {
      t1_cuotas_modo: 'No lo tengo a mano, que Norte me lo pida después por WhatsApp',
    })).toEqual({})
  })

  it('scopes draft loading to the device ID', () => {
    saveDraft({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers: { ing_total: 1000000 },
      stepIndex: 1,
      completed: false,
      updatedAt: '2026-07-14T00:00:00.000Z',
    })

    expect(loadDraft('c2446e70-8555-44dc-a428-cb1185c8d4b3')).toBeNull()
  })

  it('shows expiry dates only for selected income sources', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p8a')!

    expect(getVisibleFields(step, {
      p8a_tiene_vencimiento: 'Sí',
      p5_fuentes: [
        'Sueldo fijo (relación de dependencia)',
        'Jubilación / pensión',
      ],
    }).map(({ id }) => id)).toEqual([
      'p8a_tiene_vencimiento',
      'ing_sueldo_fijo_hasta',
      'ing_jubilacion_pension_hasta',
    ])
  })

  it('hides P8a source expiry dates when its gate is No', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p8a')!

    expect(getVisibleFields(step, {
      p8a_tiene_vencimiento: 'No',
      p5_fuentes: ['Sueldo fijo (relación de dependencia)'],
      extra_tipo: 'Aguinaldo',
    }).map(({ id }) => id)).toEqual(['p8a_tiene_vencimiento'])
  })

  it('does not require any source expiry date after P8a is Sí', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p8a')!

    expect(validateStep(step, {
      p8a_tiene_vencimiento: 'Sí',
      p5_fuentes: ['Trabajos propios (freelance, clases, negocio, honorarios)'],
    })).toEqual({})
  })

  it('filters a source expiry when P8a switches to No', () => {
    expect(filterAnswersForActiveSteps({
      p8a_tiene_vencimiento: 'No',
      p5_fuentes: ['Sueldo fijo (relación de dependencia)'],
      ing_sueldo_fijo_hasta: 'sep-27',
    })).toEqual({
      p8a_tiene_vencimiento: 'No',
      p5_fuentes: ['Sueldo fijo (relación de dependencia)'],
    })
  })

  it('offers exactly 18 sequential monthly dates', () => {
    expect(getMonthlyDateOptions(new Date(2026, 6, 1))).toEqual([
      'jul-26', 'ago-26', 'sep-26', 'oct-26', 'nov-26', 'dic-26',
      'ene-27', 'feb-27', 'mar-27', 'abr-27', 'may-27', 'jun-27',
      'jul-27', 'ago-27', 'sep-27', 'oct-27', 'nov-27', 'dic-27',
    ])
  })
})
