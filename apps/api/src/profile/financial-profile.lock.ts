import { eq } from 'drizzle-orm';
import { financialProfiles } from './profile.schema';

export async function lockFinancialProfile(tx: any, userId: string): Promise<{ userId: string; plannedMonthlyContribution: string | null }> {
  const [profile] = await tx.select({ userId: financialProfiles.userId, plannedMonthlyContribution: financialProfiles.plannedMonthlyContribution })
    .from(financialProfiles).where(eq(financialProfiles.userId, userId)).for('update');
  if (!profile) throw new Error('Financial profile not found.');
  return profile;
}
