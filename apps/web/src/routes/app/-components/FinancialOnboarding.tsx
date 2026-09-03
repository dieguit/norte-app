import { useFinancialOnboarding } from "./useFinancialOnboarding";
import {
  ExpenseStep,
  IncomeStep,
  ObjectiveStep,
  OnboardingProgress,
  WelcomeStep,
} from "./FinancialOnboardingSteps";

export function FinancialOnboarding() {
  const state = useFinancialOnboarding();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-4 pb-28 sm:px-6 sm:py-12 sm:pb-24">
      <OnboardingProgress step={state.step} />
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        {state.step === 1 && (
          <WelcomeStep onContinue={() => state.setStep(2)} />
        )}
        {state.step === 2 && (
          <ObjectiveStep
            form={state.objectiveForm}
            context={state.objectiveContext}
            validationErrors={state.validationErrors}
            onBack={() => state.setStep(1)}
            onContinue={state.continueFromObjective}
          />
        )}
        {state.step === 3 && (
          <IncomeStep
            currentMonth={state.currentMonth}
            drafts={state.incomes.drafts}
            editingDraft={state.incomes.editingDraft?.draft}
            sheetOpen={state.incomes.sheetOpen}
            total={state.incomeTotal.amount}
            onNew={state.incomes.openNew}
            onEdit={state.incomes.openEdit}
            onRemove={state.incomes.remove}
            onSheetChange={state.incomes.onOpenChange}
            onSave={state.incomes.save}
            onBack={() => state.setStep(2)}
            onContinue={() => state.setStep(4)}
          />
        )}
        {state.step === 4 && (
          <ExpenseStep
            currentMonth={state.currentMonth}
            drafts={state.expenses.drafts}
            editingDraft={state.expenses.editingDraft?.draft}
            sheetOpen={state.expenses.sheetOpen}
            total={state.expenseTotal.amount}
            submissionError={state.submissionError}
            isSubmitting={state.isSubmitting}
            onNew={state.expenses.openNew}
            onEdit={state.expenses.openEdit}
            onRemove={state.expenses.remove}
            onSheetChange={state.expenses.onOpenChange}
            onSave={state.expenses.save}
            onBack={() => state.setStep(3)}
            onSubmit={state.submit}
          />
        )}
      </div>
    </div>
  );
}
