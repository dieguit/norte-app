import { and, eq } from 'drizzle-orm';
import type { Database, Transaction } from '../../src/database/database.types';
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
} from '../../src/profile/profile.schema';

export async function seedProfileWithTwoGoals(
  outerTx: Transaction,
  userId: string,
  currentMonth: string,
) {
  await outerTx.insert(financialProfiles).values({
    userId,
    baseCurrency: 'ARS',
    expensesKnowledge: 'known',
    plannedMonthlyContribution: '100.00',
    onboardingCompleted: true,
  });
  const [target, other] = await outerTx
    .insert(financialGoals)
    .values([
      {
        userId,
        name: 'Target',
        type: 'purchase',
        targetAmount: '500.00',
        currency: 'ARS',
        priority: 'medium',
        strategy: 'save',
        status: 'active',
      },
      {
        userId,
        name: 'Other',
        type: 'purchase',
        targetAmount: '500.00',
        currency: 'ARS',
        priority: 'medium',
        strategy: 'save',
        status: 'active',
      },
    ])
    .returning({ id: financialGoals.id });
  const [snapshot] = await outerTx
    .insert(allocationPlanSnapshots)
    .values({
      userId,
      effectiveMonth: `${currentMonth}-01`,
      plannedMonthlyContribution: '100.00',
    })
    .returning({ id: allocationPlanSnapshots.id });
  await outerTx.insert(allocationPlanEntries).values([
    { snapshotId: snapshot.id, goalId: target.id, percentage: '60.00' },
    { snapshotId: snapshot.id, goalId: other.id, percentage: '40.00' },
  ]);
  return { target, other, snapshot };
}

export async function seedProfileWithSingleGoal(
  outerTx: Transaction,
  userId: string,
  currentMonth: string,
  goalValues: typeof financialGoals.$inferInsert,
) {
  await outerTx.insert(financialProfiles).values({
    userId,
    baseCurrency: 'ARS',
    expensesKnowledge: 'known',
    plannedMonthlyContribution: '600.00',
    onboardingCompleted: true,
  });
  const [goal] = await outerTx
    .insert(financialGoals)
    .values(goalValues)
    .returning({ id: financialGoals.id });
  const [snapshot] = await outerTx
    .insert(allocationPlanSnapshots)
    .values({
      userId,
      effectiveMonth: `${currentMonth}-01`,
      plannedMonthlyContribution: '600.00',
    })
    .returning({ id: allocationPlanSnapshots.id });
  await outerTx
    .insert(allocationPlanEntries)
    .values({ snapshotId: snapshot.id, goalId: goal.id, percentage: '100.00' });
  return { goal, snapshot };
}

export async function selectGoalAndPlanState(
  outerTx: Transaction,
  goalId: string,
  userId: string,
  snapshotId: string,
) {
  const [goalAfter] = await outerTx
    .select({ status: financialGoals.status })
    .from(financialGoals)
    .where(
      and(eq(financialGoals.id, goalId), eq(financialGoals.userId, userId)),
    );
  const [snapshotAfter] = await outerTx
    .select({
      plannedMonthlyContribution:
        allocationPlanSnapshots.plannedMonthlyContribution,
    })
    .from(allocationPlanSnapshots)
    .where(eq(allocationPlanSnapshots.id, snapshotId));
  const planAfter = await outerTx
    .select({
      goalId: allocationPlanEntries.goalId,
      percentage: allocationPlanEntries.percentage,
    })
    .from(allocationPlanEntries)
    .where(eq(allocationPlanEntries.snapshotId, snapshotId));
  return { goalAfter, snapshotAfter, planAfter };
}

function createProxyDb(
  outerTx: Transaction,
  interceptor: (targetTx: Transaction, property: string | symbol) => unknown,
): Database {
  return {
    query: outerTx.query,
    transaction: (callback: (tx: Transaction) => Promise<unknown>) =>
      outerTx.transaction((tx) => {
        const executor = new Proxy(tx, {
          get(targetTx, property) {
            const custom = interceptor(targetTx, property);
            if (custom !== undefined) return custom;
            const value = Reflect.get(targetTx, property, targetTx) as unknown;
            return typeof value === 'function'
              ? (...args: unknown[]) =>
                  (value as (...a: unknown[]) => unknown).apply(
                    targetTx,
                    args,
                  ) as unknown
              : value;
          },
        });
        return callback(executor);
      }),
  } as unknown as Database;
}

function interceptGoalUpdate(
  targetTx: Transaction,
  table: unknown,
  onCommitted: () => void,
) {
  if (table !== financialGoals) {
    return (targetTx.update as (t: unknown) => unknown)(table);
  }
  const builder = targetTx.update(financialGoals);
  return {
    set: (values: Parameters<typeof builder.set>[0]) => {
      const query = builder.set(values);
      return {
        where: (condition: Parameters<typeof query.where>[0]) => {
          const chain = query.where(condition);
          return {
            then: (
              resolve?: (res: unknown) => unknown,
              reject?: (err: unknown) => unknown,
            ) =>
              chain.then((res) => {
                onCommitted();
                return resolve ? resolve(res) : res;
              }, reject),
            returning: async (
              fields?: Parameters<typeof chain.returning>[0],
            ) => {
              const rows = await (fields === undefined
                ? chain.returning()
                : chain.returning(fields as never));
              onCommitted();
              return rows;
            },
          };
        },
      };
    },
  };
}

export function createFailingInsertDb(
  outerTx: Transaction,
  failTable: unknown,
  errorMessage: string,
  onAttempt?: () => void,
): Database {
  return createProxyDb(outerTx, (targetTx, property) => {
    if (property === 'insert') {
      return (table: unknown) => {
        if (table === failTable) {
          return {
            values: () => {
              onAttempt?.();
              return Promise.reject(new Error(errorMessage));
            },
          };
        }
        return (targetTx.insert as (t: unknown) => unknown)(table);
      };
    }
  });
}

export function createGoalRollbackDb(
  outerTx: Transaction,
  onGoalUpdate: () => void,
  handleInsert: (table: unknown, targetTx: Transaction) => unknown,
): Database {
  return createProxyDb(outerTx, (targetTx, property) => {
    if (property === 'update') {
      return (table: unknown) =>
        interceptGoalUpdate(targetTx, table, onGoalUpdate);
    }
    if (property === 'insert') {
      return (table: unknown) => handleInsert(table, targetTx);
    }
  });
}
