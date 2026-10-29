import { createTool } from '@mastra/core/tools';
import BigNumber from 'bignumber.js';
import { getPreviousCalendarMonth } from '@repo/finance-utils';
import type { RoadmapMonth } from '@repo/shared-types';
import { z } from 'zod';
import type { NorteServices } from '../services';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

export function createRoadmapTools(
  { home, profile }: Pick<NorteServices, 'home' | 'profile'>,
  webAppUrl?: string,
) {
  return {
    getRoadmap: createTool({
      id: 'get-roadmap',
      description:
        'Current-month savings/investment targets (contributed vs target, missing), previous-month shortfalls eligible for catch-up, goal progress/projections/completion eligibility, and recent months. Use for "¿voy bien?", "¿cuánto me falta ahorrar este mes?", "¿cuándo llego?", or roadmap.',
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult('get-roadmap', context?.requestContext, async () => {
          const userId = requireUserId(context?.requestContext);
          const now = new Date();
          const [result, shortfalls] = await Promise.all([
            home.getHome(userId, now.toISOString().slice(0, 7)),
            profile.getPreviousMonthShortfalls(userId, now),
          ]);
          if ('profile' in result)
            return {
              ...result,
              appUrl: webAppUrl && `${webAppUrl}/onboarding`,
            };
          const { roadmap } = result;
          const currentMonth = roadmap.currentMonth.month;
          const goals = [
            ...new Map(
              [
                ...roadmap.historyMonths.flatMap((month) => month.objectives),
                ...roadmap.currentMonth.objectives,
                ...roadmap.futureMonths.flatMap((month) => month.objectives),
                ...roadmap.undatedObjectives,
              ].map((goal) => [goal.id, goal]),
            ).values(),
          ];
          const monthTargets = (['saving', 'investment'] as const).flatMap(
            (kind) =>
              (['ARS', 'USD'] as const).flatMap((currency) => {
                const target = goals
                  .filter(
                    (goal) =>
                      goal.status !== 'completed' &&
                      goal.strategy === (kind === 'saving' ? 'save' : 'invest'),
                  )
                  .reduce((total, goal) => {
                    const funding = goal.funding
                      .filter(
                        (row) => row.effectiveMonth.slice(0, 7) <= currentMonth,
                      )
                      .sort((a, b) =>
                        b.effectiveMonth.localeCompare(a.effectiveMonth),
                      )[0];
                    return funding?.allocatedDestinationAmount?.currency ===
                      currency
                      ? total.plus(funding.allocatedDestinationAmount.amount)
                      : total;
                  }, new BigNumber(0));
                if (!target.isGreaterThan(0)) return [];
                const contributed = roadmap.currentMonth.contributions
                  .filter(
                    (row) =>
                      row.kind === kind &&
                      row.currency === currency &&
                      new BigNumber(row.amount).isGreaterThan(0),
                  )
                  .reduce(
                    (total, row) => total.plus(row.amount),
                    new BigNumber(0),
                  );
                return [
                  {
                    kind,
                    currency,
                    target: target.toFixed(2),
                    contributed: contributed.toFixed(2),
                    missing: BigNumber.max(
                      target.minus(contributed),
                      0,
                    ).toFixed(2),
                  },
                ];
              }),
          );
          return {
            currentMonth,
            monthTargets,
            previousMonth: {
              month: getPreviousCalendarMonth(now),
              shortfalls: shortfalls.map(({ kind, currency, amount }) => ({
                kind,
                currency,
                amount: amount.amount,
              })),
            },
            goals: goals.map((goal) => ({
              id: goal.id,
              name: goal.name,
              status: goal.status,
              type: goal.type,
              strategy: goal.strategy,
              currency: goal.currency,
              actualValue: goal.actualValue,
              targetAmount: goal.targetAmount,
              progressPercentage: goal.progressPercentage,
              projection: goal.projection,
              desiredMonth: goal.desiredDate?.slice(0, 7),
              desiredDateDeltaMonths: goal.desiredDateDeltaMonths,
              completionEligible: goal.completionEligible,
            })),
            recentMonths: [...roadmap.historyMonths]
              .sort((a, b) => b.month.localeCompare(a.month))
              .slice(0, 3)
              .map((month) => ({
                month: month.month,
                contributed: sumContributions(month.contributions),
                completedGoals: month.objectives
                  .filter((goal) => goal.status === 'completed')
                  .map((goal) => goal.name),
              })),
            appUrl: webAppUrl && `${webAppUrl}/app`,
          };
        }),
    }),
  };
}

function sumContributions(contributions: RoadmapMonth['contributions']) {
  const totals = new Map<
    string,
    {
      kind: RoadmapMonth['contributions'][number]['kind'];
      currency: string;
      amount: BigNumber;
    }
  >();
  for (const row of contributions) {
    if (!new BigNumber(row.amount).isGreaterThan(0)) continue;
    const key = `${row.kind}:${row.currency}`;
    const existing = totals.get(key);
    totals.set(key, {
      kind: row.kind,
      currency: row.currency,
      amount: (existing?.amount ?? new BigNumber(0)).plus(row.amount),
    });
  }
  return [...totals.values()].map((row) => ({
    ...row,
    amount: row.amount.toFixed(2),
  }));
}
