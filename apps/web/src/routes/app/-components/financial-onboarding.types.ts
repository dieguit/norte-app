import type { ExpenseDraft } from "../../../features/financial/expenses.schema";
import type { IncomeDraft } from "../../../features/financial/incomes.schema";

export type OnboardingStep = 1 | 2 | 3 | 4;

export type OnboardingIncome = {
  id: string;
  draft: IncomeDraft;
};

export type OnboardingExpense = {
  id: string;
  draft: ExpenseDraft;
};
