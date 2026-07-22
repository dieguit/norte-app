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
        't1_postcierre', 't1_postcierre_cuotas', 't1_postcierre_upload',
      ])
  })

  it('shows post-close installment quantity only after selecting Sí', () => {
    const step = onboardingSteps.find(({ id }) => id === 't1_p16')!

    expect(getVisibleFields(step, {
      t1_cuotas_modo: 'Copiar el renglón mes a mes',
    }).map(({ id }) => id)).not.toContain('t1_postcierre_cuotas_cantidad')
    expect(getVisibleFields(step, {
      t1_cuotas_modo: 'Copiar el renglón mes a mes',
      t1_postcierre_cuotas: 'Sí',
    }).map(({ id }) => id)).toContain('t1_postcierre_cuotas_cantidad')

    const fields = getVisibleFields(step, {
      t1_cuotas_modo: 'Copiar el renglón mes a mes',
      t1_postcierre_cuotas: 'Sí',
    })
    expect(fields.find(({ id }) => id === 't1_postcierre_cuotas')?.options).toEqual(['Sí', 'No'])
    expect(fields.find(({ id }) => id === 't1_postcierre_cuotas_cantidad')?.options)
      .toEqual(Array.from({ length: 18 }, (_, index) => String(index + 1)))
  })

  it('provides help text for every manual card field', () => {
    const step = onboardingSteps.find(({ id }) => id === 't1_p16')!
    const fields = getVisibleFields(step, {
      t1_cuotas_modo: 'Copiar el renglón mes a mes',
      t1_postcierre_cuotas: 'Sí',
    })

    expect(Object.fromEntries(fields.map(({ id, helpText }) => [id, helpText]))).toMatchObject({
      t1_resumen_ars: 'Cargá el total que figura en tu último resumen, en pesos.',
      t1_resumen_usd: 'Cargá el total en dólares si aparece en tu resumen.',
      t1_cierre_dia: 'Elegí el día del mes en que cierra esta tarjeta.',
      t1_vto_dia: 'Elegí el día límite para pagar el resumen.',
      ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => [
        `t1_cuotas_m${index + 1}`,
        `Cargá cuánto te queda pagar en ${index + 1} cuotas.`,
      ])),
      t1_cuotas_resto: 'Cargá el total mensual de cuotas que queda después de estos seis meses.',
      t1_cuotas_resto_hasta: 'Elegí el último mes en que vas a pagar esas cuotas.',
      t1_arrastre: '¿Quedó saldo del resumen pasado que no pagaste completo (y la tarjeta te lo está financiando)?',
      t1_postcierre: 'Cargá lo que gastaste desde el cierre del último resumen hasta hoy.',
      t1_postcierre_cuotas: 'Indicá si dentro de esos gastos hay compras que vas a pagar en cuotas.',
      t1_postcierre_cuotas_cantidad: 'Elegí en cuántas cuotas se hizo esa compra.',
      t1_postcierre_upload: 'Subí una captura de los movimientos desde el cierre, si te resulta más fácil.',
    })
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
      t1_postcierre_cuotas: 'Sí',
      t1_postcierre_cuotas_cantidad: '6',
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

  it.each([
    ['p2', 'p2_ultimo'],
    ['p3', 'p3_primero'],
  ] as const)('requires one priority choice in %s', (stepId, answerId) => {
    const step = onboardingSteps.find(({ id }) => id === stepId)!
    expect(validateStep(step, {})).toEqual({
      [answerId]: 'Elegí una opción para continuar.',
    })
  })

  it.each([
    ['p2', 'p2_ultimo'],
    ['p3', 'p3_primero'],
  ] as const)('rejects array priority answers in %s', (stepId, answerId) => {
    const step = onboardingSteps.find(({ id }) => id === stepId)!
    expect(validateStep(step, { [answerId]: ['Comida (comprar más barato)'] }))
      .toEqual({ [answerId]: 'Elegí una opción válida.' })
  })

  it.each([
    ['p2', 'p2_ultimo'],
    ['p3', 'p3_primero'],
  ] as const)('accepts one valid priority answer in %s', (stepId, answerId) => {
    const step = onboardingSteps.find(({ id }) => id === stepId)!
    expect(validateStep(step, { [answerId]: 'Comida (comprar más barato)' })).toEqual({})
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
    // Priority step P2 is now required when P1 answer exists but priority answers do not.
    expect(getFirstIncompleteStep({
      nombre: 'Ada',
      contacto_canal: 'Email',
      email: 'ada@example.com',
      p1_pesa: 'Otra',
      ing_total: 500000,
      p5_fuentes: ['Sueldo fijo (relación de dependencia)'],
    })).toBe(3)
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

  it('round-trips single-choice and conditional values in a local draft', () => {
    saveDraft({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      answers: {
        p2_ultimo: 'Comida (comprar más barato)',
        p5_fuentes: ['Aportes de un tercero'],
        ing_tercero_falla: 'Sí, a veces falla o se atrasa',
        ing_tercero_monto: 50000,
      },
      stepIndex: 2,
      completed: false,
      updatedAt: '2026-07-15T00:00:00.000Z',
    })

    expect(loadDraft()?.answers).toEqual({
      p2_ultimo: 'Comida (comprar más barato)',
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

  it('describes extra incomes and one-month periods', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p7')!
    const extraIncome = getVisibleFields(step, { extra_tiene: 'Sí' })
      .find(({ id }) => id === 'ingresos_extra')!

    expect(step.intro).toBe(
      'Por ejemplo: aguinaldo, bono por resultados, una clase extra, una venta.',
    )
    expect(extraIncome.itemFields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'desde',
        helpText: 'Elegí el primer mes en que lo vas a recibir.',
      }),
      expect.objectContaining({
        key: 'hasta',
        helpText: 'Elegí el último mes. Si elegís el mismo que en Desde cuándo, cuenta solo para ese mes.',
      }),
    ]))
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

  it('shows only the direct total in P9 total mode and removes detail answers', () => {
    const p9 = onboardingSteps.find(({ id }) => id === 'p9')!
    expect(getVisibleFields(p9, { p9_modo: 'Tengo el total en la cabeza' })
      .map(({ id }) => id)).toEqual(['p9_modo', 'fijo_total_directo'])
    expect(filterAnswersForActiveSteps({
      p9_modo: 'Tengo el total en la cabeza', fijo_alquiler: 1000,
      fijo_otros: [{ concepto: 'Niñera', monto: 2000, desde: '', hasta: '' }],
      fijo_total_directo: 3000,
    })).toEqual({ p9_modo: 'Tengo el total en la cabeza', fijo_total_directo: 3000 })
  })

  it('infers direct-total mode for legacy fixed-payment drafts', () => {
    const p9 = onboardingSteps.find(({ id }) => id === 'p9')!
    const answers = {
      fijo_total_directo: 3000,
      fijo_alquiler: 1000,
    }

    expect(getVisibleFields(p9, answers).map(({ id }) => id)).toEqual([
      'p9_modo', 'fijo_total_directo',
    ])
    expect(filterAnswersForActiveSteps(answers)).toEqual({
      p9_modo: 'Tengo el total en la cabeza',
      fijo_total_directo: 3000,
    })
  })

  it('infers detailed mode for legacy fixed-payment drafts', () => {
    const p9 = onboardingSteps.find(({ id }) => id === 'p9')!
    const answers = {
      fijo_otro1_concepto: 'Expensas',
      fijo_otro1_monto: 2000,
      fijo_total_directo: 0,
    }

    expect(getVisibleFields(p9, answers).map(({ id }) => id)).toContain('fijo_otros')
    expect(getVisibleFields(p9, answers).map(({ id }) => id)).not.toContain('fijo_total_directo')
    expect(filterAnswersForActiveSteps(answers)).toEqual({
      p9_modo: 'Quiero desglosar',
      fijo_otros: [{ concepto: 'Expensas', monto: 2000, desde: '', hasta: '' }],
    })
    expect(validateStep(p9, answers)).toEqual({})
  })

  it('migrates legacy fixed other rows into the editable collection', () => {
    const legacyAnswers = {
      fijo_otro1_concepto: 'Expensas',
      fijo_otro1_monto: '25000',
      fijo_otro1_hasta: 'dic-26',
      fijo_otro2_concepto: 'Niñera',
      fijo_otro2_monto: '200000',
      fijo_otro2_hasta: '',
    }

    expect(filterAnswersForActiveSteps(legacyAnswers)).toEqual({
      p9_modo: 'Quiero desglosar',
      fijo_otros: [
        { concepto: 'Expensas', monto: 25000, desde: '', hasta: 'dic-26' },
        { concepto: 'Niñera', monto: 200000, desde: '', hasta: '' },
      ],
    })
  })

  it('infers detailed mode from a positive saved fixed-other string amount', () => {
    const answers = {
      fijo_otros: [{ concepto: 'Expensas', monto: '25000', desde: '', hasta: '' }],
    }

    expect(filterAnswersForActiveSteps(answers)).toEqual({
      p9_modo: 'Quiero desglosar',
      fijo_otros: answers.fijo_otros,
    })
  })

  it('validates the concept of a migrated legacy fixed-other amount', () => {
    const p9 = onboardingSteps.find(({ id }) => id === 'p9')!

    expect(validateStep(p9, {
      fijo_otro1_concepto: '',
      fijo_otro1_monto: 2000,
    })).toEqual({ 'fijo_otros.0.concepto': 'Debe ingresar el concepto.' })
  })

  it('rejects an invalid fixed-other amount even when another category is positive', () => {
    const p9 = onboardingSteps.find(({ id }) => id === 'p9')!

    expect(validateStep(p9, {
      p9_modo: 'Quiero desglosar',
      fijo_alquiler: 1000,
      fijo_otros: [{ concepto: 'Expensas', monto: 'no es un número', desde: '', hasta: '' }],
    })).toEqual({ 'fijo_otros.0.monto': 'Ingresá un número válido.' })
  })

  it('rejects a negative fixed-other amount independently of category totals', () => {
    const p9 = onboardingSteps.find(({ id }) => id === 'p9')!

    expect(validateStep(p9, {
      p9_modo: 'Quiero desglosar',
      fijo_alquiler: 1000,
      fijo_otros: [{ concepto: 'Expensas', monto: -1, desde: '', hasta: '' }],
    })).toEqual({ 'fijo_otros.0.monto': 'El monto no puede ser negativo.' })
  })

  it('allows a blank fixed-other row alongside a positive category', () => {
    const p9 = onboardingSteps.find(({ id }) => id === 'p9')!

    expect(validateStep(p9, {
      p9_modo: 'Quiero desglosar',
      fijo_alquiler: 1000,
      fijo_otros: [{ concepto: '', monto: '', desde: '', hasta: '' }],
    })).toEqual({})
  })

  it('requires a positive amount in the selected P9 mode and a concept for each other', () => {
    const p9 = onboardingSteps.find(({ id }) => id === 'p9')!
    expect(validateStep(p9, {})).toEqual({
      p9_modo: 'Este campo es requerido.',
    })
    expect(validateStep(p9, { p9_modo: 'Otro modo' })).toEqual({
      p9_modo: 'Elegí una opción válida.',
    })
    expect(validateStep(p9, { p9_modo: 'Tengo el total en la cabeza' }))
      .toEqual({ fijo_total_directo: 'Ingresá un total aproximado mayor a cero.' })
    expect(validateStep(p9, {
      p9_modo: 'Quiero desglosar',
      fijo_otros: [{ concepto: '', monto: 2000, desde: '', hasta: '' }],
    })).toEqual({ 'fijo_otros.0.concepto': 'Debe ingresar el concepto.' })
  })


  it('shows expiring-payment dates only for positive detailed P9 amounts', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p10')!

    expect(getVisibleFields(step, {
      p9_modo: 'Quiero desglosar',
      p10_tiene_vencimiento: 'Sí',
      fijo_alquiler: 100000,
      fijo_prestamos: 0,
    }).map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'p10_tiene_vencimiento', label: '¿Tiene vencimiento final?' },
      { id: 'fijo_alquiler_hasta', label: '¿Cuándo termina Alquiler / vivienda?' },
    ])
  })

  it('keeps generic expiring-payment fields when P9 has only a direct total', () => {
    const step = onboardingSteps.find(({ id }) => id === 'p10')!

    expect(getVisibleFields(step, {
      p9_modo: 'Tengo el total en la cabeza',
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

  it('exposes the fixed-other expiry collection only in detailed mode', () => {
    const p10 = onboardingSteps.find(({ id }) => id === 'p10')!

    expect(getVisibleFields(p10, {
      p9_modo: 'Quiero desglosar',
      p10_tiene_vencimiento: 'Sí',
      fijo_otros: [
        { concepto: 'Expensas', monto: 25000, desde: '', hasta: '' },
        { concepto: 'Niñera', monto: 0, desde: '', hasta: '' },
      ],
    }).map(({ id }) => id)).toContain('fijo_otros')
  })

  it('filters fixed-other expiry dates when the amount is no longer positive', () => {
    expect(filterAnswersForActiveSteps({
      p9_modo: 'Quiero desglosar',
      p10_tiene_vencimiento: 'Sí',
      fijo_otros: [
        { concepto: 'Expensas', monto: 0, desde: '', hasta: 'sep-27' },
        { concepto: 'Niñera', monto: 200000, desde: '', hasta: 'dic-26' },
      ],
    })).toEqual({
      p9_modo: 'Quiero desglosar',
      p10_tiene_vencimiento: 'Sí',
      fijo_otros: [
        { concepto: 'Expensas', monto: 0, desde: '', hasta: '' },
        { concepto: 'Niñera', monto: 200000, desde: '', hasta: 'dic-26' },
      ],
    })
  })

  it('filters fixed-expense expiry answers when the P9 amount is no longer positive', () => {
    expect(filterAnswersForActiveSteps({
      p9_modo: 'Quiero desglosar',
      p10_tiene_vencimiento: 'Sí',
      fijo_alquiler: 0,
      fijo_alquiler_hasta: 'sep-27',
    })).toEqual({ p9_modo: 'Quiero desglosar', p10_tiene_vencimiento: 'Sí', fijo_alquiler: 0 })
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
    expect(validateStep(step, {
      t1_cuotas_modo: 'Copiar el renglón mes a mes',
      t1_postcierre_cuotas: 'Sí',
    })).toMatchObject({
      t1_postcierre_cuotas_cantidad: 'Elegí una opción para continuar.',
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
