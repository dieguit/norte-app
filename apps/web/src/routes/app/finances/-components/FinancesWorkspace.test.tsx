// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinancesWorkspace } from "./FinancesWorkspace";

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
}));

afterEach(cleanup);

const sampleWorkspace = {
  goalDedicationPercentage: "90",
  incomes: {
    sources: [],
    incomes: [
      {
        id: "income_1",
        sourceKind: "salary",
        sourceId: null,
        sourceName: "salary",
        amount: "600000.00",
        currency: "ARS" as const,
        recurring: true,
        effectiveMonth: "2026-01-01",
      },
      {
        id: "income_bonus",
        sourceKind: "custom",
        sourceId: null,
        sourceName: "Bono",
        amount: "100000.00",
        currency: "ARS" as const,
        recurring: false,
        effectiveMonth: "2026-08-01",
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
        amount: "200000.00",
        currency: "ARS" as const,
        recurring: true,
        effectiveMonth: "2026-06-01",
        endMonth: null,
      },
      {
        id: "exp_utilities_closed",
        sourceKind: "utilities",
        sourceId: null,
        sourceName: "utilities",
        amount: "50000.00",
        currency: "ARS" as const,
        recurring: true,
        effectiveMonth: "2026-01-01",
        endMonth: "2026-08-01",
      },
      {
        id: "exp_flight_usd",
        sourceKind: "custom",
        sourceId: "src_flight",
        sourceName: "Vuelo",
        amount: "200.00",
        currency: "USD" as const,
        recurring: false,
        effectiveMonth: "2026-08-01",
        endMonth: null,
      },
    ],
  },
};

