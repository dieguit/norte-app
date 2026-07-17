import { z } from 'zod'

export type OnboardingAnswer = string | number | boolean | string[]
export type OnboardingAnswers = Record<string, OnboardingAnswer>

export const onboardingAnswerSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
])

export type VisibleWhen = (answers: OnboardingAnswers) => boolean

export type OnboardingField = {
  id: string
  type: 'radio' | 'checkbox' | 'text' | 'number' | 'month' | 'email' | 'tel' | 'upload' | 'select' | 'currency'
  label: string
  maxSelections?: number
  options?: readonly string[]
  helpText?: string
  required?: boolean
  requiredMessage?: string
  visibleWhen?: VisibleWhen
  disabledOptions?: readonly string[]
}

const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function getMonthlyDateOptions(now = new Date()): string[] {
  return Array.from({ length: 18 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return `${monthNames[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`
  })
}

export function splitMonthlyDate(value: unknown): [string, string] {
  if (typeof value !== 'string') {
    return ['', '']
  }
  const legacyMatch = value.match(/^(\d{4})-(\d{2})$/)
  if (legacyMatch) {
    const yearAbbrev = legacyMatch[1].slice(-2)
    const monthNum = parseInt(legacyMatch[2], 10)
    const monthAbbrev = monthNames[monthNum - 1] || ''
    if (monthNames.includes(monthAbbrev)) {
      return [monthAbbrev, yearAbbrev]
    }
  }
  const standardMatch = value.match(/^([a-z]{3})-(\d{2})$/i)
  if (standardMatch) {
    const monthAbbrev = standardMatch[1].toLowerCase()
    if (monthNames.includes(monthAbbrev)) {
      return [monthAbbrev, standardMatch[2]]
    }
  }
  return ['', '']
}

export type OnboardingStep = {
  id: string
  title: string
  titleWithName?: string
  intro?: string
  introWithName?: string
  fields: readonly OnboardingField[]
  visibleWhen?: VisibleWhen
}

