import { eq } from 'drizzle-orm';
import type { Transaction } from '../database/database.types';
import { financialProfiles } from './profile.schema';

export async function lockFinancialProfile(
  tx: Transaction,
  userId: string,
): Promise<{ userId: string; plannedMonthlyContribution: string | null }> {
  const [profile] = await tx
    .select({
      userId: financialProfiles.userId,
      plannedMonthlyContribution: financialProfiles.plannedMonthlyContribution,
    })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .for('update');
  if (!profile) throw new Error('Financial profile not found.');
  return profile;
}
