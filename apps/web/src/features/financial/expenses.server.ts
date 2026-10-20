import "@tanstack/react-start/server-only";
import { ExpenseMutationResponseSchema } from "@repo/shared-types";
import { mutateFinancialApi } from "./financial.server";
import type { ExpenseDraft } from "./expenses.schema";

export async function createExpenseServer({
  data,
}: {
  data: { draft: ExpenseDraft; effectiveMonth: string };
}) {
  const response = await mutateFinancialApi(
    "/expenses",
    "POST",
    data,
    "No se pudo guardar el gasto.",
  );
  ExpenseMutationResponseSchema.parse(await response.json());
}

export async function updateExpenseServer({
  data,
}: {
  data: { expenseId: string; draft: ExpenseDraft; effectiveMonth: string };
}) {
  const { expenseId, ...body } = data;
  const response = await mutateFinancialApi(
    `/expenses/${expenseId}`,
    "PATCH",
    body,
    "No se pudo guardar el gasto.",
  );
  ExpenseMutationResponseSchema.parse(await response.json());
}

export async function deleteExpenseServer({
  data,
}: {
  data: { expenseId: string; effectiveMonth: string };
}) {
  await mutateFinancialApi(
    `/expenses/${data.expenseId}`,
    "DELETE",
    {
      effectiveMonth: data.effectiveMonth,
    },
    "No se pudo guardar el gasto.",
  );
}