export const onboardingSteps: readonly OnboardingStep[] = [
  {
    id: 'p0',
    title: '¿Cómo te llamás?',
    fields: [
      { id: 'nombre', type: 'text', label: 'Nombre', required: true },
    ],
  },
  {
    id: 'p23',
    title: '¿A dónde te mandamos tu informe?',
    titleWithName: '¡Un gusto, {name}! ¿A dónde te mandamos tu informe?',
    fields: [
      {
        id: 'contacto_canal',
        type: 'radio',
        label: 'Elegí cómo querés recibirlo',
        options: ['WhatsApp', 'Email'],
        required: true,
      },
      {
        id: 'whatsapp',
        type: 'tel',
        label: 'WhatsApp (número)',
        required: true,
        visibleWhen: (answers) => answers.contacto_canal === 'WhatsApp',
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        required: true,
        visibleWhen: (answers) => answers.contacto_canal === 'Email',
      },
    ],
  },
  {
    id: 'p1',
    title: '¿Qué te está pesando más hoy con la plata?',
    fields: [
      {
        id: 'p1_pesa',
        type: 'radio',
        label: 'Selecciona una opción',
        options: [
          'Arrastro deudas de tarjeta que no logro cortar',
          'Las cuotas se me acumularon y me comen el sueldo',
          'Llego justo a fin de mes, sin margen para nada',
          'Gano bien pero no sé a dónde se va la plata',
          'Quiero ahorrar para algo concreto (viaje, casa, auto) y no arranco',
          'Me siento al día, pero sin colchón si pasa algo',
          'Estoy bien, quiero ver mi situación con otros ojos',
          'Otra',
        ],
      },
      {
        id: 'p1_otra',
        type: 'text',
        label: 'Otra (texto corto, opcional)',
      },
    ],
  },
  {
    id: 'p2',
    title: 'Si tu ingreso cayera a la mitad por unos meses, ¿qué sería LO ÚLTIMO que cortarías?',
    intro: 'Selección múltiple, máximo 2.',
    fields: [
      {
        id: 'p2_ultimo',
        type: 'checkbox',
        label: 'Selecciona hasta 2 opciones',
        maxSelections: 2,
        options: [
          'Colegio de mis hijos',
          'Actividades extraescolares de mis hijos',
          'Alquiler / vivienda',
          'Comida',
          'Prepaga / cobertura médica',
          'Terapias (psicólogo, tratamientos)',
          'Mis actividades (gym, deporte, hobbies)',
          'Salidas y gustos',
          'Ayuda a familiares',
          'Suscripciones y servicios digitales',
          'Ropa',
          'Cuidado personal',
        ],
      },
    ],
  },
  {
    id: 'p3',
    title: '¿Y LO PRIMERO que cortarías?',
    intro: 'Selección múltiple, máximo 2.',
    fields: [
      {
        id: 'p3_primero',
        type: 'checkbox',
        label: 'Selecciona hasta 2 opciones',
        maxSelections: 2,
        options: [
          'Colegio de mis hijos',
          'Actividades extraescolares de mis hijos',
          'Alquiler / vivienda',
          'Comida',
          'Prepaga / cobertura médica',
          'Terapias (psicólogo, tratamientos)',
          'Mis actividades (gym, deporte, hobbies)',
          'Salidas y gustos',
          'Ayuda a familiares',
          'Suscripciones y servicios digitales',
          'Ropa',
          'Cuidado personal',
        ],
      },
    ],
  },
  {
    id: 'p4',
    title: '¿Cuánta plata entra en tu casa en un mes normal, sumando todo?',
    intro: 'Un número redondo está perfecto, no hace falta precisión.',
    introWithName: '{name}, un número redondo está perfecto, no hace falta precisión.',
    fields: [
      {
        id: 'ing_total',
        type: 'number',
        label: 'Monto mensual ($)',
      },
    ],
  },
  {
    id: 'p5',
    title: '¿De dónde viene ese ingreso?',
    fields: [
      {
        id: 'p5_fuentes',
        type: 'checkbox',
        label: 'Selecciona los orígenes de tus ingresos',
        options: [
          'Sueldo fijo (relación de dependencia)',
          'Trabajos propios (freelance, clases, negocio, honorarios)',
          'Aportes de un tercero (cuota alimentaria, alquiler que cobrás, ayuda familiar)',
          'Jubilación / pensión',
          'Otro',
        ],
      },
    ],
  },
  {
    id: 'p6',
    title: '¿Ese ingreso de un tercero puede fallar o atrasarse?',
    visibleWhen: (answers) => {
      const fuentes = answers.p5_fuentes
      if (Array.isArray(fuentes)) {
        return fuentes.some(f => typeof f === 'string' && f.includes('Aportes de un tercero'))
      }
      return false
    },
    fields: [
      {
        id: 'ing_tercero_falla',
        type: 'radio',
        label: '¿Puede fallar o atrasarse?',
        options: [
          'Sí, a veces falla o se atrasa',
          'No, es confiable',
        ],
      },
      {
        id: 'ing_tercero_monto',
        type: 'number',
        label: '¿De cuánto es, aproximado? ($)',
        visibleWhen: (answers) => answers.ing_tercero_falla === 'Sí, a veces falla o se atrasa',
      },
    ],
  },
  {
    id: 'p7',
    title: '¿Tenés algún ingreso extra YA definido para los próximos 12 meses?',
    fields: [
      {
        id: 'extra_tipo',
        type: 'radio',
        label: 'Selecciona una opción',
        options: [
          'Aguinaldo',
          'Otro ya confirmado (bono, venta, devolución)',
          'No',
        ],
      },
      {
        id: 'extra_monto',
        type: 'number',
        label: 'Monto aproximado ($)',
        visibleWhen: (answers) => answers.extra_tipo === 'Aguinaldo' || answers.extra_tipo === 'Otro ya confirmado (bono, venta, devolución)',
      },
      {
        id: 'extra_cuando',
        type: 'month',
        label: '¿Cuándo?',
        visibleWhen: (answers) => answers.extra_tipo === 'Aguinaldo' || answers.extra_tipo === 'Otro ya confirmado (bono, venta, devolución)',
      },
    ],
  },
  {
    id: 'p8',
    title: '¿Cada cuánto suele aumentar tu ingreso principal? (opcional)',
    fields: [
      {
        id: 'aumento_tipo',
        type: 'radio',
        label: '¿Tiene aumentos periódicos?',
        options: [
          'Tiene aumentos periódicos',
          'No aumenta / no sé',
        ],
      },
      {
        id: 'aumento_meses',
        type: 'number',
        label: 'Cada cuántos meses',
        visibleWhen: (answers) => answers.aumento_tipo === 'Tiene aumentos periódicos',
      },
      {
        id: 'aumento_pct',
        type: 'number',
        label: 'Porcentaje aproximado (%)',
        visibleWhen: (answers) => answers.aumento_tipo === 'Tiene aumentos periódicos',
      },
      {
        id: 'aumento_proximo',
        type: 'month',
        label: 'Próximo aumento esperado en',
        visibleWhen: (answers) => answers.aumento_tipo === 'Tiene aumentos periódicos',
      },
    ],
  },
  {
    id: 'p8a',
    title: '¿Alguno de tus ingresos tiene fecha de vencimiento?',
    intro: '¿Cuánto es por mes y hasta cuándo entra?',
    fields: [
      { id: 'p8a_tiene_vencimiento', type: 'radio', label: '¿Tiene vencimiento?', options: ['Sí', 'No'], required: true },
      ...(['ing_fin1', 'ing_fin2', 'ing_fin3', 'ing_fin4'] as const).flatMap((prefix, index) => [
        { id: `${prefix}_monto`, type: 'number' as const, label: `Monto mensual ${index + 1} ($)`, visibleWhen: (answers: OnboardingAnswers) => answers.p8a_tiene_vencimiento === 'Sí' },
        { id: `${prefix}_hasta`, type: 'month' as const, label: `Hasta ${index + 1} (mes/año)`, visibleWhen: (answers: OnboardingAnswers) => answers.p8a_tiene_vencimiento === 'Sí' },
      ]),
    ],
  },
  {
    id: 'p9',
    title: 'Lo que pagás sí o sí todos los meses',
    intro: 'Vamos a lo que pagás sí o sí todos los meses. Eso que no elegís: te toca. Completá lo que aplique, o si sos de los que tienen el número total en la cabeza, saltá directo al final. Sin contar inflación, el número de hoy alcanza.',
    introWithName: '{name}, vamos a lo que pagás sí o sí todos los meses. Eso que no elegís: te toca. Completá lo que aplique, o si sos de los que tienen el número total en la cabeza, saltá directo al final. Sin contar inflación, el número de hoy alcanza.',
    fields: [
      { id: 'fijo_alquiler', type: 'number', label: 'Alquiler / vivienda ($)' },
      { id: 'fijo_colegio', type: 'number', label: 'Colegio ($)' },
      { id: 'fijo_prepaga', type: 'number', label: 'Prepaga / salud ($)' },
      { id: 'fijo_prestamos', type: 'number', label: 'Préstamos (cuotas mensuales) ($)' },
      { id: 'fijo_servicios', type: 'number', label: 'Servicios (luz, gas, internet, celular) ($)' },
      { id: 'fijo_seguros', type: 'number', label: 'Seguros ($)' },
      { id: 'fijo_ayuda', type: 'number', label: 'Ayuda a familiares ($)' },
      { id: 'fijo_otro1_concepto', type: 'text', label: 'Otro (concepto)' },
      { id: 'fijo_otro1_monto', type: 'number', label: 'Otro ($)' },
      { id: 'fijo_otro2_concepto', type: 'text', label: 'Otro 2 (concepto)' },
      { id: 'fijo_otro2_monto', type: 'number', label: 'Otro 2 ($)' },
      { id: 'fijo_total_directo', type: 'number', label: 'O directamente el total, si lo tenés en la cabeza ($)' },
    ],
  },
  {
    id: 'p10',
    title: '¿Alguno tiene fecha de vencimiento final?',
    intro: 'De esos pagos obligatorios, ¿alguno tiene fecha de vencimiento final? O sea: en algún momento se termina y esa plata deja de salir de tu bolsillo. Un préstamo al que le quedan cuotas, el colegio que en enero no se paga.',
    fields: [
      {
        id: 'p10_tiene_vencimiento',
        type: 'radio',
        label: '¿Tiene vencimiento final?',
        options: [
          'Sí',
          'No, si pienso en el próximo año, todos son permanentes: van a estar ahí mes a mes.',
        ],
      },
      ...(['fin1', 'fin2', 'fin3', 'fin4'] as const).flatMap((prefix, index) => [
        { id: `${prefix}_concepto`, type: 'text' as const, label: `Concepto ${index + 1}`, visibleWhen: (answers: OnboardingAnswers) => answers.p10_tiene_vencimiento === 'Sí' },
        { id: `${prefix}_cuota`, type: 'number' as const, label: 'Cuota mensual ($)', visibleWhen: (answers: OnboardingAnswers) => answers.p10_tiene_vencimiento === 'Sí' },
        { id: `${prefix}_hasta`, type: 'month' as const, label: '¿Cuándo termina?', visibleWhen: (answers: OnboardingAnswers) => answers.p10_tiene_vencimiento === 'Sí' },
      ]),
    ],
  },
  {
    id: 'p11',
    title: 'La vida de todos los días',
    intro: 'Ahora la vida de todos los días. Cosas necesarias, más variables que las fijas de arriba, pero que siempre están. Y no te preocupes: los gustitos vienen después, no los mezcles acá.',
    fields: [
      { id: 'var_comida', type: 'number', label: 'Comida / súper ($)' },
      { id: 'var_transporte', type: 'number', label: 'Nafta / transporte ($)' },
      { id: 'var_farmacia', type: 'number', label: 'Farmacia ($)' },
      { id: 'var_otro1_concepto', type: 'text', label: 'Otro 1 (concepto)' },
      { id: 'var_otro1_monto', type: 'number', label: 'Otro 1 ($)' },
      { id: 'var_otro2_concepto', type: 'text', label: 'Otro 2 (concepto)' },
      { id: 'var_otro2_monto', type: 'number', label: 'Otro 2 ($)' },
      { id: 'var_otro3_concepto', type: 'text', label: 'Otro 3 (concepto)' },
      { id: 'var_otro3_monto', type: 'number', label: 'Otro 3 ($)' },
      { id: 'var_total_directo', type: 'number', label: 'O el total, si lo tenés en la cabeza ($)' },
    ],
  },
  {
    id: 'p12',
    title: 'Los gustitos',
    intro: 'Ahora sí: los gustitos pecaminosos. Esos que te das porque te los merecés, y está perfecto. Solo queremos saber cuánto pesan. Acá nadie te reta.',
    fields: [
      { id: 'd_salidas', type: 'number', label: 'Salidas ($)' },
      { id: 'd_ropa', type: 'number', label: 'Ropa ($)' },
      { id: 'd_delivery', type: 'number', label: 'Delivery ($)' },
      { id: 'd_susc', type: 'number', label: 'Suscripciones ($)' },
      { id: 'd_hobbies', type: 'number', label: 'Hobbies / actividades propias ($)' },
      { id: 'd_otro1_concepto', type: 'text', label: 'Otro 1 (concepto)' },
      { id: 'd_otro1_monto', type: 'number', label: 'Otro 1 ($)' },
      { id: 'd_otro2_concepto', type: 'text', label: 'Otro 2 (concepto)' },
      { id: 'd_otro2_monto', type: 'number', label: 'Otro 2 ($)' },
      { id: 'd_otro3_concepto', type: 'text', label: 'Otro 3 (concepto)' },
      { id: 'd_otro3_monto', type: 'number', label: 'Otro 3 ($)' },
    ],
  },
  {
    id: 'p13',
    title: '¿Qué harías con cada gustito si hubiera que reducir gastos?',
    intro: 'De esos gustitos: si mañana hiciera falta apretar en serio, ¿qué harías con cada uno? Y no me mientas, porque no me mentís a mí, te mentís a vos mismo.',
    fields: [
      ...([
        ['e13_salidas', 'Salidas', 'd_salidas'],
        ['e13_ropa', 'Ropa', 'd_ropa'],
        ['e13_delivery', 'Delivery', 'd_delivery'],
        ['e13_susc', 'Suscripciones', 'd_susc'],
        ['e13_hobbies', 'Hobbies', 'd_hobbies'],
        ['e13_otro1', 'Otro 1', 'd_otro1_monto'],
        ['e13_otro2', 'Otro 2', 'd_otro2_monto'],
        ['e13_otro3', 'Otro 3', 'd_otro3_monto'],
      ] as const).map(([id, label, answerId]) => ({
        id,
        type: 'radio' as const,
        label,
        options: ['Lo llevo a cero', 'Lo reduzco a la mitad', 'No lo toco ni en crisis'],
        visibleWhen: (answers: OnboardingAnswers) => typeof answers[answerId] === 'number',
      })),
    ],
  },
  {
    id: 'p14',
    title: 'Compras necesarias que tarde o temprano van a llegar',
    intro: '¿Hay alguna compra que sabés que va a caer en los próximos 12 meses, aunque no sepas cuándo? No un gusto, una de esas que no se negocian: el auto que ya hace ruiditos, los anteojos, el lavarropas que agoniza.',
    fields: [
      {
        id: 'p14_tiene_compras',
        type: 'radio',
        label: '¿Tiene compras previstas?',
        options: ['Sí', 'No'],
      },
      { id: 'n1_concepto', type: 'text', label: 'Concepto 1', visibleWhen: (answers) => answers.p14_tiene_compras === 'Sí' },
      { id: 'n1_monto', type: 'number', label: 'Monto aproximado 1 ($)', visibleWhen: (answers) => answers.p14_tiene_compras === 'Sí' },
      { id: 'n2_concepto', type: 'text', label: 'Concepto 2', visibleWhen: (answers) => answers.p14_tiene_compras === 'Sí' },
      { id: 'n2_monto', type: 'number', label: 'Monto aproximado 2 ($)', visibleWhen: (answers) => answers.p14_tiene_compras === 'Sí' },
      { id: 'n3_concepto', type: 'text', label: 'Concepto 3', visibleWhen: (answers) => answers.p14_tiene_compras === 'Sí' },
      { id: 'n3_monto', type: 'number', label: 'Monto aproximado 3 ($)', visibleWhen: (answers) => answers.p14_tiene_compras === 'Sí' },
    ],
  },
  {
    id: 'p15',
    title: '¿Usás tarjeta de crédito?',
    fields: [
      {
        id: 'p15_tarjetas',
        type: 'number',
        label: '¿Cuántas tarjetas usás? (0 a 5)',
      },
    ],
  },
  ...([1, 2, 3, 4, 5].flatMap((n): OnboardingStep[] => [
    {
      id: `t${n}_p16`,
      title: `Tarjeta ${n} - el último resumen`,
      intro: `Tarjeta ${n}: agarrá el último resumen, o abrí la app del banco, no te vamos a hacer revolver cajones. ¿De cuánto vino?`,
      visibleWhen: (answers: OnboardingAnswers) => {
        const cards = answers.p15_tarjetas
        return typeof cards === 'number' && cards >= n
      },
      fields: [
        { id: `t${n}_resumen_ars`, type: 'number', label: 'En pesos ($)' },
        { id: `t${n}_resumen_usd`, type: 'number', label: 'En dólares (US$)' },
      ],
    },
    {
      id: `t${n}_p17`,
      title: `Tarjeta ${n} - las cuotas que siguen`,
      intro: 'Ahora las cuotas que siguen después de este resumen. Elegí el camino que te resulte más cómodo:',
      visibleWhen: (answers: OnboardingAnswers) => {
        const cards = answers.p15_tarjetas
        return typeof cards === 'number' && cards >= n
      },
      fields: [
        {
          id: `t${n}_cuotas_modo`,
          type: 'radio',
          label: 'Elegí el camino que te resulte más cómodo',
          options: [
            'Subir foto del resumen',
            'Carga manual mes por mes',
            'Carga manual a ojo',
          ],
        },
        { id: `t${n}_upload_url`, type: 'upload', label: 'Subí el resumen (foto o PDF)', visibleWhen: (answers: OnboardingAnswers) => answers[`t${n}_cuotas_modo`] === 'Subir foto del resumen' },
        ...([1, 2, 3, 4, 5, 6].map((month) => ({
          id: `t${n}_cuotas_m${month}`,
          type: 'number' as const,
          label: `Mes ${month} ($)`,
          visibleWhen: (answers: OnboardingAnswers) => answers[`t${n}_cuotas_modo`] === 'Carga manual mes por mes' || answers[`t${n}_cuotas_modo`] === 'B',
        }))),
        { id: `t${n}_cuotas_resto`, type: 'number', label: '¿Y después de eso queda algo? ($)', visibleWhen: (answers: OnboardingAnswers) => answers[`t${n}_cuotas_modo`] === 'Carga manual mes por mes' || answers[`t${n}_cuotas_modo`] === 'B' },
        { id: `t${n}_cuotas_resto_hasta`, type: 'month', label: 'Hasta (mes/año)', visibleWhen: (answers: OnboardingAnswers) => answers[`t${n}_cuotas_modo`] === 'Carga manual mes por mes' || answers[`t${n}_cuotas_modo`] === 'B' },
        { id: `t${n}_cuotas_mensual`, type: 'number', label: 'Monto mensual ($)', visibleWhen: (answers: OnboardingAnswers) => answers[`t${n}_cuotas_modo`] === 'Carga manual a ojo' || answers[`t${n}_cuotas_modo`] === 'C' },
        { id: `t${n}_cuotas_hasta`, type: 'month', label: 'Hasta (mes/año)', visibleWhen: (answers: OnboardingAnswers) => answers[`t${n}_cuotas_modo`] === 'Carga manual a ojo' || answers[`t${n}_cuotas_modo`] === 'C' },
      ],
    },
    {
      id: `t${n}_p18`,
      title: `Tarjeta ${n} - ¿quedó algo sin pagar del resumen anterior?`,
      visibleWhen: (answers: OnboardingAnswers) => {
        const cards = answers.p15_tarjetas
        return typeof cards === 'number' && cards >= n
      },
      fields: [
        { id: `t${n}_arrastre`, type: 'number', label: 'Monto impago ($)' },
      ],
    },
    {
      id: `t${n}_p19`,
      title: `Tarjeta ${n} - ¿qué día cierra y qué día vence? (opcional)`,
      visibleWhen: (answers: OnboardingAnswers) => {
        const cards = answers.p15_tarjetas
        return typeof cards === 'number' && cards >= n
      },
      fields: [
        { id: `t${n}_cierre_dia`, type: 'number', label: 'Día de cierre' },
        { id: `t${n}_vto_dia`, type: 'number', label: 'Día de vencimiento' },
      ],
    },
    {
      id: `t${n}_p20`,
      title: `Tarjeta ${n} - gastos después del cierre`,
      intro: `Última de tarjetas, lo prometemos: desde que cerró el último resumen hasta hoy, ¿cuánto más gastaste con esta tarjeta?`,
      visibleWhen: (answers: OnboardingAnswers) => {
        const cards = answers.p15_tarjetas
        return typeof cards === 'number' && cards >= n
      },
      fields: [
        { id: `t${n}_postcierre`, type: 'number', label: 'A ojo ($)' },
        { id: `t${n}_postcierre_upload`, type: 'upload', label: 'O subí una captura de los últimos movimientos' },
      ],
    },
  ])),
]

