import { db } from '@/db/client'
import { onboardingDrafts } from '@/db/schema'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDraft, saveDraft } from './repository'

describe('onboarding server persistence', () => {
  beforeEach(async () => {
    await db.delete(onboardingDrafts)
  })

  it('saves and reads draft, and saving twice with one device ID leaves one row with the newer answers', async () => {
    const deviceId = '8f3192f1-689e-4b40-9a29-cfa090b8f6c4'
    
    // Save first draft
    await saveDraft({
      deviceId,
      answers: { incomeRange: 'Less than ARS 500,000' },
      completed: false,
    })

    // Save second draft updating answers
    await saveDraft({
      deviceId,
      answers: { incomeRange: '1000000-2000000', monthlyIncome: 1500000 },
      completed: false,
    })

    const draft = await getDraft(deviceId)
    expect(draft).toBeDefined()
    expect(draft?.deviceId).toBe(deviceId)
    expect(draft?.answers).toEqual({ incomeRange: '1000000-2000000', monthlyIncome: 1500000 })

    // Check that we only have one row in the table
    const allDrafts = await db.select().from(onboardingDrafts)
    expect(allDrafts).toHaveLength(1)
  })

  it('saving with completed: true sets a non-null completedAt', async () => {
    const deviceId = '9f3192f1-689e-4b40-9a29-cfa090b8f6c5'

    await saveDraft({
      deviceId,
      answers: { incomeRange: '1000000-2000000', monthlyIncome: 1500000 },
      completed: true,
    })

    const draft = await getDraft(deviceId)
    expect(draft).toBeDefined()
    expect(draft?.completedAt).toBeInstanceOf(Date)
  })

  it('saves database persistence coverage for a list', async () => {
    const deviceId = '7f3192f1-689e-4b40-9a29-cfa090b8f6c6'

    await saveDraft({
      deviceId,
      answers: { p5_fuentes: ['Sueldo fijo (relacion de dependencia)', 'Jubilacion / pension'] },
      completed: false,
    })

    expect((await getDraft(deviceId))?.answers).toEqual({
      p5_fuentes: ['Sueldo fijo (relacion de dependencia)', 'Jubilacion / pension'],
    })
  })
})
