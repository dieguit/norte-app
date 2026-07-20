import { describe, expect, it } from 'vitest'
import { csvHeaders, serializeCsv, toAdminCsvRow } from './csv'

describe('admin CSV export', () => {
  it('uses the fixed contract headers in order', () => {
    expect(csvHeaders.slice(0, 12)).toEqual([
      'timestamp', 'nombre', 'whatsapp', 'email', 'p1_pesa', 'p1_otra',
      'p2_ultimo_1', 'p2_ultimo_2', 'p3_primero_1', 'p3_primero_2',
      'ing_total', 'ing_fuentes',
    ])
    expect(csvHeaders).not.toContain('saldo_hoy')
    expect(csvHeaders).not.toContain('deudas_otras')
    expect(csvHeaders).toContain('n3_monto')
    expect(csvHeaders).toContain('T5_postcierre_upload')
    const fixedStart = csvHeaders.indexOf('p9_modo')
    expect(csvHeaders.slice(fixedStart, fixedStart + 23)).toEqual([
      'p9_modo',
      'fijo_alquiler', 'fijo_colegio', 'fijo_prepaga', 'fijo_prestamos', 'fijo_servicios', 'fijo_seguros', 'fijo_ayuda',
      'fijo_otro1_concepto', 'fijo_otro1_monto', 'fijo_otro1_hasta',
      'fijo_otro2_concepto', 'fijo_otro2_monto', 'fijo_otro2_hasta',
      'fijo_otro3_concepto', 'fijo_otro3_monto', 'fijo_otro3_hasta',
      'fijo_otro4_concepto', 'fijo_otro4_monto', 'fijo_otro4_hasta',
      'fijo_otro5_concepto', 'fijo_otro5_monto', 'fijo_otro5_hasta',
    ])
  })

  it('maps arrays, P14, and card modes while keeping unused cards blank', () => {
    const row = toAdminCsvRow({
      deviceId: '123e4567-e89b-12d3-a456-426614174000',
      completedAt: new Date('2026-07-16T12:00:00Z'),
      answers: {
        nombre: 'Ana',
        p2_ultimo: 'Comida (comprar más barato)',
        p3_primero: 'Salidas con amigos el finde',
        p5_fuentes: ['Sueldo fijo (relación de dependencia)', 'Otro'],
        n1_concepto: 'Lavarropas',
        n1_monto: 500000,
        t1_cuotas_modo: 'Copiar el renglón mes a mes',
        t1_cuotas_m1: 20000,
        t2_cuotas_modo: 'No lo tengo a mano, que Norte me lo pida después por WhatsApp',
        p15_tarjetas: 2,
      },
    })

    expect(row).toMatchObject({
      timestamp: '2026-07-16T12:00:00.000Z',
      p2_ultimo_1: 'Comida (comprar más barato)',
      p2_ultimo_2: '',
      p3_primero_1: 'Salidas con amigos el finde',
      p3_primero_2: '',
      ing_fuentes: 'Sueldo fijo (relación de dependencia) | Otro',
      n1_concepto: 'Lavarropas',
      n1_monto: 500000,
      T1_cuotas_modo: 'B',
      T1_cuotas_m1: 20000,
      T2_cuotas_modo: 'D',
      T2_resumen_ars: '',
      T5_postcierre_upload: '',
    })
    expect(csvHeaders).not.toContain('T1_cuotas_mensual')
    expect(csvHeaders).not.toContain('T1_cuotas_hasta')
  })

  it('flattens p9 mode and up to five fixed other expenses', () => {
    const row = toAdminCsvRow({
      completedAt: new Date('2026-07-16T12:00:00Z'),
      answers: {
        p9_modo: 'Quiero desglosar',
        fijo_otros: [
          { concepto: 'Expensas', monto: 25000, desde: '', hasta: 'dic-26' },
          { concepto: 'Niñera', monto: '30000', desde: '', hasta: '' },
          { concepto: 'Cochera', monto: 15000, desde: '', hasta: 'mar-27' },
          { concepto: 'Terapia', monto: 12000, desde: '', hasta: '' },
          { concepto: 'Club', monto: 8000, desde: '', hasta: 'ene-27' },
        ],
      },
    })

    expect(row).toMatchObject({
      p9_modo: 'Quiero desglosar',
      fijo_otro1_concepto: 'Expensas', fijo_otro1_monto: 25000, fijo_otro1_hasta: 'dic-26',
      fijo_otro2_concepto: 'Niñera', fijo_otro2_monto: '30000', fijo_otro2_hasta: '',
      fijo_otro3_concepto: 'Cochera', fijo_otro3_monto: 15000, fijo_otro3_hasta: 'mar-27',
      fijo_otro4_concepto: 'Terapia', fijo_otro4_monto: 12000, fijo_otro4_hasta: '',
      fijo_otro5_concepto: 'Club', fijo_otro5_monto: 8000, fijo_otro5_hasta: 'ene-27',
    })
  })

  it('preserves legacy fixed other fields when the collection is absent', () => {
    const row = toAdminCsvRow({
      completedAt: new Date('2026-07-16T12:00:00Z'),
      answers: {
        fijo_otro1_concepto: 'Expensas', fijo_otro1_monto: Number.NaN, fijo_otro1_hasta: 'dic-26',
        fijo_otro2_concepto: 'Niñera', fijo_otro2_monto: Number.POSITIVE_INFINITY, fijo_otro2_hasta: 'mar-27',
      },
    })

    expect(row).toMatchObject({
      fijo_otro1_concepto: 'Expensas', fijo_otro1_monto: '', fijo_otro1_hasta: 'dic-26',
      fijo_otro2_concepto: 'Niñera', fijo_otro2_monto: '', fijo_otro2_hasta: 'mar-27',
    })
  })

  it('gives the fixed other collection precedence over legacy fields', () => {
    const row = toAdminCsvRow({
      completedAt: new Date('2026-07-16T12:00:00Z'),
      answers: {
        fijo_otro1_concepto: 'Legacy', fijo_otro1_monto: 100, fijo_otro1_hasta: 'ene-27',
        fijo_otro2_concepto: 'Legacy 2', fijo_otro2_monto: 200, fijo_otro2_hasta: 'feb-27',
        fijo_otros: [{ concepto: 'Nuevo', monto: 300, desde: '', hasta: 'mar-27' }],
      },
    })

    expect(row).toMatchObject({
      fijo_otro1_concepto: 'Nuevo', fijo_otro1_monto: 300, fijo_otro1_hasta: 'mar-27',
      fijo_otro2_concepto: '', fijo_otro2_monto: '', fijo_otro2_hasta: '',
    })
  })

  it('blanks non-finite numeric strings but preserves finite fixed-other amounts', () => {
    const row = toAdminCsvRow({
      completedAt: new Date('2026-07-16T12:00:00Z'),
      answers: {
        fijo_otros: [
          { concepto: 'Expensas', monto: ' 30000 ', desde: '', hasta: 'dic-26' },
          { concepto: 'Niñera', monto: 'Infinity', desde: '', hasta: 'ene-27' },
          { concepto: 'Cochera', monto: 'NaN', desde: '', hasta: 'feb-27' },
          { concepto: 'Club', monto: '   ', desde: '', hasta: 'mar-27' },
        ],
      },
    })

    expect(row).toMatchObject({
      fijo_otro1_concepto: 'Expensas', fijo_otro1_monto: '30000', fijo_otro1_hasta: 'dic-26',
      fijo_otro2_concepto: 'Niñera', fijo_otro2_monto: '', fijo_otro2_hasta: 'ene-27',
      fijo_otro3_concepto: 'Cochera', fijo_otro3_monto: '', fijo_otro3_hasta: 'feb-27',
      fijo_otro4_concepto: 'Club', fijo_otro4_monto: '', fijo_otro4_hasta: 'mar-27',
    })
  })

  it('keeps upload links after the central contract in card order', () => {
    expect(csvHeaders.slice(-10)).toEqual([
      'T1_upload_url', 'T1_postcierre_upload',
      'T2_upload_url', 'T2_postcierre_upload',
      'T3_upload_url', 'T3_postcierre_upload',
      'T4_upload_url', 'T4_postcierre_upload',
      'T5_upload_url', 'T5_postcierre_upload',
    ])
    expect(csvHeaders.indexOf('T1_upload_url')).toBeGreaterThan(csvHeaders.indexOf('T5_postcierre'))
  })

  it('exports dates and expiring incomes in the central contract', () => {
    const row = toAdminCsvRow({
      completedAt: new Date('2026-07-16T12:00:00Z'),
      answers: {
        extra_cuando: 'sep-27', aumento_proximo: 'oct-27',
        ing_fin1_monto: 100000, ing_fin1_hasta: 'nov-27',
        t1_upload_url: 'statement-key', t1_postcierre_upload: 'movements-key',
      },
    })
    expect(row).toMatchObject({
      extra_cuando: 'sep-27', aumento_proximo: 'oct-27',
      ing_fin1_monto: 100000, ing_fin1_hasta: 'nov-27',
      T1_upload_url: 'statement-key', T1_postcierre_upload: 'movements-key',
    })
  })

  it('writes BOM-prefixed, comma-delimited CSV with Excel line endings', () => {
    expect(serializeCsv(['nombre', 'nota'], [{ nombre: 'Ana, "A"', nota: 'uno\ndos' }]))
      .toBe('\uFEFFnombre,nota\r\n"Ana, ""A""","uno\r\ndos"')
  })
})