export function getActiveSteps(answers: OnboardingAnswers): readonly OnboardingStep[] {
  return onboardingSteps.flatMap((step) =>
    step.visibleWhen?.(answers) === false ? [] : [step],
  )
}

const definedAnswerIds = new Set(onboardingSteps.flatMap((step) => step.fields.map((field) => field.id)))

export function filterAnswersForActiveSteps(answers: OnboardingAnswers): OnboardingAnswers {
  const activeAnswerIds = new Set(
    getActiveSteps(answers).flatMap((step) => getVisibleFields(step, answers).map((field) => field.id)),
  )

  return Object.fromEntries(
    Object.entries(answers).filter(([key]) => !definedAnswerIds.has(key) || activeAnswerIds.has(key)),
  )
}

export function getInactiveAnswerIds(answers: OnboardingAnswers): string[] {
  const activeAnswerIds = new Set(
    getActiveSteps(answers).flatMap((step) => getVisibleFields(step, answers).map((field) => field.id)),
  )

  return [...definedAnswerIds].filter((id) => answers[id] !== undefined && !activeAnswerIds.has(id))
}

export function getVisibleFields(
  step: OnboardingStep | undefined,
  answers: OnboardingAnswers,
): readonly OnboardingField[] {
  return step?.fields.filter((field) => field.visibleWhen?.(answers) !== false) ?? []
}

