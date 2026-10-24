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

      expect(within(screen.getByRole("group", { name: "Alquiler / vivienda" })).getByRole("button", { name: "Editar gasto Alquiler mensual" })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Servicios" })).toHaveTextContent("$ 50.000,00");
      expect(screen.queryByText("Pasaje aéreo")).not.toBeInTheDocument();
    });

    it("keeps savings balances independent of the selected month and restores monthly context", async () => {
      const user = userEvent.setup();
      const { rerender } = render(ui("summary"));

      await user.click(screen.getByRole("button", { name: "Agosto 2026" }));
      await user.click(screen.getByRole("button", { name: "Jul" }));
      expect(screen.getByRole("heading", { level: 1, name: "Julio 2026" })).toBeInTheDocument();

      rerender(ui("savings"));
      const bank = await screen.findByRole("region", { name: "Banco Nación" });
      expect(bank).toHaveTextContent("$ 125.000,00");
      expect(bank).toHaveTextContent("US$ 2.345,67");
      expect(screen.getByRole("heading", { level: 1, name: "Ahorros" })).toBeInTheDocument();
      expect(screen.getByText("Acumulado")).toBeInTheDocument();
      expect(screen.queryByRole("group", { name: "Mes de finanzas" })).not.toBeInTheDocument();

      rerender(ui("expenses"));
      expect(screen.getByRole("group", { name: "Mes de finanzas" })).toHaveTextContent("Jul 2026");
      expect(screen.getByRole("figure", { name: "Total del mes" })).toHaveTextContent("$ 250.000");
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

      expect(await screen.findByRole("figure", { name: "Total del mes" })).toHaveTextContent("$ 200.000");
      expect(stepper).toHaveTextContent("Sep 2026");
    });

    it("groups the month's incomes by source, largest first", () => {
      render(ui("incomes"));

      expect(screen.getByRole("heading", { level: 1, name: "Ingresos" })).toBeInTheDocument();
      const donut = screen.getByRole("figure", { name: "Total del mes" });
      expect(donut).toHaveTextContent("$ 700.000");
      expect(donut).toHaveTextContent("2 movimientos");
      expect(screen.getByText("2 fuentes")).toBeInTheDocument();
      expect(screen.getByLabelText("Agrupar por")).toHaveValue("category");

      const salary = screen.getByRole("group", { name: "Sueldo" });
      const bonus = screen.getByRole("group", { name: "Bono" });
      expect(salary.compareDocumentPosition(bonus)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(salary).toHaveTextContent("86%");
      expect(within(salary).getByRole("button", { name: "Editar ingreso Sueldo mensual" })).toHaveTextContent("$ 600.000,00");
      expect(bonus).toHaveTextContent("14%");
      expect(within(bonus).getByRole("button", { name: "Editar ingreso Bono" })).toHaveTextContent("$ 100.000,00");
    });

    it("keeps the income grouping independent from the expense grouping", async () => {
      const user = userEvent.setup();
      const { rerender } = render(ui("expenses"));

      await user.selectOptions(screen.getByLabelText("Agrupar por"), "date");
      rerender(ui("incomes"));

      expect(screen.getByLabelText("Agrupar por")).toHaveValue("category");
      await user.selectOptions(screen.getByLabelText("Agrupar por"), "date");
      expect(screen.getByRole("heading", { level: 2, name: "Desde Enero 2026" })).toBeInTheDocument();
    });

    it("opens income sheet to add a new income", async () => {
      const user = userEvent.setup();
      render(ui("incomes"));

      await user.click(screen.getByRole("button", { name: "Agregar ingreso" }));

      expect(screen.getByRole("heading", { name: "Nuevo ingreso" })).toBeInTheDocument();
    });

    it("groups a legacy expense without a concept under its category", async () => {
      render(<FinancesWorkspace workspace={sampleWorkspace} initialMonth="2026-07" view="expenses" />);

      const utilities = await screen.findByRole("group", { name: "Servicios" });
      expect(within(utilities).getByRole("button", { name: "Editar gasto Servicios" })).toBeInTheDocument();
    });

    it("groups the month's expenses by category, largest first, with ARS shares", () => {
      render(ui("expenses"));

      const donut = screen.getByRole("figure", { name: "Total del mes" });
      expect(donut).toHaveTextContent("$ 500.000");
      expect(donut).toHaveTextContent("2 movimientos");
      expect(screen.getByText("2 categorías")).toBeInTheDocument();
      expect(screen.getByLabelText("Agrupar por")).toHaveValue("category");

      const flight = screen.getByRole("group", { name: "Vuelo" });
      const housing = screen.getByRole("group", { name: "Alquiler / vivienda" });
      expect(flight.compareDocumentPosition(housing)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(flight).toHaveTextContent("60%");
      expect(flight).toHaveTextContent("$ 300.000,00");
      expect(within(flight).getByRole("button", { name: "Editar gasto Pasaje aéreo" })).toHaveTextContent("US$ 200,00");
      expect(housing).toHaveTextContent("40%");
      expect(within(housing).getByRole("button", { name: "Editar gasto Alquiler mensual" })).toHaveTextContent("$ 200.000,00");
      expect(screen.queryByRole("group", { name: "Servicios" })).not.toBeInTheDocument();
    });

    it("switches to the date log, edits from it and keeps the choice across months", async () => {
      const user = userEvent.setup();
      render(ui("expenses"));

      await user.selectOptions(screen.getByLabelText("Agrupar por"), "date");

      const august = screen.getByRole("heading", { level: 2, name: "Agosto 2026" });
      const june = screen.getByRole("heading", { level: 2, name: "Desde Junio 2026" });
      expect(august.compareDocumentPosition(june)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      const flightRow = screen.getByRole("button", { name: "Editar gasto Pasaje aéreo" });
      expect(flightRow).toHaveTextContent("Vuelo");
      expect(flightRow).toHaveTextContent("US$ 200,00");

      await user.click(within(screen.getByRole("group", { name: "Mes de finanzas" })).getByRole("button", { name: "Mes anterior" }));

      expect(await screen.findByRole("heading", { level: 2, name: "Desde Enero 2026" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Desde Junio 2026" })).toBeInTheDocument();
      expect(screen.getByLabelText("Agrupar por")).toHaveValue("date");

      await user.click(screen.getByRole("button", { name: "Editar gasto Servicios" }));
      expect(screen.getByRole("heading", { name: "Editar gasto" })).toBeInTheDocument();
    });

    it("renders empty states for incomes and expenses", () => {
      const { rerender } = render(ui("incomes", emptyWorkspace));

      expect(screen.getByText("No tenés ingresos este mes.")).toBeInTheDocument();
      expect(screen.getByRole("figure", { name: "Total del mes" })).toHaveTextContent("—");
      expect(screen.getByRole("figure", { name: "Total del mes" })).toHaveTextContent("0 movimientos");
      expect(screen.queryByLabelText("Agrupar por")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Agregar ingreso" })).toBeInTheDocument();

      rerender(ui("expenses", emptyWorkspace));

      expect(screen.getByText("No tenés gastos este mes.")).toBeInTheDocument();
      expect(screen.getByRole("figure", { name: "Total del mes" })).toHaveTextContent("—");
      expect(screen.getByRole("figure", { name: "Total del mes" })).toHaveTextContent("0 movimientos");
      expect(screen.queryByLabelText("Agrupar por")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Agregar gasto" })).toBeInTheDocument();
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

      expect(within(screen.getByRole("group", { name: "Sueldo" })).getByRole("button", { name: "Editar ingreso Sueldo" })).toBeInTheDocument();
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

      await user.click(screen.getByRole("button", { name: "Agregar gasto" }));

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
