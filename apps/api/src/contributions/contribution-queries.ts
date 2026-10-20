import { eq } from 'drizzle-orm';
import type { Database } from '../database/database.types';
import {
  savingContributions,
  investmentContributions,
} from '../profile/profile.schema';

export async function findUserContributions(
  db: Database | any,
  userId: string,
) {
  return Promise.all([
    db.query.savingContributions.findMany({
      where: eq(savingContributions.userId, userId),
    }),
    db.query.investmentContributions.findMany({
      where: eq(investmentContributions.userId, userId),
    }),
  ]);
}
