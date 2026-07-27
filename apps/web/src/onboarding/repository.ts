import { eq, desc, and, isNotNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { onboardingDrafts } from '@/db/schema'
import type { OnboardingAnswers } from './definition'
import type { Report } from '../admin/report'

export function getDraft(deviceId: string) {
  return db.query.onboardingDrafts.findFirst({
    where: eq(onboardingDrafts.deviceId, deviceId),
  })
}

export async function saveDraft(data: {
  deviceId: string
  answers: OnboardingAnswers
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

export function listDrafts() {
  return db.select().from(onboardingDrafts).orderBy(desc(onboardingDrafts.updatedAt))
}

export async function saveDraftReport(deviceId: string, report: Report) {
  const [draft] = await db.update(onboardingDrafts)
    .set({ report, updatedAt: new Date() })
    .where(eq(onboardingDrafts.deviceId, deviceId))
    .returning()
  return draft
}

export async function setDraftReportSentOn(deviceId: string, sent: boolean) {
  const [draft] = await db.update(onboardingDrafts)
    .set({ reportSentOn: sent ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(onboardingDrafts.deviceId, deviceId), isNotNull(onboardingDrafts.report)))
    .returning()
  return draft
}
