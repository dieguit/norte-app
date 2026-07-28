import { onboardingSteps } from '../onboarding/definition'
import { isOwnedUploadKey } from '../onboarding/uploads'
import type { OnboardingDraft } from '@/db/schema'

// Flatten onboardingSteps fields to identify type === 'upload'
const uploadFields = onboardingSteps.flatMap(step =>
  step.fields.filter(field => field.type === 'upload')
)

export function toAdminResult(draft: Pick<OnboardingDraft, 'deviceId' | 'answers' | 'completedAt' | 'updatedAt' | 'report' | 'reportSentOn'>) {
  const name = typeof draft.answers?.nombre === 'string' ? draft.answers.nombre : null
  const contactMethod = draft.answers?.contacto_canal === 'WhatsApp' || draft.answers?.contacto_canal === 'Email'
    ? draft.answers.contacto_canal
    : null
  const contactValue = contactMethod === 'WhatsApp'
    ? typeof draft.answers?.whatsapp === 'string' ? draft.answers.whatsapp : null
    : contactMethod === 'Email' && typeof draft.answers?.email === 'string' ? draft.answers.email : null
  const status = draft.completedAt ? 'completed' : 'draft'
  return {
    deviceId: draft.deviceId,
    name,
    contactMethod,
    contactValue,
    status,
    updatedAt: draft.updatedAt,
    hasReport: Boolean(draft.report),
    reportSentOn: draft.reportSentOn,
  }
}

export function getUploadedFiles(
  draft: Pick<OnboardingDraft, 'deviceId' | 'answers'> | Record<string, any>
) {
  const deviceId = 'deviceId' in draft ? draft.deviceId : undefined
  const answers = 'answers' in draft ? draft.answers : draft

  const files: { fieldId: string; label: string; key: string }[] = []

  for (const field of uploadFields) {
    const value = answers?.[field.id]
    if (typeof value === 'string') {
      const finalDeviceId = deviceId || value.split('/')[1] || ''
      if (isOwnedUploadKey(value, finalDeviceId)) {
        files.push({
          fieldId: field.id,
          label: field.label,
          key: value,
        })
      }
    }
  }

  return files
}
