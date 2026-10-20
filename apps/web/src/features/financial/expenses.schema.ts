import { z } from "zod";
import { ExpenseDraftSchema } from "@repo/shared-types";

const expenseDraftSchema = ExpenseDraftSchema;
export const createExpenseSchema = z.object({
  draft: expenseDraftSchema,
  effectiveMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ingresá un mes válido."),
});
export const updateExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  draft: expenseDraftSchema,
  effectiveMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ingresá un mes válido."),
});
export const deleteExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  effectiveMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Ingresá un mes válido."),
});

export type ExpenseDraft = z.output<typeof expenseDraftSchema>;
type ExpenseDraftSchemaInput = z.input<typeof expenseDraftSchema>;
export type ExpenseDraftInput = Omit<ExpenseDraftSchemaInput, "source"> & {
  source?: ExpenseDraftSchemaInput["source"];
};
