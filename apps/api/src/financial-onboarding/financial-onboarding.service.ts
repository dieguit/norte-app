import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ZodError } from 'zod';
import { FinancialOnboardingSchema, parseGoalCreationSubmission } from '@repo/shared-types';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { ExpensesService } from '../expenses/expenses.service';
import { IncomesService } from '../incomes/incomes.service';
import { normalizeMoneyAmount } from '../money';
import {
  deriveEmergencyFundTarget,
  parseMoneyInput,
} from '@repo/finance-utils';
import {
  getGoalContributionArs,
  getMonthlyFinancialSummary,
} from '../finances/goals.financial';
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
} from '../profile/profile.schema';

type GoalDraft = ReturnType<typeof parseGoalCreationSubmission>;

function firstIssue<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    throw new BadRequestException(
      error instanceof ZodError
        ? error.issues[0]?.message ?? 'Datos inválidos.'
        : 'Datos inválidos.',
    );
  }
}

function getDesiredDate(desiredMonth: string) {
  return desiredMonth && desiredMonth.trim() !== ''
    ? `${desiredMonth.slice(0, 7)}-01`
    : null;
}

function getAvailableFromDate(availability: string, availableFromMonth: string) {
  return availability === 'available_from' && availableFromMonth
    ? `${availableFromMonth.slice(0, 7)}-01`
    : null;
}

function getGoalValues(
  userId: string,
  goal: GoalDraft,
  targetAmount: { amount: string } | undefined,
) {
  return {
    userId,
    name: goal.name.trim(),
    type: goal.type,
    targetAmount: targetAmount?.amount ?? null,
    currency: goal.currency,
    priority: goal.priority,
    strategy: goal.strategy,
    status: 'active' as const,
    desiredDate: getDesiredDate(goal.desiredMonth),
    emergencyFundMonths: goal.type === 'emergency_fund' ? 3 : null,
  };
}

@Injectable()
export class FinancialOnboardingService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly incomes: IncomesService,
    private readonly expenses: ExpensesService,
  ) {}

  async complete(userId: string, body: unknown) {
    const input = firstIssue(() => FinancialOnboardingSchema.parse(body));
    const currentMonth = new Date().toISOString().slice(0, 7);
    const effectiveMonth = `${currentMonth}-01`;
    const goal = firstIssue(() =>
      parseGoalCreationSubmission(input.goal, currentMonth),
    );
    const summary = getMonthlyFinancialSummary(
      {
        incomes: input.incomes.map((income) => ({
          amount: normalizeMoneyAmount(income.amount),
          currency: income.currency,
          recurring: income.recurring,
          effectiveMonth,
        })),
        expenses: input.expenses.map((expense) => ({
          amount: normalizeMoneyAmount(expense.amount),
          currency: expense.currency,
          recurring: expense.recurring,
          effectiveMonth,
          endMonth: null,
        })),
      },
      currentMonth,
    );
    const plannedMonthlyContribution = getGoalContributionArs(summary.balance, '90.00');
    const targetAmount =
      goal.type === 'emergency_fund'
        ? deriveEmergencyFundTarget(summary.expenses, 3)
        : goal.targetAmount
          ? parseMoneyInput(goal.targetAmount, goal.currency) ?? undefined
          : undefined;

    return this.db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(financialProfiles)
        .values({
          userId,
          baseCurrency: 'ARS',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: plannedMonthlyContribution.amount,
          goalDedicationPercentage: '90.00',
          onboardingCompleted: true,
        })
        .onConflictDoNothing()
        .returning();
      if (!profile) return { created: false };

      for (const income of input.incomes) {
        await this.incomes.insert(tx, userId, income, currentMonth);
      }
      for (const expense of input.expenses) {
        await this.expenses.insert(tx, userId, expense, currentMonth);
      }

      const [created] = await tx
        .insert(financialGoals)
        .values(getGoalValues(userId, goal, targetAmount))
        .returning({ id: financialGoals.id });

      if (goal.strategy === 'invest') {
        await tx.insert(goalInvestmentPositions).values({
          goalId: created.id,
          currentValue: '0.00',
          currency: goal.currency,
          annualReturnRate: goal.annualReturnRate || '8.000',
          availability: goal.availability || 'available_now',
          availableFrom: getAvailableFromDate(goal.availability, goal.availableFromMonth),
        });
      }

      const [snapshot] = await tx
        .insert(allocationPlanSnapshots)
        .values({
          userId,
          effectiveMonth,
          plannedMonthlyContribution: plannedMonthlyContribution.amount,
        })
        .returning({ id: allocationPlanSnapshots.id });

      await tx.insert(allocationPlanEntries).values({
        snapshotId: snapshot.id,
        goalId: created.id,
        percentage: '100.00',
      });
      return { created: true };
    });
  }
}
