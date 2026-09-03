import { eq } from 'drizzle-orm'
import { db } from './client'
import { financialProfiles, type FinancialProfile } from './schema'

export async function withLockedFinancialProfile<T>(
  userId: string,
  callback: (
    tx: any,
    profile: Pick<FinancialProfile, 'userId' | 'plannedMonthlyContribution'>,
  ) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select({
        userId: financialProfiles.userId,
        plannedMonthlyContribution: financialProfiles.plannedMonthlyContribution,
      })
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId))
      .for('update')

    if (!profile) {
      throw new Error('Financial profile not found.')
    }

    return callback(tx, profile)
  })
}
