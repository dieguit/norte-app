import { beforeEach, describe, expect, it, vi } from "vitest";
import { mutateFinancialApi } from "./financial.server";
import {
  createExpenseServer,
  deleteExpenseServer,
  updateExpenseServer,
} from "./expenses.server";

vi.mock("./financial.server", () => ({
  mutateFinancialApi: vi.fn(),
}));

const expense = {
  id: "00000000-0000-4000-8000-000000000001",
  sourceKind: "housing",
  sourceId: null,
  concept: null,
  amount: "10.00",
  currency: "ARS",
  recurring: true,
  effectiveMonth: "2026-10-01",
  endMonth: null,
};

describe("expense API adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts existing create data and validates API response", async () => {
    vi.mocked(mutateFinancialApi).mockResolvedValue(
      new Response(JSON.stringify(expense), { status: 201 }),
    );
    await expect(
      createExpenseServer({
        data: { draft: {} as never, effectiveMonth: "2026-10" },
      }),
    ).resolves.toBeUndefined();
    expect(mutateFinancialApi).toHaveBeenCalledWith(
      "/expenses",
      "POST",
      { draft: {}, effectiveMonth: "2026-10" },
      "No se pudo guardar el gasto.",
    );
  });

  it("maps update/delete IDs and preserves selected month for deletion", async () => {
    vi.mocked(mutateFinancialApi)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(expense), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await updateExpenseServer({
      data: {
        expenseId: expense.id,
        draft: {} as never,
        effectiveMonth: "2026-10",
      },
    });
    await deleteExpenseServer({
      data: { expenseId: expense.id, effectiveMonth: "2026-10" },
    });
    expect(mutateFinancialApi).toHaveBeenNthCalledWith(
      1,
      `/expenses/${expense.id}`,
      "PATCH",
      { draft: {}, effectiveMonth: "2026-10" },
      "No se pudo guardar el gasto.",
    );
    expect(mutateFinancialApi).toHaveBeenNthCalledWith(
      2,
      `/expenses/${expense.id}`,
      "DELETE",
      { effectiveMonth: "2026-10" },
      "No se pudo guardar el gasto.",
    );
  });
});
