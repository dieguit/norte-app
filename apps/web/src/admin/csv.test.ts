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
  })

  it('maps arrays, P14, and card modes while keeping unused cards blank', () => {
    const row = toAdminCsvRow({
      deviceId: '123e4567-e89b-12d3-a456-426614174000',
      completedAt: new Date('2026-07-16T12:00:00Z'),
      answers: {
        nombre: 'Ana',
        p2_ultimo: ['Comida', 'Ropa'],
        p3_primero: ['Salidas y gustos'],
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
      p2_ultimo_1: 'Comida',
      p2_ultimo_2: 'Ropa',
      p3_primero_1: 'Salidas y gustos',
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
