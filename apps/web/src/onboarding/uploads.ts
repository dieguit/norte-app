import { z } from 'zod'

export const maxUploadBytes = 5 * 1024 * 1024
export const acceptedUploadTypes = ['application/pdf', 'image/jpeg', 'image/png'] as const

const fieldIdSchema = z.string().regex(/^t[1-5]_(upload_url|postcierre_upload)$/)

export const uploadRequestSchema = z.object({
  deviceId: z.uuid(),
  fieldId: fieldIdSchema,
  contentType: z.enum(acceptedUploadTypes),
  size: z.number().int().positive().max(maxUploadBytes),
})

export type UploadRequest = z.infer<typeof uploadRequestSchema>

export function parseUploadRequest(input: unknown): UploadRequest {
  return uploadRequestSchema.parse(input)
}

export function getFileValidationError(file: Pick<File, 'type' | 'size'>): string | null {
  if (!acceptedUploadTypes.includes(file.type as (typeof acceptedUploadTypes)[number])) {
    return 'Elegí un archivo PDF, JPEG o PNG.'
  }
  if (file.size > maxUploadBytes) return 'El archivo no puede superar 5 MB.'
  return null
}

export function createUploadKey(deviceId: string, fieldId: string): string {
  return `onboarding/${deviceId}/${fieldId}/${crypto.randomUUID()}`
}

export function isOwnedUploadKey(key: string, deviceId: string): boolean {
  return /^onboarding\/[0-9a-f-]+\/t[1-5]_(upload_url|postcierre_upload)\/[0-9a-f-]+$/i.test(key)
    && key.toLowerCase().startsWith(`onboarding/${deviceId.toLowerCase()}/`)
}

