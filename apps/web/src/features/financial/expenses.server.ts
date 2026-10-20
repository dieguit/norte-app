import "@tanstack/react-start/server-only";
import { ExpenseMutationResponseSchema } from "@repo/shared-types";
import { callFinancialApi } from "./financial.server";
import type { ExpenseDraft } from "./expenses.schema";

async function mutate(path: string, method: string, body?: unknown) {
  const response = await callFinancialApi(path, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? "No se pudo guardar el gasto.");
  }
  return response;
}

export async function createExpenseServer({
  data,
}: {
  data: { draft: ExpenseDraft; effectiveMonth: string };
}) {
  const response = await mutate("/expenses", "POST", data);
  ExpenseMutationResponseSchema.parse(await response.json());
}

export async function updateExpenseServer({
  data,
}: {
  data: { expenseId: string; draft: ExpenseDraft; effectiveMonth: string };
}) {
  const { expenseId, ...body } = data;
  const response = await mutate(`/expenses/${expenseId}`, "PATCH", body);
  ExpenseMutationResponseSchema.parse(await response.json());
}

export async function deleteExpenseServer({
  data,
}: {
  data: { expenseId: string; effectiveMonth: string };
}) {
  await mutate(`/expenses/${data.expenseId}`, "DELETE", {
    effectiveMonth: data.effectiveMonth,
  });
}
