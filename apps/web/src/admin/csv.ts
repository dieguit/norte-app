import type { OnboardingAnswers } from '../onboarding/definition'

type CsvValue = string | number
type CsvRow = Record<string, CsvValue>
type CompletedDraft = {
  answers: OnboardingAnswers
  completedAt: Date | null
  [key: string]: any
}

const cardHeaders = [1, 2, 3, 4, 5].flatMap((number) => {
  const prefix = `T${number}`
  return [
    `${prefix}_resumen_ars`, `${prefix}_resumen_usd`, `${prefix}_cuotas_modo`, `${prefix}_upload_url`,
    ...[1, 2, 3, 4, 5, 6].map((month) => `${prefix}_cuotas_m${month}`),
    `${prefix}_cuotas_resto`, `${prefix}_cuotas_resto_hasta`, `${prefix}_cuotas_mensual`, `${prefix}_cuotas_hasta`,
    `${prefix}_arrastre`, `${prefix}_cierre_dia`, `${prefix}_vto_dia`, `${prefix}_postcierre`, `${prefix}_postcierre_upload`,
  ]
})

export const csvHeaders = [
  'timestamp', 'nombre', 'whatsapp', 'email', 'p1_pesa', 'p1_otra',
  'p2_ultimo_1', 'p2_ultimo_2', 'p3_primero_1', 'p3_primero_2',
  'ing_total', 'ing_fuentes', 'ing_tercero_falla', 'ing_tercero_monto', 'extra_tipo', 'extra_monto',
  'aumento_meses', 'aumento_pct',
  'fijo_alquiler', 'fijo_colegio', 'fijo_prepaga', 'fijo_prestamos', 'fijo_servicios', 'fijo_seguros', 'fijo_ayuda',
  'fijo_otro1_concepto', 'fijo_otro1_monto', 'fijo_otro2_concepto', 'fijo_otro2_monto', 'fijo_total_directo',
  ...['fin1', 'fin2', 'fin3', 'fin4'].flatMap((prefix) => [`${prefix}_concepto`, `${prefix}_cuota`, `${prefix}_hasta`]),
  'var_comida', 'var_transporte', 'var_farmacia',
  ...['var_otro1', 'var_otro2', 'var_otro3'].flatMap((prefix) => [`${prefix}_concepto`, `${prefix}_monto`]),
  'var_total_directo',
  'd_salidas', 'd_ropa', 'd_delivery', 'd_susc', 'd_hobbies',
  ...['d_otro1', 'd_otro2', 'd_otro3'].flatMap((prefix) => [`${prefix}_concepto`, `${prefix}_monto`]),
  'e13_salidas', 'e13_ropa', 'e13_delivery', 'e13_susc', 'e13_hobbies', 'e13_otro1', 'e13_otro2', 'e13_otro3',
  'n1_concepto', 'n1_monto', 'n2_concepto', 'n2_monto', 'n3_concepto', 'n3_monto',
  'num_tarjetas', ...cardHeaders,
] as const

const modeMap: Record<string, string> = {
  'Subir foto del resumen': 'A',
  'Carga manual mes por mes': 'B',
  'Carga manual a ojo': 'C',
  'A': 'A',
  'B': 'B',
  'C': 'C',
}

const value = (answers: OnboardingAnswers, key: string): CsvValue => {
  const answer = answers[key]
  return typeof answer === 'string' || typeof answer === 'number' ? answer : ''
}

export function toAdminCsvRow(draft: CompletedDraft): CsvRow {
  if (!draft.completedAt) throw new Error('Only completed drafts can be exported.')
  const answers = draft.answers
  const row = Object.fromEntries(csvHeaders.map((header) => [header, ''])) as CsvRow
  for (const header of csvHeaders) row[header] = value(answers, header)
  row.timestamp = draft.completedAt.toISOString()
  row.ing_fuentes = Array.isArray(answers.p5_fuentes) ? answers.p5_fuentes.join(' | ') : ''
  row.p2_ultimo_1 = Array.isArray(answers.p2_ultimo) ? answers.p2_ultimo[0] ?? '' : ''
  row.p2_ultimo_2 = Array.isArray(answers.p2_ultimo) ? answers.p2_ultimo[1] ?? '' : ''
  row.p3_primero_1 = Array.isArray(answers.p3_primero) ? answers.p3_primero[0] ?? '' : ''
  row.p3_primero_2 = Array.isArray(answers.p3_primero) ? answers.p3_primero[1] ?? '' : ''
  row.num_tarjetas = value(answers, 'p15_tarjetas')
  for (let number = 1; number <= 5; number++) {
    const source = `t${number}`
    const target = `T${number}`
    row[`${target}_cuotas_modo`] = modeMap[String(answers[`${source}_cuotas_modo`] ?? '')] ?? ''
    for (const header of cardHeaders.filter((header) => header.startsWith(`${target}_`) && header !== `${target}_cuotas_modo`)) {
      row[header] = value(answers, header.replace(`${target}_`, `${source}_`))
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
