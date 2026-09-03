import type { OnboardingAnswers } from '@/features/onboarding/definition'

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
  'p2_ultimo_1', 'p2_ultimo_2', 'p3_primero_1', 'p3_primero_2', 'ing_total', 'p5_fuentes', 'ing_tercero_falla',
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
  ...[1, 2, 3, 4, 5].flatMap((number) => [
    `gasto_diario_adicional_${number}_concepto`,
    `gasto_diario_adicional_${number}_monto`,
  ]),
  'var_total_directo',
  'p12_modo',
  'd_salidas', 'd_ropa', 'd_delivery', 'd_susc', 'd_hobbies',
  ...[1, 2, 3, 4, 5].flatMap((number) => [
    `gustito_adicional_${number}_concepto`,
    `gustito_adicional_${number}_monto`,
    `decision_gustito_adicional_${number}`,
  ]),
  'd_total_directo',
  'e13_salidas', 'e13_ropa', 'e13_delivery', 'e13_susc', 'e13_hobbies',
  ...[1, 2, 3, 4, 5].flatMap((number) => [
    `compra_necesaria_${number}_concepto`,
    `compra_necesaria_${number}_monto`,
    `compra_necesaria_${number}_fecha`,
  ]),
  'p14_tiene_compras', 'n1_concepto', 'n1_monto', 'n2_concepto', 'n2_monto', 'n3_concepto', 'n3_monto',
  'p15_tarjetas', ...cardHeaders,
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

function listValue(answers: OnboardingAnswers, key: string, index: number): CsvValue {
  const answer = answers[key]
  if (Array.isArray(answer)) {
    const item = answer[index]
    return typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item)) ? item : ''
  }
  return index === 0 ? value(answers, key) : ''
}

function normalizeCardMode(answer: CsvValue): CsvValue {
  if (answer === 'A' || answer === 'B' || answer === 'C') return answer
  if (answer === 'Subir foto o archivo') return 'A'
  if (answer === 'Copiar el renglón mes a mes') return 'B'
  if (answer === 'No lo tengo a mano, que Norte me lo pida después por WhatsApp') return 'C'
  return ''
}

type CsvItem = Record<string, unknown>
type SlotSerializer = (number: number, item?: CsvItem) => Partial<CsvRow>

function serializeSlots(source: unknown, count: number, serialize: SlotSerializer) {
  const items = Array.isArray(source) ? source : []
  const row: Partial<CsvRow> = {}
  for (let index = 0; index < count; index++) {
    const item = items[index]
    Object.assign(row, serialize(index + 1, item && typeof item === 'object' ? item : undefined))
  }
  return row
}

function serializeScalarAnswers(answers: OnboardingAnswers): CsvRow {
  const row = Object.fromEntries(csvHeaders.map((header) => [header, ''])) as CsvRow
  for (const header of csvHeaders) row[header] = value(answers, header)
  row.p2_ultimo_1 = listValue(answers, 'p2_ultimo', 0)
  row.p2_ultimo_2 = listValue(answers, 'p2_ultimo', 1)
  row.p3_primero_1 = listValue(answers, 'p3_primero', 0)
  row.p3_primero_2 = listValue(answers, 'p3_primero', 1)
  row.p5_fuentes = Array.isArray(answers.p5_fuentes) ? answers.p5_fuentes.join(' | ') : ''
  for (let number = 1; number <= 5; number++) {
    row[`t${number}_cuotas_modo`] = normalizeCardMode(row[`t${number}_cuotas_modo`])
  }
  return row
}

function serializeExtraIncomeFields(answers: OnboardingAnswers) {
  return serializeSlots(answers.ingresos_extra, 10, (number, item) => {
    const prefix = `ingresos_extra${number}`
    return {
      [`${prefix}_concepto`]: fixedOtherValue(item?.concepto),
      [`${prefix}_monto`]: fixedOtherAmount(item?.monto),
      [`${prefix}_desde`]: fixedOtherValue(item?.desde),
      [`${prefix}_hasta`]: fixedOtherValue(item?.hasta),
    }
  })
}

