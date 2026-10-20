import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { ExpensesService } from '../src/expenses/expenses.service';
import { FinancialOnboardingService } from '../src/financial-onboarding/financial-onboarding.service';
import { IncomesService } from '../src/incomes/incomes.service';
import { schema } from '../src/database/schema';
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  expenses,
  financialGoals,
  financialProfiles,
  incomes,
} from '../src/profile/profile.schema';
import { createFailingInsertDb } from './support/rollback';

const databaseUrl = process.env.DATABASE_URL;
const safeDatabaseUrl =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safeDatabaseUrl)
  throw new Error(
    'Onboarding rollback integration test only permits DATABASE_URL pathname norte_test',
  );

const describeWhenSafe = safeDatabaseUrl ? describe : describe.skip;

describeWhenSafe('financial onboarding real database rollback', () => {
  const pool = new Pool({ connectionString: databaseUrl });

  afterAll(async () => pool.end());

  it('rolls back profile, income, goal, snapshot, and expense rows after a late plan-write failure', async () => {
    const db = drizzle(pool, { schema });
    const userId = `onboarding-${randomUUID()}`;
    const rollback = new Error(
      'always rollback onboarding integration fixtures',
    );

    await expect(
      db.transaction(async (outerTx) => {
        const repositoryDb = createFailingInsertDb(
          outerTx,
          allocationPlanEntries,
          'injected onboarding plan-write failure',
        );
        const service = new FinancialOnboardingService(
          repositoryDb,
          new IncomesService(repositoryDb),
          new ExpensesService(repositoryDb),
        );

        await expect(
          service.complete(userId, {
            goal: {
              type: 'purchase',
              name: 'Auto nuevo',
              targetAmount: '500000.00',
              currency: 'ARS',
              desiredMonth: '',
              priority: 'high',
              strategy: 'invest',
              annualReturnRate: '8.000',
              availability: 'available_now',
              availableFromMonth: '',
              allocations: [],
            },
            incomes: [
              {
                source: { kind: 'salary' },
                concept: null,
                amount: '1500000',
                currency: 'ARS',
                recurring: true,
                effectiveMonth: '2026-08',
              },
            ],
            expenses: [
              {
                source: { kind: 'housing' },
                concept: null,
                amount: '600000',
                currency: 'ARS',
                recurring: true,
              },
            ],
          }),
        ).rejects.toThrow('injected onboarding plan-write failure');

        expect(
          await outerTx
            .select({ userId: financialProfiles.userId })
            .from(financialProfiles)
            .where(eq(financialProfiles.userId, userId)),
        ).toEqual([]);
        expect(
          await outerTx
            .select({ id: incomes.id })
            .from(incomes)
            .where(eq(incomes.userId, userId)),
        ).toEqual([]);
        expect(
          await outerTx
            .select({ id: expenses.id })
            .from(expenses)
            .where(eq(expenses.userId, userId)),
        ).toEqual([]);
        expect(
          await outerTx
            .select({ id: financialGoals.id })
            .from(financialGoals)
            .where(eq(financialGoals.userId, userId)),
        ).toEqual([]);
        expect(
          await outerTx
            .select({ id: allocationPlanSnapshots.id })
            .from(allocationPlanSnapshots)
            .where(eq(allocationPlanSnapshots.userId, userId)),
        ).toEqual([]);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
