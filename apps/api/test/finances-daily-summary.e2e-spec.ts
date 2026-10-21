import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { schema } from '../src/database/schema';
import { FinancesService } from '../src/finances/finances.service';
import {
  expenses,
  financialProfiles,
  incomes,
  investmentContributions,
  savingContributions,
  savingsPlaces,
} from '../src/profile/profile.schema';

const databaseUrl = process.env.DATABASE_URL;
const safe =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safe)
  throw new Error('Finances daily summary test only permits norte_test');
const describeWhenSafe = safe ? describe : describe.skip;

describeWhenSafe(
  'FinancesService.getMovementsInRange (isolation & boundaries)',
  () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool, { schema });
    const service = new FinancesService(db);
    const user = () => `user_${randomUUID()}`;

    afterAll(async () => pool.end());

    it('returns exactly userA at-from and just-before-to rows across all 4 movement types', async () => {
      const userA = user();
      const userB = user();

      const from = new Date('2026-10-21T03:00:00.000Z');
      const to = new Date('2026-10-22T03:00:00.000Z');

      const beforeFrom = new Date(from.getTime() - 1000);
      const atFrom = from;
      const justBeforeTo = new Date(to.getTime() - 1000);
      const atTo = to;
      const timestamps = [beforeFrom, atFrom, justBeforeTo, atTo];

      type Movements = {
        incomes: Record<string, string>;
        expenses: Record<string, string>;
        savingContributions: Record<string, string>;
        investmentContributions: Record<string, string>;
      };

      const setupUser = async (userId: string): Promise<Movements> => {
        await db.insert(financialProfiles).values({
          userId,
          expensesKnowledge: 'accurate',
          baseCurrency: 'ARS',
        });

        const [place] = await db
          .insert(savingsPlaces)
          .values({
            userId,
            name: `Bank ${userId}`,
            normalizedName: `bank-${userId}`,
          })
          .returning({ id: savingsPlaces.id });

        const moves: Movements = {
          incomes: {},
          expenses: {},
          savingContributions: {},
          investmentContributions: {},
        };

        for (const ts of timestamps) {
          const key = ts.toISOString();

          const [inc] = await db
            .insert(incomes)
            .values({
              userId,
              sourceKind: 'salary',
              concept: `Income ${key}`,
              amount: '1000.00',
              currency: 'ARS',
              recurring: false,
              effectiveMonth: '2026-10-01',
              createdAt: ts,
            })
            .returning({ id: incomes.id });
          moves.incomes[key] = inc.id;

          const [exp] = await db
            .insert(expenses)
            .values({
              userId,
              sourceKind: 'housing',
              concept: `Expense ${key}`,
              amount: '500.00',
              currency: 'ARS',
              recurring: false,
              effectiveMonth: '2026-10-01',
              createdAt: ts,
            })
            .returning({ id: expenses.id });
          moves.expenses[key] = exp.id;

          const [sav] = await db
            .insert(savingContributions)
            .values({
              userId,
              placeId: place.id,
              amount: '200.00',
              currency: 'ARS',
              createdAt: ts,
            })
            .returning({ id: savingContributions.id });
          moves.savingContributions[key] = sav.id;

          const [inv] = await db
            .insert(investmentContributions)
            .values({
              userId,
              amount: '300.00',
              currency: 'ARS',
              createdAt: ts,
            })
            .returning({ id: investmentContributions.id });
          moves.investmentContributions[key] = inv.id;
        }

        return moves;
      };

      const userAMoves = await setupUser(userA);
      await setupUser(userB);

      const result = await service.getMovementsInRange(userA, from, to);

      const expectedIncomeIds = [
        userAMoves.incomes[atFrom.toISOString()],
        userAMoves.incomes[justBeforeTo.toISOString()],
      ];
      const expectedExpenseIds = [
        userAMoves.expenses[atFrom.toISOString()],
        userAMoves.expenses[justBeforeTo.toISOString()],
      ];
      const expectedSavingIds = [
        userAMoves.savingContributions[atFrom.toISOString()],
        userAMoves.savingContributions[justBeforeTo.toISOString()],
      ];
      const expectedInvestmentIds = [
        userAMoves.investmentContributions[atFrom.toISOString()],
        userAMoves.investmentContributions[justBeforeTo.toISOString()],
      ];

      expect(result.incomes.map((i) => i.id).sort()).toEqual(
        expectedIncomeIds.sort(),
      );
      expect(result.expenses.map((e) => e.id).sort()).toEqual(
        expectedExpenseIds.sort(),
      );

      const actualSavingIds = result.contributions
        .filter((c) => c.kind === 'saving')
        .map((c) => c.id);
      expect(actualSavingIds.sort()).toEqual(expectedSavingIds.sort());

      const actualInvestmentIds = result.contributions
        .filter((c) => c.kind === 'investment')
        .map((c) => c.id);
      expect(actualInvestmentIds.sort()).toEqual(expectedInvestmentIds.sort());
    });
  },
);
