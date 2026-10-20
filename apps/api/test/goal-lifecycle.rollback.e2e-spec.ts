import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  confirmGoalLifecycleInRepository,
  createGoalLifecyclePreviewToken,
  getGoalLifecycleState,
} from '../src/goals/goal-creation.repository';
import { schema } from '../src/database/schema';
import { allocationPlanEntries } from '../src/profile/profile.schema';
import {
  createGoalRollbackDb,
  seedProfileWithTwoGoals,
  selectGoalAndPlanState,
} from './support/rollback';

const databaseUrl = process.env.DATABASE_URL;
const safeDatabaseUrl =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safeDatabaseUrl)
  throw new Error(
    'Lifecycle rollback integration test only permits DATABASE_URL pathname norte_test',
  );

const describeWhenSafe = safeDatabaseUrl ? describe : describe.skip;

describeWhenSafe('goal lifecycle real database rollback', () => {
  const pool = new Pool({ connectionString: databaseUrl });

  afterAll(async () => pool.end());

  it('rolls back the real goal status and plan rows after a plan-write failure', async () => {
    const db = drizzle(pool, { schema });
    const userId = `task10-${randomUUID()}`;
    const currentMonth = '2026-08';

    const rollback = new Error(
      'always rollback lifecycle integration fixtures',
    );
    await expect(
      db.transaction(async (outerTx) => {
        const { target, other, snapshot } = await seedProfileWithTwoGoals(
          outerTx,
          userId,
          currentMonth,
        );

        const state = await getGoalLifecycleState(
          outerTx,
          userId,
          currentMonth,
        );
        const previewToken = createGoalLifecyclePreviewToken(
          'pause',
          target.id,
          state!,
          currentMonth,
        );
        let goalUpdateCommittedInSavepoint = false;

        const repositoryDb = createGoalRollbackDb(
          outerTx,
          () => {
            goalUpdateCommittedInSavepoint = true;
          },
          (table, targetTx) => {
            if (table === allocationPlanEntries) {
              return {
                values: () => {
                  expect(goalUpdateCommittedInSavepoint).toBe(true);
                  return Promise.reject(
                    new Error('injected lifecycle plan-write failure'),
                  );
                },
              };
            }
            return (targetTx.insert as (t: unknown) => unknown)(table);
          },
        );

        await expect(
          confirmGoalLifecycleInRepository(repositoryDb, {
            userId,
            goalId: target.id,
            lifecycle: 'pause',
            currentMonth,
            previewToken,
          }),
        ).rejects.toThrow('injected lifecycle plan-write failure');
        expect(goalUpdateCommittedInSavepoint).toBe(true);

        const { goalAfter, snapshotAfter, planAfter } =
          await selectGoalAndPlanState(outerTx, target.id, userId, snapshot.id);
        expect(goalAfter.status).toBe('active');
        expect(snapshotAfter.plannedMonthlyContribution).toBe('100.00');
        expect(planAfter).toHaveLength(2);
        expect(planAfter).toEqual(
          expect.arrayContaining([
            { goalId: target.id, percentage: '60.00' },
            { goalId: other.id, percentage: '40.00' },
          ]),
        );
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