function serializeFixedOtherFields(answers: OnboardingAnswers) {
  const row = serializeSlots(answers.fijo_otros, 5, (number, item) => ({
    [`fijo_otro${number}_concepto`]: fixedOtherValue(item?.concepto),
    [`fijo_otro${number}_monto`]: fixedOtherAmount(item?.monto),
    [`fijo_otro${number}_hasta`]: fixedOtherValue(item?.hasta),
  }))
  if (answers.fijo_otros === undefined) {
    for (let index = 1; index <= 2; index++) {
      row[`fijo_otro${index}_concepto`] = fixedOtherValue(answers[`fijo_otro${index}_concepto`])
      row[`fijo_otro${index}_monto`] = fixedOtherAmount(answers[`fijo_otro${index}_monto`])
      row[`fijo_otro${index}_hasta`] = fixedOtherValue(answers[`fijo_otro${index}_hasta`])
    }
  }
  return row
}

function serializeDailyExpenseFields(answers: OnboardingAnswers) {
  return serializeSlots(answers.var_otros, 5, (number, item) => ({
    [`gasto_diario_adicional_${number}_concepto`]: fixedOtherValue(item?.concepto),
    [`gasto_diario_adicional_${number}_monto`]: fixedOtherAmount(item?.monto),
  }))
}

function serializeDiscretionaryExpenseFields(answers: OnboardingAnswers) {
  return serializeSlots(answers.d_otros, 5, (number, item) => ({
    [`gustito_adicional_${number}_concepto`]: fixedOtherValue(item?.concepto),
    [`gustito_adicional_${number}_monto`]: fixedOtherAmount(item?.monto),
    [`decision_gustito_adicional_${number}`]: value(answers, `e13_gustito_adicional${number}`),
  }))
}

function serializeNecessaryPurchaseFields(answers: OnboardingAnswers) {
  return serializeSlots(answers.compras_necesarias, 5, (number, item) => ({
    [`compra_necesaria_${number}_concepto`]: fixedOtherValue(item?.concepto),
    [`compra_necesaria_${number}_monto`]: fixedOtherAmount(item?.monto),
    [`compra_necesaria_${number}_fecha`]: fixedOtherValue(item?.fecha),
  }))
}

function serializeNecessaryPurchaseAnswers(answers: OnboardingAnswers) {
  return Object.fromEntries(
    [1, 2, 3].flatMap((number) => [
      [`n${number}_concepto`, value(answers, `n${number}_concepto`)],
      [`n${number}_monto`, value(answers, `n${number}_monto`)],
    ]),
  ) as Partial<CsvRow>
}

export function toAdminCsvRow(draft: CompletedDraft): CsvRow {
  if (!draft.completedAt) throw new Error('Only completed drafts can be exported.')
  const row = serializeScalarAnswers(draft.answers)
  row.timestamp = draft.completedAt.toISOString()
  Object.assign(
    row,
    serializeExtraIncomeFields(draft.answers),
    serializeFixedOtherFields(draft.answers),
    serializeDailyExpenseFields(draft.answers),
    serializeDiscretionaryExpenseFields(draft.answers),
    serializeNecessaryPurchaseFields(draft.answers),
    serializeNecessaryPurchaseAnswers(draft.answers),
  )

  return row
}

function escapeCsvValue(value: CsvValue) {
  const text = String(value).replace(/\r\n|\r|\n/g, '\r\n')
  const safeText = typeof value === 'string' && /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[;"\r\n]/.test(safeText) ? `"${safeText.replaceAll('"', '""')}"` : safeText
}

export function serializeCsv(headers: readonly string[], rows: CsvRow[]) {
  return `\uFEFF${[headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))]
    .map((values) => values.map(escapeCsvValue).join(';'))
    .join('\r\n')}`
}