export function validateStep(
  stepOrIndex: OnboardingStep | number | undefined,
  answers: OnboardingAnswers,
): Record<string, string> {
  let step: OnboardingStep | undefined
  if (typeof stepOrIndex === 'number') {
    step = onboardingSteps[stepOrIndex]
  } else {
    step = stepOrIndex
  }
  if (!step) return {}

  const errors: Record<string, string> = {}

  // 1. Generic non-negative validator for any field of type 'number' in the step
  const otherPairsMap: Record<string, string> = {
    fijo_otro1_monto: 'fijo_otro1_concepto',
    fijo_otro2_monto: 'fijo_otro2_concepto',
    var_otro1_monto: 'var_otro1_concepto',
    var_otro2_monto: 'var_otro2_concepto',
    var_otro3_monto: 'var_otro3_concepto',
    d_otro1_monto: 'd_otro1_concepto',
    d_otro2_monto: 'd_otro2_concepto',
    d_otro3_monto: 'd_otro3_concepto',
    n1_monto: 'n1_concepto',
    n2_monto: 'n2_concepto',
    n3_monto: 'n3_concepto',
  }

  for (const field of getVisibleFields(step, answers)) {
    const val = answers[field.id]
    const numVal = typeof val === 'string' && val.trim() !== '' ? Number(val) : val
    const hasSuppliedValue = val !== undefined && val !== null && (
      typeof val !== 'string' || val.trim() !== ''
    )
    if (field.type === 'number' && hasSuppliedValue) {
      if (typeof numVal !== 'number' || !Number.isFinite(numVal)) {
        errors[field.id] = 'Ingresá un número válido.'
      } else if (numVal < 0) {
        errors[field.id] = 'El monto no puede ser negativo.'
      }
    }

    if (field.type === 'checkbox' && hasSuppliedValue && !Array.isArray(val)) {
      errors[field.id] = 'Elegí una opción válida.'
    }
    if (
      field.type !== 'number' &&
      field.type !== 'radio' &&
      field.type !== 'checkbox' &&
      hasSuppliedValue &&
      typeof val !== 'string'
    ) {
      errors[field.id] = 'Ingresá un valor válido.'
    }

    if (field.options && val !== undefined && val !== null && val !== '') {
      const isValidOption = Array.isArray(val)
        ? field.type === 'checkbox' && val.every(option => typeof option === 'string' && field.options!.includes(option))
        : field.type !== 'checkbox' && typeof val === 'string' && field.options.includes(val)
      if (!isValidOption) errors[field.id] = 'Elegí una opción válida.'
    }

    const conceptId = otherPairsMap[field.id]
    if (conceptId) {
      const isAmtProvided = typeof numVal === 'number' && !isNaN(numVal) && numVal > 0
      const conceptVal = answers[conceptId]
      if (isAmtProvided && (typeof conceptVal !== 'string' || conceptVal.trim() === '')) {
        errors[conceptId] = 'Debe ingresar el concepto.'
      }
    }
    if (field.required && (
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim() === '') ||
      (Array.isArray(val) && val.length === 0)
    )) {
      errors[field.id] = field.requiredMessage ?? 'Este campo es requerido.'
    }
  }

  // 2. Specific validations per step ID:
  if (step.id === 'p1') {
    const val = answers.p1_pesa
    if (!val) {
      errors.p1_pesa = 'Elegí una opción para continuar.'
    }
  }

  if (step.id === 'p2') {
    const val = answers.p2_ultimo
    if (Array.isArray(val) && val.length > 2) {
      errors.p2_ultimo = 'Seleccioná como máximo 2 opciones.'
    }
  }

  if (step.id === 'p3') {
    const val = answers.p3_primero
    if (Array.isArray(val) && val.length > 2) {
      errors.p3_primero = 'Seleccioná como máximo 2 opciones.'
    }
  }

  if (step.id === 'p4') {
    const val = answers.ing_total
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      errors.ing_total = 'Este campo es requerido.'
    }
  }

  if (step.id === 'p8a') {
    const val = answers.p8a_tiene_vencimiento
    if (val === 'Sí') {
      const rows = ['ing_fin1', 'ing_fin2', 'ing_fin3', 'ing_fin4'] as const
      let completeCount = 0
      let partialCount = 0
      for (const prefix of rows) {
        const montoVal = answers[`${prefix}_monto`]
        const hastaVal = answers[`${prefix}_hasta`]
        const hasM = montoVal !== undefined && montoVal !== null && montoVal !== ''
        const hasH = typeof hastaVal === 'string' && hastaVal.trim() !== ''
        if (hasM && hasH) {
          completeCount++
        } else if (hasM || hasH) {
          partialCount++
          if (hasM) {
            errors[`${prefix}_hasta`] = 'Completá la fecha de vencimiento.'
          } else {
            errors[`${prefix}_monto`] = 'Este campo es requerido.'
          }
        }
      }
      if (completeCount === 0 && partialCount === 0) {
        errors.ing_fin1_monto = 'Completá al menos un ingreso que vence.'
      }
    }
  }

  if (step.id === 'p9') {
    const detailKeys = [
      'fijo_alquiler', 'fijo_colegio', 'fijo_prepaga', 'fijo_prestamos',
      'fijo_servicios', 'fijo_seguros', 'fijo_ayuda', 'fijo_otro1_monto', 'fijo_otro2_monto',
    ]
    const hasDetail = detailKeys.some(key => {
      const val = answers[key]
      return typeof val === 'number' && val > 0
    })
    const totalDirecto = answers.fijo_total_directo
    const hasDirectTotal = typeof totalDirecto === 'number' && totalDirecto > 0
    if (!hasDetail && !hasDirectTotal) {
      errors.fijo_total_directo = 'Completá al menos un ítem o el total directo.'
    }
  }

  if (step.id === 'p11') {
    const detailKeys = [
      'var_comida', 'var_transporte', 'var_farmacia',
      'var_otro1_monto', 'var_otro2_monto', 'var_otro3_monto',
    ]
    const hasDetail = detailKeys.some(key => {
      const val = answers[key]
      return typeof val === 'number' && val > 0
    })
    const totalDirecto = answers.var_total_directo
    const hasDirectTotal = typeof totalDirecto === 'number' && totalDirecto > 0
    if (!hasDetail && !hasDirectTotal) {
      errors.var_total_directo = 'Completá al menos un ítem o el total directo.'
    }
  }

  if (step.id === 'p12') {
    const detailKeys = [
      'd_salidas', 'd_ropa', 'd_delivery', 'd_susc', 'd_hobbies',
      'd_otro1_monto', 'd_otro2_monto', 'd_otro3_monto',
    ]
    const hasDetail = detailKeys.some(key => {
      const val = answers[key]
      return typeof val === 'number' && val > 0
    })
    if (!hasDetail) {
      errors.d_salidas = 'Completá al menos un gasto de gustitos.'
    }
  }

  if (step.id === 'p15') {
    const val = answers.p15_tarjetas
    const cardCount = typeof val === 'string' && val.trim() !== '' ? Number(val) : val
    if (typeof cardCount !== 'number' || !Number.isInteger(cardCount) || cardCount < 0 || cardCount > 5) {
      errors.p15_tarjetas = 'Ingresá un número entero entre 0 y 5.'
    }
  }

  if (step.id.endsWith('_p16')) {
    const prefix = step.id.split('_')[0]
    const arsKey = `${prefix}_resumen_ars`
    const usdKey = `${prefix}_resumen_usd`
    const arsVal = answers[arsKey]
    const usdVal = answers[usdKey]
    const hasArs = typeof arsVal === 'number' && arsVal >= 0
    const hasUsd = typeof usdVal === 'number' && usdVal >= 0
    if (!hasArs && !hasUsd) {
      errors[arsKey] = 'Debe ingresar el monto de la tarjeta.'
    }
  }

  if (step.id.endsWith('_p17')) {
    const prefix = step.id.split('_')[0]
    const modoKey = `${prefix}_cuotas_modo`
    const modoVal = answers[modoKey]
    if (!modoVal) {
      errors[modoKey] = 'Elegí una opción para continuar.'
    } else if (modoVal === 'Carga manual mes por mes' || modoVal === 'B') {
      const months = [1, 2, 3, 4, 5, 6].map(m => `${prefix}_cuotas_m${m}`)
      const hasAny = months.some(mKey => typeof answers[mKey] === 'number')
      if (!hasAny) {
        errors[`${prefix}_cuotas_m1`] = 'Completá al menos una cuota mensual.'
      }
    } else if (modoVal === 'Carga manual a ojo' || modoVal === 'C') {
      const mensualKey = `${prefix}_cuotas_mensual`
      const hastaKey = `${prefix}_cuotas_hasta`
      const mensualVal = answers[mensualKey]
      const hastaVal = answers[hastaKey]
      if (mensualVal === undefined || mensualVal === null || mensualVal === '') {
        errors[mensualKey] = 'Completá el monto mensual.'
      }
      if (!hastaVal) {
        errors[hastaKey] = 'Completá la fecha de vencimiento.'
      }
    } else if (modoVal === 'Subir foto del resumen' || modoVal === 'A') {
      if (!answers[`${prefix}_upload_url`]) {
        errors[`${prefix}_upload_url`] = 'Subí el resumen para continuar.'
      }
    }
  }

  if (step.id === 'p23') {
    const emailVal = answers.email
    if (answers.contacto_canal === 'Email' && typeof emailVal === 'string' && emailVal.trim().length > 0) {
      if (!/.+@.+\..+/.test(emailVal)) {
        errors.email = 'El formato del email no es válido.'
      }
    }
    const phoneVal = answers.whatsapp
    if (answers.contacto_canal === 'WhatsApp' && typeof phoneVal === 'string' && phoneVal.trim().length > 0) {
      if (!/^(?=.*\d)[0-9+\s\-()]{6,}$/.test(phoneVal)) {
        errors.whatsapp = 'El formato del teléfono no es válido.'
      }
    }
  }

  return errors
}

export function getFirstIncompleteStep(answers: OnboardingAnswers): number {
  const activeSteps = getActiveSteps(answers)
  return activeSteps.findIndex((step) => Object.keys(validateStep(step, answers)).length > 0)
}

export const saveDraftInput = z.object({
  deviceId: z.uuid(),
  answers: z.record(z.string(), onboardingAnswerSchema),
  completed: z.boolean(),
})
