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
        t1_cuotas_modo: 'Carga manual mes por mes',
        t1_cuotas_m1: 20000,
        p15_tarjetas: 1,
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
      T2_resumen_ars: '',
      T5_postcierre_upload: '',
    })
  })

  it('writes BOM-prefixed, comma-delimited CSV with Excel line endings', () => {
    expect(serializeCsv(['nombre', 'nota'], [{ nombre: 'Ana, "A"', nota: 'uno\ndos' }]))
      .toBe('\uFEFFnombre,nota\r\n"Ana, ""A""","uno\r\ndos"')
  })
})
