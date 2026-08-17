import { describe, expect, it } from 'vitest'
import demoReport from '@/features/informe/demo.json'
import { reportSchema } from './report'

describe('reportSchema', () => {
  it('accepts the report demo payload', () => {
    expect(reportSchema.parse(demoReport)).toEqual(demoReport)
  })

  it('rejects a missing required field and unknown keys', () => {
    expect(() => reportSchema.parse({ ...demoReport, meta: { ...demoReport.meta, alertas: undefined } })).toThrow()
    expect(() => reportSchema.parse({ ...demoReport, extra: true })).toThrow()
  })
})
