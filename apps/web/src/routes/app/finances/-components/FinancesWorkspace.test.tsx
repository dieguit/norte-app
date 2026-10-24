// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFinancesWorkspace } from "../../../../features/financial/financial.functions";
import { FinancesWorkspace, type FinancesView } from "./FinancesWorkspace";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: { to: string; children: React.ReactNode } & React.ComponentProps<"a">) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock("../../../../features/financial/financial.functions", () => ({
  createExpense: vi.fn(),
  deleteExpense: vi.fn(),
  updateExpense: vi.fn(),
  createIncome: vi.fn(),
  deleteIncome: vi.fn(),
  updateIncome: vi.fn(),
  getFinancesWorkspace: vi.fn(),
}));

afterEach(cleanup);
beforeEach(() => {
  vi.mocked(getFinancesWorkspace).mockImplementation((options: any) => Promise.resolve({
    ...sampleWorkspace,
    month: options.data.month,
    summary: options.data.month === "2026-07" ? {
      income: { amount: "600000.00", currency: "ARS" }, expenses: { amount: "250000.00", currency: "ARS" },
      balance: { amount: "350000.00", currency: "ARS" }, contribution: { amount: "315000.00", currency: "ARS" },
    } : sampleWorkspace.summary,
  } as never) as never);
});

const sampleWorkspace = {
  goalDedicationPercentage: "90",
  month: "2026-08",
  summary: {
    income: { amount: "700000.00", currency: "ARS" as const },
    expenses: { amount: "500000.00", currency: "ARS" as const },
    balance: { amount: "200000.00", currency: "ARS" as const },
    contribution: { amount: "180000.00", currency: "ARS" as const },
  },
  savings: {
    places: [
      {
        id: "bank",
        name: "Banco Nación",
        balances: { ARS: "125000.00", USD: "2345.67" },
        hasMovements: true,
      },
    ],
    movements: [],
  },
  incomes: {
    sources: [],
    incomes: [
      {
        id: "income_1",
        sourceKind: "salary",
        sourceId: null,
        sourceName: "salary",
        concept: "Sueldo mensual",
        amount: "600000.00",
        currency: "ARS" as const,
        recurring: true,
        effectiveMonth: "2026-01-01",
        arsEquivalent: null,
      },
      {
        id: "income_bonus",
        sourceKind: "custom",
        sourceId: null,
        sourceName: "Bono",
        concept: null,
        amount: "100000.00",
        currency: "ARS" as const,
        recurring: false,
        effectiveMonth: "2026-08-01",
        arsEquivalent: null,
      },
    ],
  },
  expenses: {
    sources: [{ id: "src_flight", name: "Vuelo", normalizedName: "vuelo" }],
    expenses: [
      {
        id: "exp_housing",
        sourceKind: "housing",
        sourceId: null,
        sourceName: "housing",
        concept: "Alquiler mensual",
        amount: "200000.00",
        currency: "ARS" as const,
        recurring: true,
        effectiveMonth: "2026-06-01",
        endMonth: null,
        arsEquivalent: null,
      },
      {
        id: "exp_utilities_closed",
        sourceKind: "utilities",
        sourceId: null,
        sourceName: "utilities",
        concept: null,
        amount: "50000.00",
        currency: "ARS" as const,
        recurring: true,
        effectiveMonth: "2026-01-01",
        endMonth: "2026-08-01",
        arsEquivalent: null,
      },
      {
        id: "exp_flight_usd",
        sourceKind: "custom",
        sourceId: "src_flight",
        sourceName: "Vuelo",
        concept: "Pasaje aéreo",
        amount: "200.00",
        currency: "USD" as const,
        recurring: false,
        effectiveMonth: "2026-08-01",
        endMonth: null,
        arsEquivalent: "300000.00",
      },
    ],
  },
};

const ars = (amount: string) => ({ amount, currency: "ARS" as const });

