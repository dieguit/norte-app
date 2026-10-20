import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  createSavingContributionInRepository,
  createSavingContributionPreviewToken,
  getSavingContributionState,
} from '../src/contributions/saving-contribution.repository';
import { schema } from '../src/database/schema';
import {
  goalInvestmentPositions,
  goalSavingsPositions,
  investmentContributionAllocations,
  investmentContributions,
  savingContributionAllocations,
  savingContributions,
  savingsPlaces,
} from '../src/profile/profile.schema';
import {
  createFailingInsertDb,
  seedProfileWithSingleGoal,
} from './support/rollback';

const databaseUrl = process.env.DATABASE_URL;
const safeDatabaseUrl =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safeDatabaseUrl)
  throw new Error(
    'Saving contribution rollback integration test only permits DATABASE_URL pathname norte_test',
  );

const describeWhenSafe = safeDatabaseUrl ? describe : describe.skip;

describeWhenSafe('saving contribution real database rollback', () => {
  const pool = new Pool({ connectionString: databaseUrl });

  afterAll(async () => pool.end());

  it('rolls back the real contribution, positions, and allocations after an allocation-write failure', async () => {
    const db = drizzle(pool, { schema });
    const userId = `contribution-${randomUUID()}`;
    const currentMonth = '2026-08';

    const rollback = new Error(
      'always rollback saving contribution integration fixtures',
    );
    await expect(
      db.transaction(async (outerTx) => {
        const { goal } = await seedProfileWithSingleGoal(
          outerTx,
          userId,
          currentMonth,
          {
            userId,
            name: 'Notebook',
            type: 'purchase',
            targetAmount: '5000.00',
            currency: 'ARS',
            priority: 'medium',
            strategy: 'save',
            status: 'active',
          },
        );
        const [place] = await outerTx
          .insert(savingsPlaces)
          .values({ userId, name: 'Banco', normalizedName: 'banco' })
          .returning({ id: savingsPlaces.id });

        const draft = {
          currency: 'ARS' as const,
          amount: '300.00',
          place: { kind: 'existing' as const, placeId: place.id },
        };
        const state = await getSavingContributionState(
          outerTx,
          userId,
          currentMonth,
        );
        const previewToken = createSavingContributionPreviewToken(
          state!,
          currentMonth,
          draft,
        );
        let allocationAttempted = false;

        const repositoryDb = createFailingInsertDb(
          outerTx,
          savingContributionAllocations,
          'injected saving contribution allocation-write failure',
          () => {
            allocationAttempted = true;
          },
        );

        await expect(
          createSavingContributionInRepository(repositoryDb, {
            userId,
            currentMonth,
            draft,
            previewToken,
          }),
        ).rejects.toThrow(
          'injected saving contribution allocation-write failure',
        );
        expect(allocationAttempted).toBe(true);

        const contributionsAfter = await outerTx
          .select({ id: savingContributions.id })
          .from(savingContributions)
          .where(eq(savingContributions.userId, userId));
        const positionsAfter = await outerTx
          .select({ id: goalSavingsPositions.id })
          .from(goalSavingsPositions)
          .where(eq(goalSavingsPositions.goalId, goal.id));
        const allocationsAfter = await outerTx
          .select({ id: savingContributionAllocations.id })
          .from(savingContributionAllocations)
          .where(eq(savingContributionAllocations.goalId, goal.id));
        expect(contributionsAfter).toEqual([]);
        expect(positionsAfter).toEqual([]);
        expect(allocationsAfter).toEqual([]);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
  it('rolls back the real investment contribution, position value, and allocations after an allocation-write failure', async () => {
    const db = drizzle(pool, { schema });
    const userId = `contribution-investment-${randomUUID()}`;
    const currentMonth = '2026-08';

    const rollback = new Error(
      'always rollback investment contribution integration fixtures',
    );
    await expect(
      db.transaction(async (outerTx) => {
        const { goal } = await seedProfileWithSingleGoal(
          outerTx,
          userId,
          currentMonth,
          {
            userId,
            name: 'Fondo',
            type: 'retirement',
            targetAmount: '9000.00',
            currency: 'ARS',
            priority: 'medium',
            strategy: 'invest',
            status: 'active',
          },
        );
        const [position] = await outerTx
          .insert(goalInvestmentPositions)
          .values({ goalId: goal.id, currentValue: '1000.00', currency: 'ARS' })
          .returning({ id: goalInvestmentPositions.id });

        const draft = {
          kind: 'investment' as const,
          currency: 'ARS' as const,
          amount: '200.00',
        };
        const state = await getSavingContributionState(
          outerTx,
          userId,
          currentMonth,
        );
        const previewToken = createSavingContributionPreviewToken(
          state!,
          currentMonth,
          draft,
        );
        let allocationAttempted = false;

        const repositoryDb = createFailingInsertDb(
          outerTx,
          investmentContributionAllocations,
          'injected investment allocation-write failure',
          () => {
            allocationAttempted = true;
          },
        );

        await expect(
          createSavingContributionInRepository(repositoryDb, {
            userId,
            currentMonth,
            draft,
            previewToken,
          }),
        ).rejects.toThrow('injected investment allocation-write failure');
        expect(allocationAttempted).toBe(true);

        const contributionsAfter = await outerTx
          .select({ id: investmentContributions.id })
          .from(investmentContributions)
          .where(eq(investmentContributions.userId, userId));
        const [positionAfter] = await outerTx
          .select({ currentValue: goalInvestmentPositions.currentValue })
          .from(goalInvestmentPositions)
          .where(eq(goalInvestmentPositions.id, position.id));
        expect(contributionsAfter).toEqual([]);
        expect(positionAfter.currentValue).toBe('1000.00');
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
