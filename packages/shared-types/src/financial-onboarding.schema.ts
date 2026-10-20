import { z } from "zod";
import { ExpenseDraftSchema } from "./expense.schema";
import { IncomeDraftSchema } from "./income.schema";
import { GoalCreationDraftWireSchema } from "./goals.schema";

const percentageSchema = z.string().refine((value) => {
  const normalized = value.replace(",", ".");
  return /^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(normalized) && Number(normalized) <= 100;
}, "Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.");

const onboardingGoalSchema = GoalCreationDraftWireSchema.extend({
  name: z.string().trim().min(1, "Ingresá un nombre.").max(120, "Usá hasta 120 caracteres."),
  allocations: z.array(
    z.object({ goalId: z.string().min(1), percentage: percentageSchema }).strict(),
  ),
});

export const FinancialOnboardingSchema = z
  .object({
    goal: onboardingGoalSchema,
    incomes: z
      .array(IncomeDraftSchema)
      .min(1, "Agregá al menos un ingreso recurrente."),
    expenses: z
      .array(ExpenseDraftSchema)
      .min(1, "Agregá al menos un gasto recurrente."),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.incomes.some((income) => !income.recurring)) {
      context.addIssue({
        code: "custom",
        path: ["incomes"],
        message: "Los ingresos deben ser recurrentes.",
      });
    }
    if (input.expenses.some((expense) => !expense.recurring)) {
      context.addIssue({
        code: "custom",
        path: ["expenses"],
        message: "Los gastos deben ser recurrentes.",
      });
    }
  });

export const FinancialOnboardingResponseSchema = z
  .object({ created: z.boolean() })
  .strict();

export type FinancialOnboardingInput = z.infer<typeof FinancialOnboardingSchema>;
