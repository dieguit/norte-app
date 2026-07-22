import type { OnboardingAnswers } from '../onboarding/definition'

type CsvValue = string | number
type CsvRow = Record<string, CsvValue>
type CompletedDraft = {
  answers: OnboardingAnswers
  completedAt: Date | null
  [key: string]: any
}

const cardHeaders = [1, 2, 3, 4, 5].flatMap((number) => {
  const prefix = `t${number}`
  return [
    `${prefix}_cuotas_modo`, `${prefix}_upload_url`, `${prefix}_resumen_ars`, `${prefix}_resumen_usd`,
    `${prefix}_cierre_dia`, `${prefix}_vto_dia`,
    ...[1, 2, 3, 4, 5, 6].map((month) => `${prefix}_cuotas_m${month}`),
    `${prefix}_cuotas_resto`, `${prefix}_cuotas_resto_hasta`,
    `${prefix}_arrastre`, `${prefix}_postcierre`,
    `${prefix}_postcierre_cuotas`, `${prefix}_postcierre_cuotas_cantidad`,
    `${prefix}_postcierre_upload`,
  ]
})

export const csvHeaders = [
  'timestamp', 'nombre', 'contacto_canal', 'whatsapp', 'email', 'p1_pesa', 'p1_otra',
  'p2_ultimo', 'p3_primero', 'ing_total', 'p5_fuentes', 'ing_tercero_falla',
  'ing_tercero_monto', 'p8a_tiene_vencimiento', 'ing_sueldo_fijo_hasta',
  'ing_trabajos_propios_hasta', 'ing_aportes_tercero_hasta', 'ing_jubilacion_pension_hasta',
  'ing_otro_hasta', 'aumento_tipo', 'aumento_meses', 'aumento_pct', 'aumento_proximo',
  'extra_tiene',
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((number) => [
    `ingresos_extra${number}_concepto`, `ingresos_extra${number}_monto`,
    `ingresos_extra${number}_desde`, `ingresos_extra${number}_hasta`,
  ]),
  'p9_modo',
  'fijo_alquiler', 'fijo_colegio', 'fijo_prepaga', 'fijo_prestamos', 'fijo_servicios', 'fijo_seguros', 'fijo_ayuda',
  ...[1, 2, 3, 4, 5].flatMap((number) => [
    `fijo_otro${number}_concepto`, `fijo_otro${number}_monto`, `fijo_otro${number}_hasta`,
  ]),
  'fijo_total_directo', 'p10_tiene_vencimiento',
  'fijo_alquiler_hasta', 'fijo_colegio_hasta', 'fijo_prepaga_hasta',
  'fijo_prestamos_hasta', 'fijo_servicios_hasta', 'fijo_seguros_hasta', 'fijo_ayuda_hasta',
  ...['fin1', 'fin2', 'fin3', 'fin4'].flatMap((prefix) => [`${prefix}_concepto`, `${prefix}_cuota`, `${prefix}_hasta`]),
  'p11_modo',
  'var_comida', 'var_transporte', 'var_farmacia',
  ...['var_otro1', 'var_otro2', 'var_otro3'].flatMap((prefix) => [`${prefix}_concepto`, `${prefix}_monto`]),
  'var_total_directo',
  'p12_modo',
  'd_salidas', 'd_ropa', 'd_delivery', 'd_susc', 'd_hobbies',
  ...['d_otro1', 'd_otro2', 'd_otro3'].flatMap((prefix) => [`${prefix}_concepto`, `${prefix}_monto`]),
  'd_total_directo',
  'e13_salidas', 'e13_ropa', 'e13_delivery', 'e13_susc', 'e13_hobbies', 'e13_otro1', 'e13_otro2', 'e13_otro3',
  'n1_concepto', 'n1_monto', 'n2_concepto', 'n2_monto', 'n3_concepto', 'n3_monto',
  'p14_tiene_compras', 'p15_tarjetas', ...cardHeaders,
] as const

const value = (answers: OnboardingAnswers, key: string): CsvValue => {
  const answer = answers[key]
  return typeof answer === 'string' || (typeof answer === 'number' && Number.isFinite(answer)) ? answer : ''
}

const fixedOtherValue = (answer: unknown): CsvValue =>
  typeof answer === 'string' || (typeof answer === 'number' && Number.isFinite(answer)) ? answer : ''

const fixedOtherAmount = (answer: unknown): CsvValue => {
  if (typeof answer === 'number') return Number.isFinite(answer) ? answer : ''
  if (typeof answer !== 'string') return ''
  const normalized = answer.trim()
  return normalized !== '' && Number.isFinite(Number(normalized)) ? normalized : ''
}

export function toAdminCsvRow(draft: CompletedDraft): CsvRow {
  if (!draft.completedAt) throw new Error('Only completed drafts can be exported.')
  const answers = draft.answers
  const row = Object.fromEntries(csvHeaders.map((header) => [header, ''])) as CsvRow
  for (const header of csvHeaders) row[header] = value(answers, header)
  row.timestamp = draft.completedAt.toISOString()
  row.p5_fuentes = Array.isArray(answers.p5_fuentes) ? answers.p5_fuentes.join(' | ') : ''

  for (let index = 0; index < 10; index++) {
    const prefix = `ingresos_extra${index + 1}`
    row[`${prefix}_concepto`] = ''
    row[`${prefix}_monto`] = ''
    row[`${prefix}_desde`] = ''
    row[`${prefix}_hasta`] = ''
    const item = Array.isArray(answers.ingresos_extra) ? answers.ingresos_extra[index] : undefined
    if (!item || typeof item !== 'object') continue
    row[`${prefix}_concepto`] = fixedOtherValue(item.concepto)
    row[`${prefix}_monto`] = fixedOtherAmount(item.monto)
    row[`${prefix}_desde`] = fixedOtherValue(item.desde)
    row[`${prefix}_hasta`] = fixedOtherValue(item.hasta)
  }

  for (let index = 0; index < 5; index++) {
    row[`fijo_otro${index + 1}_concepto`] = ''
    row[`fijo_otro${index + 1}_monto`] = ''
    row[`fijo_otro${index + 1}_hasta`] = ''
    const item = Array.isArray(answers.fijo_otros) ? answers.fijo_otros[index] : undefined
    if (!item || typeof item !== 'object') continue
    row[`fijo_otro${index + 1}_concepto`] = fixedOtherValue(item.concepto)
    row[`fijo_otro${index + 1}_monto`] = fixedOtherAmount(item.monto)
    row[`fijo_otro${index + 1}_hasta`] = fixedOtherValue(item.hasta)
  }
  if (answers.fijo_otros === undefined) {
    for (let index = 1; index <= 2; index++) {
      row[`fijo_otro${index}_concepto`] = fixedOtherValue(answers[`fijo_otro${index}_concepto`])
      row[`fijo_otro${index}_monto`] = fixedOtherAmount(answers[`fijo_otro${index}_monto`])
      row[`fijo_otro${index}_hasta`] = fixedOtherValue(answers[`fijo_otro${index}_hasta`])
    }
  }
  return row
}

function escapeCsvValue(value: CsvValue) {
  const text = String(value).replace(/\r\n|\r|\n/g, '\r\n')
  return /[,"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function serializeCsv(headers: readonly string[], rows: CsvRow[]) {
  return `\uFEFF${[headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))]
    .map((values) => values.map(escapeCsvValue).join(','))
    .join('\r\n')}`
}