const emptyWorkspace = {
  goalDedicationPercentage: "90",
  month: "2026-08",
  summary: { income: ars("0.00"), expenses: ars("0.00"), balance: ars("0.00"), contribution: ars("0.00") },
  savings: { places: [], movements: [] },
  incomes: { sources: [], incomes: [] },
  expenses: { sources: [], expenses: [] },
};

type Workspace = React.ComponentProps<typeof FinancesWorkspace>["workspace"];

const ui = (view: FinancesView, workspace: Workspace = sampleWorkspace) => (
  <FinancesWorkspace workspace={workspace} initialMonth="2026-08" view={view} />
);

const legendValue = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;

describe("FinancesWorkspace", () => {
  describe("summary", () => {
    it("renders the month summary with flow, goals note and section links", () => {
      render(ui("summary"));

      expect(screen.getByRole("heading", { level: 1, name: "Agosto 2026" })).toBeInTheDocument();
      const summary = screen.getByRole("region", { name: "Resumen del mes" });
      expect(summary).toHaveTextContent("$ 200.000,00");
      expect(summary).toHaveTextContent("Disponible este mes");
      expect(legendValue("Gastos")).toHaveTextContent("$ 500.000,00");
      expect(legendValue("Objetivos 90%")).toHaveTextContent("$ 180.000,00");
      expect(legendValue("Queda")).toHaveTextContent("$ 20.000,00");
      expect(screen.getByText("90% de lo libre va a tus objetivos")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Planificar" })).toHaveAttribute("href", "/app/goals");

      const incomes = screen.getByRole("link", { name: /^Ingresos/ });
      expect(incomes).toHaveAttribute("href", "/app/finances/incomes");
      expect(incomes).toHaveTextContent("2 fuentes · 1 recurrente");
      expect(incomes).toHaveTextContent("$ 700.000,00");
      const expenses = screen.getByRole("link", { name: /^Gastos/ });
      expect(expenses).toHaveAttribute("href", "/app/finances/expenses");
      expect(expenses).toHaveTextContent("2 movimientos · 2 categorías");
      expect(expenses).toHaveTextContent("$ 500.000,00");
      const savings = screen.getByRole("link", { name: /^Ahorros/ });
      expect(savings).toHaveAttribute("href", "/app/finances/savings");
      expect(savings).toHaveTextContent("1 lugar");
      expect(savings).toHaveTextContent("$ 125.000,00");
      expect(savings).toHaveTextContent("US$ 2.345,67");
    });

    it("shows the overspent variant when expenses exceed income", () => {
      render(ui("summary", {
        ...emptyWorkspace,
        summary: { income: ars("100000.00"), expenses: ars("130000.00"), balance: ars("-30000.00"), contribution: ars("0.00") },
      }));

      expect(screen.getByRole("region", { name: "Resumen del mes" })).toHaveTextContent("−$ 30.000,00");
      expect(legendValue("Excedido")).toHaveTextContent("$ 30.000,00");
      expect(legendValue("Excedido")).not.toHaveTextContent("−");
      expect(legendValue("Objetivos")).toHaveTextContent("—");
      expect(screen.queryByText("Queda")).not.toBeInTheDocument();
      expect(screen.getByText("Sin margen para objetivos este mes")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^Ingresos/ })).toHaveTextContent("Sin ingresos este mes");
    });

    it("keeps the goals link available when the selected month has no balance", () => {
      render(ui("summary", emptyWorkspace));

      expect(screen.getByText("Sin margen para objetivos este mes")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Planificar" })).toHaveAttribute("href", "/app/goals");
      expect(screen.getByRole("region", { name: "Resumen del mes" })).toHaveTextContent("—");
      expect(screen.getByRole("link", { name: /^Gastos/ })).toHaveTextContent("Sin gastos este mes");
    });

    it("shows USD-only savings without an empty ARS amount", () => {
      render(ui("summary", {
        ...emptyWorkspace,
        savings: { places: [{ id: "cash", name: "Efectivo", balances: { ARS: "0.00", USD: "500.00" }, hasMovements: false }], movements: [] },
      }));

      const savings = screen.getByRole("link", { name: /^Ahorros/ });
      expect(savings).toHaveTextContent("US$ 500,00");
      expect(savings).not.toHaveTextContent("—");
    });

    it("opens the expense sheet from the floating add button", async () => {
      const user = userEvent.setup();
      render(ui("summary"));

      await user.click(screen.getByRole("button", { name: "Agregar gasto" }));

      expect(screen.getByRole("heading", { name: "Nuevo gasto" })).toBeInTheDocument();
    });
  });

  describe("month switching", () => {
    it("updates summary totals and list entries when switching months", async () => {
      const user = userEvent.setup();
      const { rerender } = render(ui("summary"));

      await user.click(screen.getByRole("button", { name: "Mes anterior" }));

      expect(await screen.findByRole("region", { name: "Resumen del mes" })).toHaveTextContent("$ 350.000,00");
      expect(screen.getByRole("heading", { level: 1, name: "Julio 2026" })).toBeInTheDocument();
      expect(legendValue("Gastos")).toHaveTextContent("$ 250.000,00");
      expect(legendValue("Objetivos 90%")).toHaveTextContent("$ 315.000,00");
      expect(screen.getByRole("link", { name: /^Ingresos/ })).toHaveTextContent("$ 600.000,00");

      rerender(ui("expenses"));

      const recurringSection = screen.getByLabelText("Gastos recurrentes");
      expect(within(recurringSection).getByText("Alquiler / vivienda")).toBeInTheDocument();
      expect(within(recurringSection).getByText("Servicios")).toBeInTheDocument();
      expect(within(recurringSection).getByText("$ 50.000,00")).toBeInTheDocument();
      const oneOffSection = screen.getByLabelText("Gastos únicos");
      expect(within(oneOffSection).getByText("No tenés gastos únicos para este mes.")).toBeInTheDocument();
      expect(within(oneOffSection).queryByText("Vuelo")).not.toBeInTheDocument();
    });

    it("keeps savings balances independent of the selected month and restores monthly context", async () => {
      const user = userEvent.setup();
      const { rerender } = render(ui("summary"));

      await user.click(screen.getByRole("button", { name: "Agosto 2026" }));
      await user.click(screen.getByRole("button", { name: "Jul" }));
      expect(screen.getByRole("heading", { level: 1, name: "Julio 2026" })).toBeInTheDocument();

      rerender(ui("savings"));
      expect(await screen.findByText("$ 125.000,00 · US$ 2.345,67")).toBeInTheDocument();
      expect(screen.queryByRole("group", { name: "Mes de finanzas" })).not.toBeInTheDocument();

      rerender(ui("expenses"));
      expect(screen.getByRole("group", { name: "Mes de finanzas" })).toHaveTextContent("Jul 2026");
      expect(screen.getByRole("heading", { name: "Gastos de Julio de 2026" })).toBeInTheDocument();
    });

    it("shows a visible error and no stale summary when the selected month request fails", async () => {
      const user = userEvent.setup();
      vi.mocked(getFinancesWorkspace).mockRejectedValueOnce(new Error("offline"));
      render(ui("summary"));

      await user.click(screen.getByRole("button", { name: "Mes anterior" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar las finanzas de este mes.");
      expect(screen.queryByRole("region", { name: "Resumen del mes" })).not.toBeInTheDocument();
    });

    it("hides previously loaded month data after failed router revalidation and recovers on a new month", async () => {
      const user = userEvent.setup();
      const { rerender } = render(ui("summary"));
      await user.click(screen.getByRole("button", { name: "Mes anterior" }));
      await waitFor(() => expect(screen.getByRole("link", { name: /^Ingresos/ })).toHaveTextContent("$ 600.000,00"));
      rerender(ui("savings"));
      expect(screen.getByText("Banco Nación")).toBeInTheDocument();

      vi.mocked(getFinancesWorkspace).mockRejectedValueOnce(new Error("offline"));
      const revalidated = { ...sampleWorkspace };
      rerender(ui("savings", revalidated));
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText("Banco Nación")).not.toBeInTheDocument();
      rerender(ui("incomes", revalidated));
      expect(screen.queryByText("Sueldo mensual")).not.toBeInTheDocument();
      rerender(ui("summary", revalidated));
      expect(screen.queryByRole("region", { name: "Resumen del mes" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Mes anterior" }));
      expect(await screen.findByRole("region", { name: "Resumen del mes" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "Junio 2026" })).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps the latest selected month when responses arrive in reverse order", async () => {
      const user = userEvent.setup();
      const pending = new Map<string, (value: unknown) => void>();
      vi.mocked(getFinancesWorkspace).mockImplementation((options: any) => new Promise((resolve) => pending.set(options.data.month, resolve)) as never);
      render(ui("summary"));

      await user.click(screen.getByRole("button", { name: "Mes anterior" }));
      await waitFor(() => expect(pending.has("2026-07")).toBe(true));
      await user.click(screen.getByRole("button", { name: "Mes anterior" }));
      await waitFor(() => expect(pending.has("2026-06")).toBe(true));

      const june = { ...sampleWorkspace, month: "2026-06", summary: { ...sampleWorkspace.summary, income: ars("600.00") } };
      pending.get("2026-06")!(june);
      expect(await screen.findByRole("link", { name: /^Ingresos/ })).toHaveTextContent("$ 600,00");
      pending.get("2026-07")!({ ...sampleWorkspace, month: "2026-07" });
      await waitFor(() => expect(screen.getByRole("link", { name: /^Ingresos/ })).toHaveTextContent("$ 600,00"));
      expect(screen.getByRole("heading", { level: 1, name: "Junio 2026" })).toBeInTheDocument();
    });

    it("refreshes the selected prior month when the route loader is invalidated", async () => {
      const user = userEvent.setup();
      const { rerender } = render(ui("summary"));
      await user.click(screen.getByRole("button", { name: "Mes anterior" }));
      await waitFor(() => expect(screen.getByRole("link", { name: /^Ingresos/ })).toHaveTextContent("$ 600.000,00"));

      vi.mocked(getFinancesWorkspace).mockResolvedValueOnce({ ...sampleWorkspace, month: "2026-07", goalDedicationPercentage: "80.00" } as never);
      rerender(ui("summary", { ...sampleWorkspace }));

      await waitFor(() => expect(getFinancesWorkspace).toHaveBeenLastCalledWith({ data: { month: "2026-07" } }));
      expect(await screen.findByText("80% de lo libre va a tus objetivos")).toBeInTheDocument();
    });
  });

  describe("sub-pages", () => {
    it("renders a back link and a shared month stepper", async () => {
      const user = userEvent.setup();
      render(ui("expenses"));

      expect(screen.getByRole("heading", { level: 1, name: "Gastos" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute("href", "/app/finances");
      const stepper = screen.getByRole("group", { name: "Mes de finanzas" });
      expect(stepper).toHaveTextContent("Ago 2026");

      await user.click(within(stepper).getByRole("button", { name: "Mes siguiente" }));

      expect(await screen.findByRole("heading", { name: "Gastos de Septiembre de 2026" })).toBeInTheDocument();
    });

    it("renders one-time incomes before recurring incomes", () => {
      render(ui("incomes"));

      const oneOffSection = screen.getByLabelText("Ingresos únicos");
      const recurringSection = screen.getByLabelText("Ingresos recurrentes");

      expect(within(oneOffSection).getByText("Bono")).toBeInTheDocument();
      expect(
        within(recurringSection).getByText("Sueldo mensual"),
      ).toBeInTheDocument();
      expect(oneOffSection.compareDocumentPosition(recurringSection)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it("shows concepts first and legacy categories once in finance rows", () => {
      const { rerender } = render(ui("incomes"));

      const recurringIncomeSection = screen.getByLabelText("Ingresos recurrentes");
      const incomeLabel = within(recurringIncomeSection).getByText(
        "Sueldo mensual",
      );
      const incomeCategory = within(recurringIncomeSection).getByText("Sueldo");
      expect(incomeLabel).toBeInTheDocument();
      expect(incomeCategory).toBeInTheDocument();
      expect(
        incomeLabel.compareDocumentPosition(incomeCategory) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(incomeLabel).toHaveClass(
        "break-words",
        "[overflow-wrap:anywhere]",
      );
      expect(incomeLabel.closest("li")?.firstElementChild).toHaveClass(
        "min-w-0",
      );
      expect(
        within(recurringIncomeSection).getByRole("button", {
          name: "Editar ingreso Sueldo mensual",
        }),
      ).toBeInTheDocument();

      const oneOffIncomeSection = screen.getByLabelText("Ingresos únicos");
      expect(within(oneOffIncomeSection).getAllByText("Bono")).toHaveLength(1);
      expect(
        within(oneOffIncomeSection).getByRole("button", {
          name: "Editar ingreso Bono",
        }),
      ).toBeInTheDocument();

      rerender(ui("expenses"));

      const recurringExpenseSection = screen.getByLabelText("Gastos recurrentes");
      const recurringExpenseLabel = within(recurringExpenseSection).getByText(
        "Alquiler mensual",
      );
      const recurringExpenseCategory = within(recurringExpenseSection).getByText(
        "Alquiler / vivienda",
      );
      expect(recurringExpenseLabel).toBeInTheDocument();
      expect(recurringExpenseCategory).toBeInTheDocument();
      expect(
        recurringExpenseLabel.compareDocumentPosition(recurringExpenseCategory) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(recurringExpenseLabel).toHaveClass(
        "break-words",
        "[overflow-wrap:anywhere]",
      );
      expect(
        recurringExpenseLabel.closest("li")?.firstElementChild,
      ).toHaveClass("min-w-0");
      expect(
        within(recurringExpenseSection).getByRole("button", {
          name: "Editar gasto Alquiler mensual",
        }),
      ).toBeInTheDocument();

      const oneOffExpenseSection = screen.getByLabelText("Gastos únicos");
      const oneOffExpenseLabel = within(oneOffExpenseSection).getByText(
        "Pasaje aéreo",
      );
      const oneOffExpenseCategory = within(oneOffExpenseSection).getByText(
        "Vuelo",
      );
      expect(oneOffExpenseLabel).toBeInTheDocument();
      expect(oneOffExpenseCategory).toBeInTheDocument();
      expect(
        oneOffExpenseLabel.compareDocumentPosition(oneOffExpenseCategory) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(oneOffExpenseLabel).toHaveClass(
        "break-words",
        "[overflow-wrap:anywhere]",
      );
      expect(oneOffExpenseLabel.closest("li")?.firstElementChild).toHaveClass(
        "min-w-0",
      );
      expect(
        within(oneOffExpenseSection).getByRole("button", {
          name: "Editar gasto Pasaje aéreo",
        }),
      ).toBeInTheDocument();
    });

    it("uses the category once for a legacy expense without a concept", async () => {
      render(
        <FinancesWorkspace workspace={sampleWorkspace} initialMonth="2026-07" view="expenses" />,
      );

      const recurringExpenseSection = await screen.findByLabelText("Gastos recurrentes");
      expect(
        within(recurringExpenseSection).getAllByText("Servicios"),
      ).toHaveLength(1);
      expect(
        within(recurringExpenseSection).getByRole("button", {
          name: "Editar gasto Servicios",
        }),
      ).toBeInTheDocument();
    });

    it("shows monthly-filtered expense lists, excludes closed recurrences, and calculates USD equivalents", () => {
      render(ui("expenses"));

      const recurringSection = screen.getByLabelText("Gastos recurrentes");
      expect(
        within(recurringSection).getByText("Alquiler / vivienda"),
      ).toBeInTheDocument();
      expect(
        within(recurringSection).getByText("$ 200.000,00"),
      ).toBeInTheDocument();
      expect(
        within(recurringSection).getByText("Todos los meses desde Junio de 2026"),
      ).toBeInTheDocument();
      expect(
        within(recurringSection).queryByText("Servicios"),
      ).not.toBeInTheDocument();

      const oneOffSection = screen.getByLabelText("Gastos únicos");
      expect(
        within(oneOffSection).getByText("Pasaje aéreo"),
      ).toBeInTheDocument();
      expect(within(oneOffSection).getByText("Vuelo")).toBeInTheDocument();
      expect(within(oneOffSection).getByText("US$ 200,00")).toBeInTheDocument();
      expect(
        within(oneOffSection).getByText("Equivale a ARS 300.000"),
      ).toBeInTheDocument();
      expect(
        within(oneOffSection).getByText("Agosto de 2026"),
      ).toBeInTheDocument();
      expect(oneOffSection.compareDocumentPosition(recurringSection)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it("renders separate empty states when there are no recurring or one-off expenses", () => {
      const { rerender } = render(ui("incomes", emptyWorkspace));

      const oneOffIncomeSection = screen.getByLabelText("Ingresos únicos");
      expect(
        within(oneOffIncomeSection).getByText(
          "No tenés ingresos únicos para este mes.",
        ),
      ).toBeInTheDocument();

      const recurringIncomeSection = screen.getByLabelText(
        "Ingresos recurrentes",
      );
      expect(
        within(recurringIncomeSection).getByText(
          "No tenés ingresos recurrentes para este mes.",
        ),
      ).toBeInTheDocument();

      rerender(ui("expenses", emptyWorkspace));

      const recurringSection = screen.getByLabelText("Gastos recurrentes");
      expect(
        within(recurringSection).getByText(
          "No tenés gastos recurrentes para este mes.",
        ),
      ).toBeInTheDocument();

      const oneOffSection = screen.getByLabelText("Gastos únicos");
      expect(
        within(oneOffSection).getByText("No tenés gastos únicos para este mes."),
      ).toBeInTheDocument();
    });

    it("preserves income tab list and item editing", async () => {
      const user = userEvent.setup();
      render(
        <FinancesWorkspace
          workspace={{
            goalDedicationPercentage: "90",
            month: "2026-08", summary: { income: { amount: "0.00", currency: "ARS" }, expenses: { amount: "0.00", currency: "ARS" }, balance: { amount: "0.00", currency: "ARS" }, contribution: { amount: "0.00", currency: "ARS" } },
            savings: { places: [], movements: [] },
            incomes: {
              sources: [],
              incomes: [
                {
                  id: "income_1",
                  sourceKind: "salary",
                  sourceId: null,
                  sourceName: "Sueldo",
                  concept: null,
                  amount: "100.00",
                  currency: "ARS" as const,
                  recurring: true,
                  effectiveMonth: "2026-08-01",
                  arsEquivalent: null,
                },
              ],
            },
            expenses: { sources: [], expenses: [] },
          }}
          initialMonth="2026-08"
          view="incomes"
        />,
      );

      expect(
        screen.getByRole("heading", { name: "Ingresos de Agosto de 2026" }),
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Editar ingreso Sueldo" }),
      );

      expect(
        screen.getByRole("heading", { name: "Editar ingreso" }),
      ).toBeInTheDocument();
    });

    it("opens expense sheet to add a new expense", async () => {
      const user = userEvent.setup();
      render(ui("expenses"));

      await user.click(screen.getByRole("button", { name: "Agregar nuevo" }));

      expect(
        screen.getByRole("heading", { name: "Nuevo gasto" }),
      ).toBeInTheDocument();
    });

    it("opens expense sheet to edit an existing expense", async () => {
      const user = userEvent.setup();
      render(ui("expenses"));

      await user.click(
        screen.getByRole("button", { name: "Editar gasto Alquiler mensual" }),
      );

      expect(
        screen.getByRole("heading", { name: "Editar gasto" }),
      ).toBeInTheDocument();
    });
  });
});
