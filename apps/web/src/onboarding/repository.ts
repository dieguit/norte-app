import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { onboardingDrafts } from '@/db/schema'

export function getDraft(deviceId: string) {
  return db.query.onboardingDrafts.findFirst({
    where: eq(onboardingDrafts.deviceId, deviceId),
  })
}

export async function saveDraft(data: {
  deviceId: string
  answers: Record<string, string | number>
  completed: boolean
}) {
  const [draft] = await db.insert(onboardingDrafts).values({
    deviceId: data.deviceId,
    answers: data.answers,
    completedAt: data.completed ? new Date() : null,
  }).onConflictDoUpdate({
    target: onboardingDrafts.deviceId,
    set: {
      answers: data.answers,
      completedAt: data.completed ? new Date() : null,
      updatedAt: new Date(),
    },
  }).returning()

  return draft
}
