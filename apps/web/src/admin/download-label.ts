export function formatAdminDownloadLabel(fieldId: string, fallbackLabel: string) {
  const match = /^t([1-5])_(upload_url|postcierre_upload)$/.exec(fieldId)
  if (!match) return fallbackLabel

  const [, card, type] = match
  return `Descargar Tarjeta ${card} ${type === 'upload_url' ? 'Resumen' : 'Post-cierre'}`
}
