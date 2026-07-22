import { describe, expect, it } from 'vitest'
import { csvHeaders, serializeCsv, toAdminCsvRow } from './csv'

const completedAt = new Date('2026-07-16T12:00:00Z')
const expectedCardHeaders = [
  't1_cuotas_modo', 't1_upload_url', 't1_resumen_ars', 't1_resumen_usd', 't1_cierre_dia', 't1_vto_dia',
  't1_cuotas_m1', 't1_cuotas_m2', 't1_cuotas_m3', 't1_cuotas_m4', 't1_cuotas_m5', 't1_cuotas_m6',
  't1_cuotas_resto', 't1_cuotas_resto_hasta', 't1_arrastre', 't1_postcierre', 't1_postcierre_cuotas',
  't1_postcierre_cuotas_cantidad', 't1_postcierre_upload',
  't2_cuotas_modo', 't2_upload_url', 't2_resumen_ars', 't2_resumen_usd', 't2_cierre_dia', 't2_vto_dia',
  't2_cuotas_m1', 't2_cuotas_m2', 't2_cuotas_m3', 't2_cuotas_m4', 't2_cuotas_m5', 't2_cuotas_m6',
  't2_cuotas_resto', 't2_cuotas_resto_hasta', 't2_arrastre', 't2_postcierre', 't2_postcierre_cuotas',
  't2_postcierre_cuotas_cantidad', 't2_postcierre_upload',
  't3_cuotas_modo', 't3_upload_url', 't3_resumen_ars', 't3_resumen_usd', 't3_cierre_dia', 't3_vto_dia',
  't3_cuotas_m1', 't3_cuotas_m2', 't3_cuotas_m3', 't3_cuotas_m4', 't3_cuotas_m5', 't3_cuotas_m6',
  't3_cuotas_resto', 't3_cuotas_resto_hasta', 't3_arrastre', 't3_postcierre', 't3_postcierre_cuotas',
  't3_postcierre_cuotas_cantidad', 't3_postcierre_upload',
  't4_cuotas_modo', 't4_upload_url', 't4_resumen_ars', 't4_resumen_usd', 't4_cierre_dia', 't4_vto_dia',
  't4_cuotas_m1', 't4_cuotas_m2', 't4_cuotas_m3', 't4_cuotas_m4', 't4_cuotas_m5', 't4_cuotas_m6',
  't4_cuotas_resto', 't4_cuotas_resto_hasta', 't4_arrastre', 't4_postcierre', 't4_postcierre_cuotas',
  't4_postcierre_cuotas_cantidad', 't4_postcierre_upload',
  't5_cuotas_modo', 't5_upload_url', 't5_resumen_ars', 't5_resumen_usd', 't5_cierre_dia', 't5_vto_dia',
  't5_cuotas_m1', 't5_cuotas_m2', 't5_cuotas_m3', 't5_cuotas_m4', 't5_cuotas_m5', 't5_cuotas_m6',
  't5_cuotas_resto', 't5_cuotas_resto_hasta', 't5_arrastre', 't5_postcierre', 't5_postcierre_cuotas',
  't5_postcierre_cuotas_cantidad', 't5_postcierre_upload',
]
const cardAnswers = {
  t1_cuotas_modo: 't1-mode',
  t1_upload_url: 't1-upload', t1_resumen_ars: 't1-ars', t1_resumen_usd: 't1-usd',
  t1_cierre_dia: 't1-close', t1_vto_dia: 't1-due', t1_cuotas_m1: 't1-m1', t1_cuotas_m2: 't1-m2',
  t1_cuotas_m3: 't1-m3', t1_cuotas_m4: 't1-m4', t1_cuotas_m5: 't1-m5', t1_cuotas_m6: 't1-m6',
  t1_cuotas_resto: 't1-rest', t1_cuotas_resto_hasta: 't1-rest-until', t1_arrastre: 't1-carry',
  t1_postcierre: 't1-post', t1_postcierre_cuotas: 't1-post-installments',
  t1_postcierre_cuotas_cantidad: 't1-post-count',
  t1_postcierre_upload: 't1-movements',
  t2_cuotas_modo: 't2-mode', t2_upload_url: 't2-upload', t2_resumen_ars: 't2-ars', t2_resumen_usd: 't2-usd',
  t2_cierre_dia: 't2-close', t2_vto_dia: 't2-due', t2_cuotas_m1: 't2-m1', t2_cuotas_m2: 't2-m2',
  t2_cuotas_m3: 't2-m3', t2_cuotas_m4: 't2-m4', t2_cuotas_m5: 't2-m5', t2_cuotas_m6: 't2-m6',
  t2_cuotas_resto: 't2-rest', t2_cuotas_resto_hasta: 't2-rest-until', t2_arrastre: 't2-carry',
  t2_postcierre: 't2-post', t2_postcierre_cuotas: 't2-post-installments', t2_postcierre_cuotas_cantidad: 't2-post-count',
  t2_postcierre_upload: 't2-movements',
  t3_cuotas_modo: 't3-mode', t3_upload_url: 't3-upload', t3_resumen_ars: 't3-ars', t3_resumen_usd: 't3-usd',
  t3_cierre_dia: 't3-close', t3_vto_dia: 't3-due', t3_cuotas_m1: 't3-m1', t3_cuotas_m2: 't3-m2',
  t3_cuotas_m3: 't3-m3', t3_cuotas_m4: 't3-m4', t3_cuotas_m5: 't3-m5', t3_cuotas_m6: 't3-m6',
  t3_cuotas_resto: 't3-rest', t3_cuotas_resto_hasta: 't3-rest-until', t3_arrastre: 't3-carry',
  t3_postcierre: 't3-post', t3_postcierre_cuotas: 't3-post-installments', t3_postcierre_cuotas_cantidad: 't3-post-count',
  t3_postcierre_upload: 't3-movements',
  t4_cuotas_modo: 't4-mode', t4_upload_url: 't4-upload', t4_resumen_ars: 't4-ars', t4_resumen_usd: 't4-usd',
  t4_cierre_dia: 't4-close', t4_vto_dia: 't4-due', t4_cuotas_m1: 't4-m1', t4_cuotas_m2: 't4-m2',
  t4_cuotas_m3: 't4-m3', t4_cuotas_m4: 't4-m4', t4_cuotas_m5: 't4-m5', t4_cuotas_m6: 't4-m6',
  t4_cuotas_resto: 't4-rest', t4_cuotas_resto_hasta: 't4-rest-until', t4_arrastre: 't4-carry',
  t4_postcierre: 't4-post', t4_postcierre_cuotas: 't4-post-installments', t4_postcierre_cuotas_cantidad: 't4-post-count',
  t4_postcierre_upload: 't4-movements',
  t5_cuotas_modo: 't5-mode', t5_upload_url: 't5-statement', t5_resumen_ars: 't5-ars', t5_resumen_usd: 't5-usd',
  t5_cierre_dia: 't5-close', t5_vto_dia: 't5-due', t5_cuotas_m1: 't5-m1', t5_cuotas_m2: 't5-m2',
  t5_cuotas_m3: 't5-m3', t5_cuotas_m4: 't5-m4', t5_cuotas_m5: 't5-m5', t5_cuotas_m6: 't5-m6',
  t5_cuotas_resto: 't5-rest', t5_cuotas_resto_hasta: 't5-rest-until', t5_arrastre: 't5-carry',
  t5_postcierre: 't5-post', t5_postcierre_cuotas: 't5-post-installments', t5_postcierre_cuotas_cantidad: 't5-post-count',
  t5_postcierre_upload: 't5-movements',
}

