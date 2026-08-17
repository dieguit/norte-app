import { describe, expect, it } from 'vitest'
import { formatAdminDownloadLabel } from './download-label'

describe('formatAdminDownloadLabel', () => {
  it('formats card summary and post-close uploads', () => {
    expect(formatAdminDownloadLabel('t1_upload_url', 'Subir foto o archivo'))
      .toBe('Descargar Tarjeta 1 Resumen')
    expect(formatAdminDownloadLabel('t5_postcierre_upload', 'Otro texto'))
      .toBe('Descargar Tarjeta 5 Post-cierre')
  })

  it('keeps the onboarding label for an unrecognized upload ID', () => {
    expect(formatAdminDownloadLabel('documento_extra', 'Documento extra'))
      .toBe('Documento extra')
  })
})