describe("FinancesWorkspace", () => {
  it("shares its month selector and renders top summary cards across tabs", async () => {
    const user = userEvent.setup();
    render(
      <FinancesWorkspace workspace={sampleWorkspace} initialMonth="2026-08" />,
    );

    expect(screen.getByRole("heading", { name: "Tus Finanzas" })).toHaveClass(
      "whitespace-nowrap",
    );
    expect(screen.getByLabelText("Mes de finanzas")).toHaveClass("sm:w-auto");

    const summary = screen.getByRole("region", {
      name: "Resumen mensual para objetivos",
    });
    expect(
      within(summary).getByRole("heading", {
        name: "Finanzas de Agosto de 2026",
      }),
    ).toBeInTheDocument();
    expect(within(summary).getByText("$ 700.000,00")).toBeInTheDocument();
    expect(within(summary).getByText("$ 500.000,00")).toBeInTheDocument();
    expect(within(summary).getByText("$ 200.000,00")).toBeInTheDocument();
    expect(
      within(summary).getByText(/90% · aproximadamente \$ 180\.000,00/),
    ).toBeInTheDocument();
    expect(
      within(summary).queryByRole("link", { name: "Ver finanzas" }),
    ).not.toBeInTheDocument();
    expect(
      within(summary).getByRole("link", {
        name: "Cambiar planificación en objetivos",
      }),
    ).toHaveAttribute("href", "/app/goals");

    expect(screen.getByRole("tab", { name: "Ingresos" })).toHaveClass(
      "px-3",
      "py-1",
      "text-base",
    );
    expect(
      screen.getByRole("heading", { name: "Ingresos de Agosto de 2026" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Gastos" }));

    expect(screen.getByLabelText("Mes de finanzas")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Gastos de Agosto de 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recurrentes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Únicos" })).toBeInTheDocument();
  });

  it("renders one-time incomes before recurring incomes", () => {
    render(
      <FinancesWorkspace workspace={sampleWorkspace} initialMonth="2026-08" />,
    );

    const oneOffSection = screen.getByLabelText("Ingresos únicos");
    const recurringSection = screen.getByLabelText("Ingresos recurrentes");

    expect(within(oneOffSection).getByText("Bono")).toBeInTheDocument();
    expect(within(recurringSection).getByText("Sueldo")).toBeInTheDocument();
    expect(oneOffSection.compareDocumentPosition(recurringSection)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("shows monthly-filtered expense lists, excludes closed recurrences, and calculates USD equivalents", async () => {
    const user = userEvent.setup();
    render(
      <FinancesWorkspace workspace={sampleWorkspace} initialMonth="2026-08" />,
    );

    await user.click(screen.getByRole("tab", { name: "Gastos" }));

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
    expect(within(oneOffSection).getByText("Vuelo")).toBeInTheDocument();
    expect(within(oneOffSection).getByText("USD 200,00")).toBeInTheDocument();
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

  it("renders separate empty states when there are no recurring or one-off expenses", async () => {
    const user = userEvent.setup();
    render(
      <FinancesWorkspace
        workspace={{
          goalDedicationPercentage: "90",
          incomes: { sources: [], incomes: [] },
          expenses: { sources: [], expenses: [] },
        }}
        initialMonth="2026-08"
      />,
    );

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

    await user.click(screen.getByRole("tab", { name: "Gastos" }));

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

  it("updates summary totals and list entries when switching months", async () => {
    const user = userEvent.setup();
    render(
      <FinancesWorkspace workspace={sampleWorkspace} initialMonth="2026-08" />,
    );

    await user.click(screen.getByRole("button", { name: "Mes de finanzas" }));
    await user.click(screen.getByRole("button", { name: "Jul" }));

    const summary = screen.getByRole("region", {
      name: "Resumen mensual para objetivos",
    });
    expect(
      within(summary).getByRole("heading", {
        name: "Finanzas de Julio de 2026",
      }),
    ).toBeInTheDocument();
    expect(within(summary).getByText("$ 600.000,00")).toBeInTheDocument();
    expect(within(summary).getByText("$ 250.000,00")).toBeInTheDocument();
    expect(within(summary).getByText("$ 350.000,00")).toBeInTheDocument();
    expect(
      within(summary).getByText(/90% · aproximadamente \$ 315\.000,00/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Gastos" }));

    const recurringSection = screen.getByLabelText("Gastos recurrentes");
    expect(
      within(recurringSection).getByText("Alquiler / vivienda"),
    ).toBeInTheDocument();
    expect(within(recurringSection).getByText("Servicios")).toBeInTheDocument();
    expect(
      within(recurringSection).getByText("$ 50.000,00"),
    ).toBeInTheDocument();

    const oneOffSection = screen.getByLabelText("Gastos únicos");
    expect(
      within(oneOffSection).getByText("No tenés gastos únicos para este mes."),
    ).toBeInTheDocument();
    expect(within(oneOffSection).queryByText("Vuelo")).not.toBeInTheDocument();
  });

  it("keeps the goals link available when the selected month has no balance", () => {
    render(
      <FinancesWorkspace
        workspace={{
          goalDedicationPercentage: "90",
          incomes: { sources: [], incomes: [] },
          expenses: { sources: [], expenses: [] },
        }}
        initialMonth="2026-08"
      />,
    );

    const summary = screen.getByRole("region", {
      name: "Resumen mensual para objetivos",
    });
    expect(
      within(summary).getByText(/90% · aproximadamente \$ 0,00/),
    ).toBeInTheDocument();
    expect(
      within(summary).getByRole("link", {
        name: "Cambiar planificación en objetivos",
      }),
    ).toHaveAttribute("href", "/app/goals");
  });

  it("preserves income tab list and item editing", async () => {
    const user = userEvent.setup();
    render(
      <FinancesWorkspace
        workspace={{
          goalDedicationPercentage: "90",
          incomes: {
            sources: [],
            incomes: [
              {
                id: "income_1",
                sourceKind: "salary",
                sourceId: null,
                sourceName: "Sueldo",
                amount: "100.00",
                currency: "ARS" as const,
                recurring: true,
                effectiveMonth: "2026-08-01",
              },
            ],
          },
          expenses: { sources: [], expenses: [] },
        }}
        initialMonth="2026-08"
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
    render(
      <FinancesWorkspace workspace={sampleWorkspace} initialMonth="2026-08" />,
    );

    await user.click(screen.getByRole("tab", { name: "Gastos" }));
    await user.click(screen.getByRole("button", { name: "Agregar nuevo" }));

    expect(
      screen.getByRole("heading", { name: "Nuevo gasto" }),
    ).toBeInTheDocument();
  });

  it("opens expense sheet to edit an existing expense", async () => {
    const user = userEvent.setup();
    render(
      <FinancesWorkspace workspace={sampleWorkspace} initialMonth="2026-08" />,
    );

    await user.click(screen.getByRole("tab", { name: "Gastos" }));
    await user.click(
      screen.getByRole("button", { name: "Editar gasto Alquiler / vivienda" }),
    );

    expect(
      screen.getByRole("heading", { name: "Editar gasto" }),
    ).toBeInTheDocument();
  });
});