describe('admin CSV export', () => {
  it('uses the current contract headers in order', () => {
    const expectedHeaders = [
      'timestamp', 'nombre', 'contacto_canal', 'whatsapp', 'email', 'p1_pesa', 'p1_otra',
      'p2_ultimo', 'p3_primero', 'ing_total', 'p5_fuentes', 'ing_tercero_falla',
      'ing_tercero_monto', 'p8a_tiene_vencimiento', 'ing_sueldo_fijo_hasta',
      'ing_trabajos_propios_hasta', 'ing_aportes_tercero_hasta', 'ing_jubilacion_pension_hasta',
      'ing_otro_hasta', 'aumento_tipo', 'aumento_meses', 'aumento_pct', 'aumento_proximo',
      'extra_tiene', 'ingresos_extra1_concepto', 'ingresos_extra1_monto',
      'ingresos_extra1_desde', 'ingresos_extra1_hasta',
      'ingresos_extra2_concepto', 'ingresos_extra2_monto', 'ingresos_extra2_desde',
      'ingresos_extra2_hasta',
      ...[3, 4, 5, 6, 7, 8, 9, 10].flatMap((number) => [
        `ingresos_extra${number}_concepto`, `ingresos_extra${number}_monto`,
        `ingresos_extra${number}_desde`, `ingresos_extra${number}_hasta`,
      ]),
      'p9_modo', 'fijo_alquiler', 'fijo_colegio', 'fijo_prepaga', 'fijo_prestamos',
      'fijo_servicios', 'fijo_seguros', 'fijo_ayuda',
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
      'p14_tiene_compras', 'p15_tarjetas',
      ...expectedCardHeaders,
    ]

    expect(csvHeaders).toEqual(expectedHeaders)
    expect(Object.keys(cardAnswers).sort()).toEqual([...expectedCardHeaders].sort())
    expect(csvHeaders).not.toContain('extra_tipo')
    expect(csvHeaders).not.toContain('extra_monto')
    expect(csvHeaders).not.toContain('extra_cuando')
    expect(csvHeaders).not.toContain('extra_hasta')
    expect(csvHeaders).not.toContain('ing_fin1_monto')
    expect(csvHeaders).not.toContain('num_tarjetas')
    expect(csvHeaders).not.toContain('p2_ultimo_1')
    expect(csvHeaders).not.toContain('p3_primero_1')
    expect(csvHeaders).not.toContain('T1_cuotas_modo')
    expect(csvHeaders).toEqual(expect.arrayContaining([
      'fijo_alquiler_hasta', 'fijo_colegio_hasta', 'fijo_prepaga_hasta',
      'fijo_prestamos_hasta', 'fijo_servicios_hasta', 'fijo_seguros_hasta', 'fijo_ayuda_hasta',
    ]))
  })

  it('exports current selectors, source answers, expirations, extras, and raw card IDs', () => {
    const row = toAdminCsvRow({
      completedAt,
      answers: {
        nombre: 'Ana', contacto_canal: 'Email', whatsapp: '54911', email: 'ana@example.com',
        p1_pesa: 'Sí', p1_otra: 'Otra prioridad', p2_ultimo: 'Comida', p3_primero: 'Salidas',
        p5_fuentes: ['Sueldo fijo', 'Otro'],
        p8a_tiene_vencimiento: 'Sí', ing_sueldo_fijo_hasta: 'dic-26',
        ing_trabajos_propios_hasta: 'ene-27', ing_aportes_tercero_hasta: 'feb-27',
        ing_jubilacion_pension_hasta: 'mar-27', ing_otro_hasta: 'abr-27',
        aumento_tipo: 'Porcentaje', aumento_meses: 3, aumento_pct: 10, aumento_proximo: 'may-27',
        extra_tiene: 'Sí', p10_tiene_vencimiento: 'No', p14_tiene_compras: 'Sí',
        ingresos_extra: [
          { concepto: 'Clases', monto: 50000, desde: 'ene-26', hasta: 'jun-26' },
          { concepto: 'Ventas', monto: 20000, desde: 'feb-26', hasta: '' },
          ...Array.from({ length: 8 }, () => ({ concepto: '', monto: '', desde: '', hasta: '' })),
        ],
        fijo_alquiler: 100000, fijo_alquiler_hasta: 'dic-26',
        fijo_colegio_hasta: 'nov-26', fijo_prepaga_hasta: 'oct-26',
        fijo_prestamos_hasta: 'sep-26', fijo_servicios_hasta: 'ago-26',
        fijo_seguros_hasta: 'jul-26', fijo_ayuda_hasta: 'jun-26',
        ...cardAnswers,
      },
    })

    expect(row).toMatchObject({
      timestamp: '2026-07-16T12:00:00.000Z', nombre: 'Ana', contacto_canal: 'Email',
      p1_pesa: 'Sí', p1_otra: 'Otra prioridad', p2_ultimo: 'Comida', p3_primero: 'Salidas',
      p5_fuentes: 'Sueldo fijo | Otro', p8a_tiene_vencimiento: 'Sí',
      ing_sueldo_fijo_hasta: 'dic-26', ing_trabajos_propios_hasta: 'ene-27',
      ing_aportes_tercero_hasta: 'feb-27', ing_jubilacion_pension_hasta: 'mar-27',
      ing_otro_hasta: 'abr-27', aumento_tipo: 'Porcentaje',
      extra_tiene: 'Sí', p10_tiene_vencimiento: 'No', p14_tiene_compras: 'Sí',
      ingresos_extra1_concepto: 'Clases', ingresos_extra1_monto: 50000,
      ingresos_extra1_desde: 'ene-26', ingresos_extra1_hasta: 'jun-26',
      ingresos_extra2_concepto: 'Ventas', ingresos_extra2_monto: 20000,
      ingresos_extra2_desde: 'feb-26', ingresos_extra2_hasta: '',
      fijo_alquiler_hasta: 'dic-26', fijo_colegio_hasta: 'nov-26',
      fijo_prepaga_hasta: 'oct-26', fijo_prestamos_hasta: 'sep-26',
      fijo_servicios_hasta: 'ago-26', fijo_seguros_hasta: 'jul-26', fijo_ayuda_hasta: 'jun-26',
      ...cardAnswers,
    })

    for (const [key, answer] of Object.entries(cardAnswers)) {
      expect(row[key]).toBe(answer)
    }
  })

  it('serializes every scalar current answer directly', () => {
    const answers = {
      nombre: 'Bruno', contacto_canal: 'WhatsApp', whatsapp: '5491199999999', email: 'bruno@example.com',
      p1_pesa: 'Sí', p1_otra: 'Donaciones', p2_ultimo: 'Comida', p3_primero: 'Ahorro',
      ing_total: 850000, p5_fuentes: ['Sueldo fijo', 'Otro'],
      ing_tercero_falla: 'No, es confiable', ing_tercero_monto: 125000,
      p8a_tiene_vencimiento: 'Sí', ing_sueldo_fijo_hasta: 'ene-27',
      ing_trabajos_propios_hasta: 'feb-27', ing_aportes_tercero_hasta: 'mar-27',
      ing_jubilacion_pension_hasta: 'abr-27', ing_otro_hasta: 'may-27',
      aumento_tipo: 'Tiene aumentos periódicos', aumento_meses: 6, aumento_pct: 12,
      aumento_proximo: 'jun-27', extra_tiene: 'No',
      p9_modo: 'Quiero desglosar', fijo_alquiler: 200000, fijo_alquiler_hasta: 'jul-27',
      fijo_colegio: 60000, fijo_colegio_hasta: 'ago-27', fijo_prepaga: 45000, fijo_prepaga_hasta: 'sep-27',
      fijo_prestamos: 70000, fijo_prestamos_hasta: 'oct-27', fijo_servicios: 35000, fijo_servicios_hasta: 'nov-27',
      fijo_seguros: 15000, fijo_seguros_hasta: 'dic-27', fijo_ayuda: 25000, fijo_ayuda_hasta: 'ene-28',
      p10_tiene_vencimiento: 'Sí',
      fin1_concepto: 'Cuota médica', fin1_cuota: 18000, fin1_hasta: 'feb-28',
      fin2_concepto: 'Curso', fin2_cuota: 12000, fin2_hasta: 'mar-28',
      fin3_concepto: 'Reparación', fin3_cuota: 9000, fin3_hasta: 'abr-28',
      fin4_concepto: 'Seguro extra', fin4_cuota: 8000, fin4_hasta: 'may-28',
      p11_modo: 'Quiero desglosar',
      var_comida: 110000, var_transporte: 50000, var_farmacia: 16000,
      var_otro1_concepto: 'Mascota', var_otro1_monto: 14000,
      var_otro2_concepto: 'Limpieza', var_otro2_monto: 9000,
      var_otro3_concepto: 'Regalos', var_otro3_monto: 7000, var_total_directo: 206000,
      p12_modo: 'Quiero desglosar',
      d_salidas: 30000, d_ropa: 22000, d_delivery: 18000, d_susc: 6000, d_hobbies: 28000,
      d_otro1_concepto: 'Café', d_otro1_monto: 5000, d_otro2_concepto: 'Juegos', d_otro2_monto: 4000,
      d_otro3_concepto: 'Viajes', d_otro3_monto: 55000, d_total_directo: 123000,
      e13_salidas: 'Lo reduzco a la mitad', e13_ropa: 'Lo llevo a cero',
      e13_delivery: 'Lo reduzco a la mitad', e13_susc: 'No lo toco ni en crisis',
      e13_hobbies: 'No lo toco ni en crisis', e13_otro1: 'Lo llevo a cero',
      e13_otro2: 'Lo reduzco a la mitad', e13_otro3: 'No lo toco ni en crisis',
      p14_tiene_compras: 'Sí', n1_concepto: 'Lavarropas', n1_monto: 500000,
      n2_concepto: 'Anteojos', n2_monto: 100000, n3_concepto: 'Auto', n3_monto: 1500000,
      p15_tarjetas: 4,
      ...cardAnswers,
    }
    const row = toAdminCsvRow({ completedAt, answers })
    const expectedValues = {
      timestamp: '2026-07-16T12:00:00.000Z',
      nombre: 'Bruno', contacto_canal: 'WhatsApp', whatsapp: '5491199999999', email: 'bruno@example.com',
      p1_pesa: 'Sí', p1_otra: 'Donaciones', p2_ultimo: 'Comida', p3_primero: 'Ahorro',
      ing_total: 850000, p5_fuentes: 'Sueldo fijo | Otro',
      ing_tercero_falla: 'No, es confiable', ing_tercero_monto: 125000,
      p8a_tiene_vencimiento: 'Sí', ing_sueldo_fijo_hasta: 'ene-27',
      ing_trabajos_propios_hasta: 'feb-27', ing_aportes_tercero_hasta: 'mar-27',
      ing_jubilacion_pension_hasta: 'abr-27', ing_otro_hasta: 'may-27',
      aumento_tipo: 'Tiene aumentos periódicos', aumento_meses: 6, aumento_pct: 12,
      aumento_proximo: 'jun-27', extra_tiene: 'No', p9_modo: 'Quiero desglosar',
      fijo_alquiler: 200000, fijo_alquiler_hasta: 'jul-27', fijo_colegio: 60000, fijo_colegio_hasta: 'ago-27',
      fijo_prepaga: 45000, fijo_prepaga_hasta: 'sep-27', fijo_prestamos: 70000, fijo_prestamos_hasta: 'oct-27',
      fijo_servicios: 35000, fijo_servicios_hasta: 'nov-27', fijo_seguros: 15000, fijo_seguros_hasta: 'dic-27',
      fijo_ayuda: 25000, fijo_ayuda_hasta: 'ene-28', p10_tiene_vencimiento: 'Sí',
      fin1_concepto: 'Cuota médica', fin1_cuota: 18000, fin1_hasta: 'feb-28',
      fin2_concepto: 'Curso', fin2_cuota: 12000, fin2_hasta: 'mar-28',
      fin3_concepto: 'Reparación', fin3_cuota: 9000, fin3_hasta: 'abr-28',
      fin4_concepto: 'Seguro extra', fin4_cuota: 8000, fin4_hasta: 'may-28',
      p11_modo: 'Quiero desglosar',
      var_comida: 110000, var_transporte: 50000, var_farmacia: 16000,
      var_otro1_concepto: 'Mascota', var_otro1_monto: 14000, var_otro2_concepto: 'Limpieza', var_otro2_monto: 9000,
      var_otro3_concepto: 'Regalos', var_otro3_monto: 7000, var_total_directo: 206000,
      p12_modo: 'Quiero desglosar',
      d_salidas: 30000, d_ropa: 22000, d_delivery: 18000, d_susc: 6000, d_hobbies: 28000,
      d_otro1_concepto: 'Café', d_otro1_monto: 5000, d_otro2_concepto: 'Juegos', d_otro2_monto: 4000,
      d_otro3_concepto: 'Viajes', d_otro3_monto: 55000, d_total_directo: 123000,
      e13_salidas: 'Lo reduzco a la mitad', e13_ropa: 'Lo llevo a cero',
      e13_delivery: 'Lo reduzco a la mitad', e13_susc: 'No lo toco ni en crisis',
      e13_hobbies: 'No lo toco ni en crisis', e13_otro1: 'Lo llevo a cero',
      e13_otro2: 'Lo reduzco a la mitad', e13_otro3: 'No lo toco ni en crisis',
      p14_tiene_compras: 'Sí', n1_concepto: 'Lavarropas', n1_monto: 500000,
      n2_concepto: 'Anteojos', n2_monto: 100000, n3_concepto: 'Auto', n3_monto: 1500000,
      p15_tarjetas: 4,
    }

    for (const [header, answer] of Object.entries(expectedValues)) {
      expect(row[header]).toBe(answer)
    }
    expect(serializeCsv(['ing_tercero_falla'], [row]))
      .toBe('\uFEFFing_tercero_falla\r\n"No, es confiable"')
  })

  it('flattens all ten extra-income slots with every field populated', () => {
    const row = toAdminCsvRow({
      completedAt,
      answers: {
        ingresos_extra: Array.from({ length: 10 }, (_, index) => {
          const slot = index + 1
          return {
            concepto: `Extra ${slot}`,
            monto: 1000 + slot,
            desde: `ene-${20 + slot}`,
            hasta: `feb-${20 + slot}`,
          }
        }),
      },
    })

    for (let index = 1; index <= 10; index++) {
      expect(row[`ingresos_extra${index}_concepto`]).toBe(`Extra ${index}`)
      expect(row[`ingresos_extra${index}_monto`]).toBe(1000 + index)
      expect(row[`ingresos_extra${index}_desde`]).toBe(`ene-${20 + index}`)
      expect(row[`ingresos_extra${index}_hasta`]).toBe(`feb-${20 + index}`)
    }
  })

  it('blanks extra-income slots two through ten when only one is provided', () => {
    const row = toAdminCsvRow({
      completedAt,
      answers: { ingresos_extra: [{ concepto: 'Uno', monto: 1, desde: '', hasta: '' }] },
    })

    for (let index = 2; index <= 10; index++) {
      expect(row[`ingresos_extra${index}_concepto`]).toBe('')
      expect(row[`ingresos_extra${index}_monto`]).toBe('')
      expect(row[`ingresos_extra${index}_desde`]).toBe('')
      expect(row[`ingresos_extra${index}_hasta`]).toBe('')
    }
  })

  it('blanks non-finite repeated amounts and flattens fixed-other expenses', () => {
    const row = toAdminCsvRow({
      completedAt,
      answers: {
        ingresos_extra: [
          { concepto: 'NaN', monto: Number.NaN, desde: '', hasta: '' },
          { concepto: 'Infinity', monto: 'Infinity', desde: '', hasta: '' },
        ],
        fijo_otros: [
          { concepto: 'Expensas', monto: '30000', desde: '', hasta: 'dic-26' },
          { concepto: 'Niñera', monto: Number.POSITIVE_INFINITY, desde: '', hasta: 'ene-27' },
          { concepto: 'Cochera', monto: 15000, desde: '', hasta: 'feb-27' },
          { concepto: 'Terapia', monto: '12000', desde: '', hasta: 'mar-27' },
          { concepto: 'Club', monto: 8000, desde: '', hasta: 'abr-27' },
        ],
      },
    })

    expect(row).toMatchObject({
      ingresos_extra1_monto: '', ingresos_extra2_monto: '',
      fijo_otro1_concepto: 'Expensas', fijo_otro1_monto: '30000', fijo_otro1_hasta: 'dic-26',
      fijo_otro2_concepto: 'Niñera', fijo_otro2_monto: '', fijo_otro2_hasta: 'ene-27',
      fijo_otro3_concepto: 'Cochera', fijo_otro3_monto: 15000, fijo_otro3_hasta: 'feb-27',
      fijo_otro4_concepto: 'Terapia', fijo_otro4_monto: '12000', fijo_otro4_hasta: 'mar-27',
      fijo_otro5_concepto: 'Club', fijo_otro5_monto: 8000, fijo_otro5_hasta: 'abr-27',
    })
  })

  it('blanks unused fixed-other slots after a shorter collection', () => {
    const row = toAdminCsvRow({
      completedAt,
      answers: {
        fijo_otros: [{ concepto: 'Expensas', monto: 30000, desde: '', hasta: 'dic-26' }],
      },
    })

    expect(row).toMatchObject({
      fijo_otro1_concepto: 'Expensas', fijo_otro1_monto: 30000, fijo_otro1_hasta: 'dic-26',
      fijo_otro2_concepto: '', fijo_otro2_monto: '', fijo_otro2_hasta: '',
      fijo_otro3_concepto: '', fijo_otro3_monto: '', fijo_otro3_hasta: '',
      fijo_otro4_concepto: '', fijo_otro4_monto: '', fijo_otro4_hasta: '',
      fijo_otro5_concepto: '', fijo_otro5_monto: '', fijo_otro5_hasta: '',
    })
  })

  it('falls back to persisted legacy fixed-other slots when the collection is absent', () => {
    const row = toAdminCsvRow({
      completedAt,
      answers: {
        fijo_otro1_concepto: 'Legacy expensas', fijo_otro1_monto: '30000', fijo_otro1_hasta: 'dic-26',
        fijo_otro2_concepto: 'Legacy cochera', fijo_otro2_monto: Number.POSITIVE_INFINITY, fijo_otro2_hasta: 'ene-27',
      },
    })

    expect(row).toMatchObject({
      fijo_otro1_concepto: 'Legacy expensas', fijo_otro1_monto: '30000', fijo_otro1_hasta: 'dic-26',
      fijo_otro2_concepto: 'Legacy cochera', fijo_otro2_monto: '', fijo_otro2_hasta: 'ene-27',
    })
  })

  it('rejects incomplete drafts', () => {
    expect(() => toAdminCsvRow({ completedAt: null, answers: {} })).toThrow(
      'Only completed drafts can be exported.',
    )
  })

  it('writes BOM-prefixed, comma-delimited CSV with Excel line endings', () => {
    expect(serializeCsv(['nombre', 'nota'], [{ nombre: 'Ana, "A"', nota: 'uno\ndos' }]))
      .toBe('\uFEFFnombre,nota\r\n"Ana, ""A""","uno\r\ndos"')
  })
})
