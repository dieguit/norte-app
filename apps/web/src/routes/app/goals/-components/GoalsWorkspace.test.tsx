// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type {
  GoalsWorkspace as GoalsWorkspaceType,
  GoalWorkspaceItem,
  GoalsFinancialSummary,
} from "../../../../features/goals/goals";
import {
  updateSavingContribution,
  deleteSavingContribution,
} from "../../../../features/contributions/saving-contribution.functions";
import { GoalsWorkspace } from "./GoalsWorkspace";
import { GoalsEmpty, GoalsError, GoalsLoading } from "./GoalsRouteStates";

const mockInvalidate = vi.fn().mockResolvedValue(undefined);

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
  useRouter: () => ({
    invalidate: mockInvalidate,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock(
  "../../../../features/contributions/saving-contribution.functions",
  () => ({
    updateSavingContribution: vi.fn(),
    deleteSavingContribution: vi.fn(),
    previewSavingContribution: vi.fn(),
    getSavingContributionContext: vi.fn(),
  }),
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeFinancialSummary(
  overrides: Partial<GoalsFinancialSummary> = {},
): GoalsFinancialSummary {
  return {
    month: "2026-08",
    income: { amount: "300000.00", currency: "ARS" },
    expenses: { amount: "150000.00", currency: "ARS" },
    balance: { amount: "150000.00", currency: "ARS" },
    dedicationPercentage: "90",
    contribution: { amount: "135000.00", currency: "ARS" },
    ...overrides,
  };
}

function makeWorkspace(
  overrides: Partial<GoalsWorkspaceType> = {},
): GoalsWorkspaceType {
  return {
    financialSummary: overrides.financialSummary ?? makeFinancialSummary(),
    groups: overrides.groups ?? [],
  };
}

function makeGoal(overrides: Partial<GoalWorkspaceItem>): GoalWorkspaceItem {
  return {
    id: "goal-1",
    name: "Colchón financiero",
    type: "emergency_fund",
    currency: "USD",
    priority: "high",
    strategy: "save",
    status: "active",
    createdAt: "2026-08-01T12:00:00Z",
    targetAmount: { amount: "1000.00", currency: "USD" },
    savingsValue: { amount: "200.00", currency: "USD" },
    investmentValue: { amount: "0.00", currency: "USD" },
    actualValue: { amount: "200.00", currency: "USD" },
    progressPercentage: "20.00",
    funding: [
      {
        percentage: "100.00",
        monthlyContribution: { amount: "50000.00", currency: "ARS" },
        allocatedBaseAmount: { amount: "50000.00", currency: "ARS" },
        allocatedDestinationAmount: { amount: "33.33", currency: "USD" },
        effectiveMonth: "2026-09",
      },
    ],
    projection: { status: "available", completionMonth: "2028-09" },
    usesPlanningRate: true,
    ...overrides,
  };
}

describe("GoalsWorkspace component", () => {
  it("renders a populated workspace with active goals directly and paused/completed groups as disclosures", async () => {
    const user = userEvent.setup();
    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Colchón financiero",
      status: "active",
      priority: "high",
      targetAmount: { amount: "1000.00", currency: "USD" },
      actualValue: { amount: "200.00", currency: "USD" },
      progressPercentage: "20.00",
    });

    const pausedGoal = makeGoal({
      id: "goal-2",
      name: "Vacaciones en Brasil",
      status: "paused",
      priority: "medium",
      targetAmount: { amount: "1500.00", currency: "USD" },
      actualValue: { amount: "500.00", currency: "USD" },
      progressPercentage: "33.33",
      funding: [
        {
          percentage: "50.00",
          monthlyContribution: { amount: "50000.00", currency: "ARS" },
          allocatedBaseAmount: { amount: "25000.00", currency: "ARS" },
          allocatedDestinationAmount: { amount: "16.67", currency: "USD" },
          effectiveMonth: "2026-09",
        },
      ],
      projection: { status: "plan_paused" },
    });

    const completedGoal = makeGoal({
      id: "goal-3",
      name: "Comprar laptop",
      status: "completed",
      priority: "low",
      completedAt: "2026-03-15T00:00:00Z",
      targetAmount: { amount: "2000.00", currency: "USD" },
      actualValue: { amount: "2000.00", currency: "USD" },
      progressPercentage: "100.00",
      funding: [],
      projection: { status: "available", completionMonth: "2026-03" },
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [
        { status: "active", goals: [activeGoal] },
        { status: "paused", goals: [pausedGoal] },
        { status: "completed", goals: [completedGoal] },
      ],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    expect(
      screen.queryByRole("heading", { level: 2, name: "Activos" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Activos")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Ver Colchón financiero/i }),
    ).not.toBeInTheDocument();
    const activeArticle = screen.getByRole("article", {
      name: "Colchón financiero",
    });
    expect(within(activeArticle).queryByText("Activo")).not.toBeInTheDocument();
    expect(
      within(activeArticle).queryByText("Prioridad alta"),
    ).not.toBeInTheDocument();

    const actualValueEl = screen.getByLabelText(
      "Valor actual de Colchón financiero",
    );
    expect(actualValueEl).toHaveTextContent("US$ 200,00");
    expect(actualValueEl).not.toHaveTextContent("Plan:");
    expect(actualValueEl).not.toHaveTextContent("US$ 33,33");

    const pausedDisclosure = screen.getByRole("button", { name: /Pausados/i });
    expect(pausedDisclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Vacaciones en Brasil")).not.toBeInTheDocument();

    const completedDisclosure = screen.getByRole("button", {
      name: /Completados/i,
    });
    expect(completedDisclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Comprar laptop")).not.toBeInTheDocument();

    await user.click(pausedDisclosure);
    expect(pausedDisclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Vacaciones en Brasil")).toBeInTheDocument();

    await user.click(completedDisclosure);
    expect(completedDisclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Comprar laptop")).toBeInTheDocument();
  });

  it("renders monthly finances and dedication cards below the heading when active goals exist", async () => {
    const user = userEvent.setup();
    const onChangePlanning = vi.fn();
    const activeGoal = makeGoal({ id: "goal-1", status: "active" });
    const financialSummary = makeFinancialSummary({
      month: "2026-08",
      income: { amount: "300000.00", currency: "ARS" },
      expenses: { amount: "100000.00", currency: "ARS" },
      balance: { amount: "200000.00", currency: "ARS" },
      dedicationPercentage: "90",
      contribution: { amount: "180000.00", currency: "ARS" },
    });
    const workspace = makeWorkspace({
      financialSummary,
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(
      <GoalsWorkspace
        workspace={workspace}
        onChangePlanning={onChangePlanning}
      />,
    );

    // Heading action group has only 'Nuevo objetivo'
    expect(
      screen.getByRole("button", { name: "Nuevo objetivo" }),
    ).toBeInTheDocument();

    // Monthly finances card
    const summarySection = screen.getByRole("region", {
      name: "Resumen mensual para objetivos",
    });
    expect(summarySection).toBeInTheDocument();
    expect(within(summarySection).getByText("Ingresos")).toBeInTheDocument();
    expect(
      within(summarySection).getByText("$ 300.000,00"),
    ).toBeInTheDocument();
    expect(within(summarySection).getByText("Gastos")).toBeInTheDocument();
    expect(
      within(summarySection).getByText("$ 100.000,00"),
    ).toBeInTheDocument();
    expect(within(summarySection).getByText("Balance")).toBeInTheDocument();
    expect(
      within(summarySection).getByText("$ 200.000,00"),
    ).toBeInTheDocument();
    expect(
      within(summarySection).getByRole("link", { name: /ver finanzas/i }),
    ).toHaveAttribute("href", "/app/finances");

    // Dedication card
    const slider = within(summarySection).getByRole("slider", { hidden: true });
    expect(slider).toBeDisabled();
    expect(slider).toHaveAttribute(
      "aria-label",
      "Porcentaje destinado a objetivos",
    );
    expect(slider).toHaveAttribute("aria-valuenow", "90");
    expect(
      within(summarySection).getByText(/90% · aproximadamente \$ 180\.000,00/i),
    ).toBeInTheDocument();

    const planBtn = within(summarySection).getByRole("button", {
      name: "Cambiar planificación de objetivos",
    });
    expect(planBtn).toBeEnabled();
    await user.click(planBtn);
    expect(onChangePlanning).toHaveBeenCalledTimes(1);
  });

  it("renders disabled slider, disabled planning button, when balance is zero or negative", () => {
    const activeGoal = makeGoal({ id: "goal-1", status: "active" });
    const financialSummary = makeFinancialSummary({
      month: "2026-08",
      income: { amount: "100000.00", currency: "ARS" },
      expenses: { amount: "150000.00", currency: "ARS" },
      balance: { amount: "-50000.00", currency: "ARS" },
      dedicationPercentage: "90",
      contribution: { amount: "0.00", currency: "ARS" },
    });
    const workspace = makeWorkspace({
      financialSummary,
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} onChangePlanning={vi.fn()} />);

    const summarySection = screen.getByRole("region", {
      name: "Resumen mensual para objetivos",
    });
    expect(summarySection).toBeInTheDocument();
    expect(
      within(summarySection).getByRole("link", { name: /ver finanzas/i }),
    ).toHaveAttribute("href", "/app/finances");

    const slider = within(summarySection).getByRole("slider", { hidden: true });
    expect(slider).toBeDisabled();
    expect(slider).toHaveAttribute(
      "aria-label",
      "Porcentaje destinado a objetivos",
    );

    const planBtn = within(summarySection).getByRole("button", {
      name: "Cambiar planificación de objetivos",
    });
    expect(planBtn).toBeDisabled();
  });

  it("does not render financial summary cards or planning button when there are no active goals", () => {
    const pausedGoal = makeGoal({ id: "goal-2", status: "paused" });
    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [
        { status: "active", goals: [] },
        { status: "paused", goals: [pausedGoal] },
      ],
    });

    render(<GoalsWorkspace workspace={workspace} onChangePlanning={vi.fn()} />);

    expect(
      screen.queryByRole("region", { name: "Resumen mensual para objetivos" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Cambiar planificación de objetivos",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders Cambiar planificación de objetivos button inside dedication card when active goals exist and calls onChangePlanning", async () => {
    const user = userEvent.setup();
    const onChangePlanning = vi.fn();
    const activeGoal = makeGoal({ id: "goal-1", status: "active" });
    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(
      <GoalsWorkspace
        workspace={workspace}
        onChangePlanning={onChangePlanning}
      />,
    );

    const btn = screen.getByRole("button", {
      name: "Cambiar planificación de objetivos",
    });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onChangePlanning).toHaveBeenCalledTimes(1);
  });

  it("maintains a single expanded goal-detail state across active and collapsed groups", async () => {
    const user = userEvent.setup();
    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Colchón financiero",
      status: "active",
    });
    const pausedGoal = makeGoal({
      id: "goal-2",
      name: "Viaje a Tokio",
      status: "paused",
    });
    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [
        { status: "active", goals: [activeGoal] },
        { status: "paused", goals: [pausedGoal] },
      ],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Colchón financiero" }),
    );
    expect(
      screen.getByRole("region", { name: "Detalles de Colchón financiero" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Pausados/i }));
    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Viaje a Tokio" }),
    );

    expect(
      screen.queryByRole("region", { name: "Detalles de Colchón financiero" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Detalles de Viaje a Tokio" }),
    ).toBeInTheDocument();
  });

  it("uses an explicit disclosure instead of linking the goal name", async () => {
    const user = userEvent.setup();
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({
          groups: [{ status: "active", goals: [makeGoal({})] }],
        })}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /Colchón financiero/i }),
    ).not.toBeInTheDocument();

    const disclosure = screen.getByRole("button", {
      name: "Ver detalle de Colchón financiero",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

    await user.click(disclosure);

    expect(
      screen.getByRole("button", {
        name: "Ocultar detalle de Colchón financiero",
      }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tus avances hasta hoy" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByText("Ahorrar US$ 33,33 por mes")).toBeInTheDocument();
    expect(
      screen.getByText("(100% de tu capacidad mensual)"),
    ).toBeInTheDocument();
  });

  it("keeps only one goal expanded", async () => {
    const user = userEvent.setup();
    const first = makeGoal({ id: "goal-1", name: "Colchón financiero" });
    const second = makeGoal({ id: "goal-2", name: "Viaje" });
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({
          groups: [{ status: "active", goals: [first, second] }],
        })}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Colchón financiero" }),
    );
    expect(
      screen.getByRole("button", {
        name: "Ocultar detalle de Colchón financiero",
      }),
    ).toHaveAttribute("aria-expanded", "true");

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Viaje" }),
    );

    expect(
      screen.getByRole("button", { name: "Ver detalle de Colchón financiero" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: "Ocultar detalle de Viaje" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("region", { name: /Detalles de/ })).toHaveLength(
      1,
    );
  });

  it("shows plan first and composition second in responsive columns", async () => {
    const user = userEvent.setup();
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({
          groups: [
            {
              status: "active",
              goals: [
                makeGoal({
                  savingsValue: { amount: "125.00", currency: "USD" },
                  investmentValue: { amount: "75.00", currency: "USD" },
                }),
              ],
            },
          ],
        })}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Colchón financiero" }),
    );

    const details = screen.getByRole("region", {
      name: "Detalles de Colchón financiero",
    });
    expect(details).toHaveClass("grid-cols-1", "sm:grid-cols-3");
    expect(
      within(details)
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual(["Plan", "Tus avances hasta hoy"]);
    expect(within(details).getByText("US$ 125,00")).toBeInTheDocument();
    expect(within(details).getByText("US$ 75,00")).toBeInTheDocument();
    expect(
      within(details).getByText("Ahorrar US$ 33,33 por mes"),
    ).toBeInTheDocument();
    expect(
      within(details).getByText("(100% de tu capacidad mensual)"),
    ).toBeInTheDocument();
  });

  it("omits empty groups from rendering", () => {
    const activeGoal = makeGoal({ id: "goal-1", status: "active" });
    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [
        { status: "active", goals: [activeGoal] },
        { status: "paused", goals: [] },
        { status: "completed", goals: [] },
      ],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    expect(screen.queryByText("Activos")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Pausados/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Completados/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Colchón financiero")).toBeInTheDocument();
  });

  it("renders completed date when present and Fecha no disponible when absent", async () => {
    const user = userEvent.setup();
    const completedWithDate = makeGoal({
      id: "goal-completed-1",
      name: "Meta con fecha",
      status: "completed",
      completedAt: "2026-05-10T10:00:00Z",
    });
    const completedWithoutDate = makeGoal({
      id: "goal-completed-2",
      name: "Meta sin fecha",
      status: "completed",
      completedAt: undefined,
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [
        {
          status: "completed",
          goals: [completedWithDate, completedWithoutDate],
        },
      ],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(screen.getByRole("button", { name: /Completados/i }));

    expect(screen.getByText(/mayo de 2026/i)).toBeInTheDocument();
    expect(screen.getByText("Fecha no disponible")).toBeInTheDocument();
  });

  it("renders paused goals with Proyección pausada and plan rows behind disclosure", async () => {
    const user = userEvent.setup();
    const pausedGoal = makeGoal({
      id: "goal-paused",
      name: "Fondo de viaje",
      status: "paused",
      projection: { status: "plan_paused" },
      funding: [
        {
          percentage: "10.00",
          monthlyContribution: { amount: "10000.00", currency: "ARS" },
          allocatedBaseAmount: { amount: "1000.00", currency: "ARS" },
          allocatedDestinationAmount: { amount: "0.67", currency: "USD" },
          effectiveMonth: "2026-09",
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "paused", goals: [pausedGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(screen.getByRole("button", { name: /Pausados/i }));

    const pausedArticle = screen.getByRole("article", {
      name: "Fondo de viaje",
    });
    expect(
      within(pausedArticle).getByText("Proyección pausada"),
    ).toBeInTheDocument();

    await user.click(
      within(pausedArticle).getByRole("button", {
        name: "Ver detalle de Fondo de viaje",
      }),
    );
    expect(
      within(pausedArticle).getByText("Ahorrar US$ 0,67 por mes"),
    ).toBeInTheDocument();
    expect(
      within(pausedArticle).getByText("(10% de tu capacidad mensual)"),
    ).toBeInTheDocument();
  });

  it("renders unknown target as Objetivo por calcular and omits progress percentage", () => {
    const unknownTargetGoal = makeGoal({
      id: "goal-unknown-target",
      name: "Meta indefinida",
      targetAmount: undefined,
      actualValue: { amount: "150.00", currency: "USD" },
      progressPercentage: undefined,
      projection: { status: "target_unavailable" },
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [unknownTargetGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    expect(
      screen.getAllByText("Objetivo por calcular").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("US$ 150,00")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders compact Spanish labels for all projection reasons", () => {
    const goals: GoalWorkspaceItem[] = [
      makeGoal({
        id: "g-1",
        name: "Sin asignación",
        projection: { status: "no_future_allocation" },
      }),
      makeGoal({
        id: "g-2",
        name: "Sin compromiso",
        projection: { status: "commitment_absent" },
      }),
      makeGoal({
        id: "g-3",
        name: "Sin supuesto inversión",
        projection: { status: "investment_assumption_unavailable" },
      }),
      makeGoal({
        id: "g-4",
        name: "Fuera de horizonte",
        projection: { status: "outside_horizon" },
      }),
    ];

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    expect(screen.getByText("Sin asignación futura")).toBeInTheDocument();
    expect(screen.getByText("Sin aporte mensual")).toBeInTheDocument();
    expect(
      screen.getByText("Supuesto de inversión no disponible"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No alcanzado dentro del horizonte"),
    ).toBeInTheDocument();
  });

  it("preserves progress percentage text above 100 while capping native progress value at 100", () => {
    const aboveTargetGoal = makeGoal({
      id: "goal-above",
      name: "Meta superada",
      targetAmount: { amount: "1000.00", currency: "USD" },
      actualValue: { amount: "1250.00", currency: "USD" },
      progressPercentage: "125.00",
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [aboveTargetGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    const progressEl = screen.getByRole("progressbar", {
      name: /Progreso de Meta superada/i,
    });
    expect(progressEl).toHaveAttribute("value", "100");
    expect(progressEl).toHaveAttribute("max", "100");
    expect(screen.getByText("125%")).toBeInTheDocument();
  });

  it("renders long names and multiple funding rows behind disclosure", async () => {
    const user = userEvent.setup();
    const complexGoal = makeGoal({
      id: "goal-complex",
      name: "Fondo para la compra del primer departamento en Buenos Aires con cochera",
      strategy: "save",
      funding: [
        {
          percentage: "60.00",
          monthlyContribution: { amount: "100000.00", currency: "ARS" },
          allocatedBaseAmount: { amount: "60000.00", currency: "ARS" },
          allocatedDestinationAmount: { amount: "40.00", currency: "USD" },
          effectiveMonth: "2026-09",
        },
        {
          percentage: "40.00",
          monthlyContribution: { amount: "100000.00", currency: "ARS" },
          allocatedBaseAmount: { amount: "40000.00", currency: "ARS" },
          allocatedDestinationAmount: { amount: "26.67", currency: "USD" },
          effectiveMonth: "2026-10",
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [complexGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    expect(
      screen.getByText(
        "Fondo para la compra del primer departamento en Buenos Aires con cochera",
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Ver detalle de Fondo para la compra/,
      }),
    );

    expect(screen.getByText("Ahorrar US$ 40,00 por mes")).toBeInTheDocument();
    expect(
      screen.getByText("(60% de tu capacidad mensual)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ahorrar US$ 26,67 por mes")).toBeInTheDocument();
    expect(
      screen.getByText("(40% de tu capacidad mensual)"),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: /Fondo para la compra/i }),
    ).not.toBeInTheDocument();
  });

  it("renders funding row with 0% allocation and absent monthly commitment behind disclosure", async () => {
    const user = userEvent.setup();
    const zeroAllocGoal = makeGoal({
      id: "goal-zero",
      funding: [
        {
          percentage: "0.00",
          monthlyContribution: undefined,
          allocatedBaseAmount: undefined,
          allocatedDestinationAmount: undefined,
          effectiveMonth: "2026-09",
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [zeroAllocGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Colchón financiero" }),
    );

    expect(screen.getByText("Sin aporte mensual")).toBeInTheDocument();
  });

  it("renders an edit button in the card heading and calls onEditGoal with goal ID", async () => {
    const user = userEvent.setup();
    const onEditGoal = vi.fn();
    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Colchón financiero",
      status: "active",
    });
    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} onEditGoal={onEditGoal} />);

    const editBtn = screen.getByRole("button", {
      name: "Editar objetivo Colchón financiero",
    });
    expect(editBtn).toBeInTheDocument();

    const heading = screen.getByRole("heading", {
      level: 3,
      name: "Colchón financiero",
    });
    expect(heading.parentElement).toContainElement(editBtn);

    await user.click(editBtn);
    expect(onEditGoal).toHaveBeenCalledTimes(1);
    expect(onEditGoal).toHaveBeenCalledWith("goal-1");
  });

  it("places Pausar objetivo immediately after Editar objetivo for active goals", () => {
    const onEditGoal = vi.fn();
    const onChangeGoalLifecycle = vi.fn();
    const activeWorkspace: GoalsWorkspaceType = makeWorkspace({
      groups: [
        {
          status: "active",
          goals: [
            makeGoal({
              id: "goal-1",
              name: "Colchón financiero",
              status: "active",
            }),
          ],
        },
      ],
    });

    render(
      <GoalsWorkspace
        workspace={activeWorkspace}
        onEditGoal={onEditGoal}
        onChangeGoalLifecycle={onChangeGoalLifecycle}
      />,
    );

    const controls = within(
      screen.getByRole("article", { name: "Colchón financiero" }),
    ).getAllByRole("button");
    expect(
      controls.map((button) => button.getAttribute("aria-label")),
    ).toContain("Pausar objetivo Colchón financiero");
    expect(
      controls.indexOf(
        screen.getByRole("button", {
          name: "Pausar objetivo Colchón financiero",
        }),
      ),
    ).toBeGreaterThan(
      controls.indexOf(
        screen.getByRole("button", {
          name: "Editar objetivo Colchón financiero",
        }),
      ),
    );
  });

  it("offers Reanudar objetivo for paused goals and no lifecycle action for completed goals", async () => {
    const user = userEvent.setup();
    const onEditGoal = vi.fn();
    const onChangeGoalLifecycle = vi.fn();
    const workspaceWithAllStatuses: GoalsWorkspaceType = makeWorkspace({
      groups: [
        {
          status: "active",
          goals: [
            makeGoal({
              id: "goal-1",
              name: "Colchón financiero",
              status: "active",
            }),
          ],
        },
        {
          status: "paused",
          goals: [makeGoal({ id: "goal-2", name: "Viaje", status: "paused" })],
        },
        {
          status: "completed",
          goals: [
            makeGoal({ id: "goal-3", name: "Laptop", status: "completed" }),
          ],
        },
      ],
    });

    render(
      <GoalsWorkspace
        workspace={workspaceWithAllStatuses}
        onEditGoal={onEditGoal}
        onChangeGoalLifecycle={onChangeGoalLifecycle}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Pausados/i }));
    await user.click(screen.getByRole("button", { name: /Completados/i }));
    expect(
      screen.getByRole("button", { name: "Reanudar objetivo Viaje" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Pausar objetivo Laptop" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reanudar objetivo Laptop" }),
    ).not.toBeInTheDocument();
  });

  it("calls onChangeGoalLifecycle with correct lifecycle action when clicking pause or resume", async () => {
    const user = userEvent.setup();
    const onChangeGoalLifecycle = vi.fn();
    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [
        {
          status: "active",
          goals: [
            makeGoal({
              id: "goal-1",
              name: "Colchón financiero",
              status: "active",
            }),
          ],
        },
        {
          status: "paused",
          goals: [makeGoal({ id: "goal-2", name: "Viaje", status: "paused" })],
        },
      ],
    });

    render(
      <GoalsWorkspace
        workspace={workspace}
        onChangeGoalLifecycle={onChangeGoalLifecycle}
      />,
    );

    const pauseBtn = screen.getByRole("button", {
      name: "Pausar objetivo Colchón financiero",
    });
    await user.click(pauseBtn);
    expect(onChangeGoalLifecycle).toHaveBeenCalledWith("goal-1", "pause");

    await user.click(screen.getByRole("button", { name: /Pausados/i }));
    const resumeBtn = screen.getByRole("button", {
      name: "Reanudar objetivo Viaje",
    });
    await user.click(resumeBtn);
    expect(onChangeGoalLifecycle).toHaveBeenCalledWith("goal-2", "resume");
  });

  it("renders saving contribution action history with amount, location, and keyboard-accessible controls under goal detail", async () => {
    const user = userEvent.setup();
    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Colchón financiero",
      status: "active",
      savingContributions: [
        {
          id: "contrib-1",
          kind: "saving",
          amount: "50000.00",
          currency: "ARS",
          placeName: "Banco Santander",
          createdAt: "2026-08-15T10:00:00Z",
          allocations: [
            {
              goalId: "goal-1",
              goalName: "Colchón financiero",
              amount: "50000.00",
              percentage: "100.00",
            },
          ],
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Colchón financiero" }),
    );

    const detailRegion = screen.getByRole("region", {
      name: "Detalles de Colchón financiero",
    });
    expect(within(detailRegion).getByText("$ 50.000,00")).toBeInTheDocument();
    expect(
      within(detailRegion).getByText("Banco Santander"),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).getByRole("button", { name: /Corregir aporte/i }),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).getByRole("button", { name: /Eliminar aporte/i }),
    ).toBeInTheDocument();
  });

  it("opens edit form on Corregir aporte and calls updateSavingContribution on submit", async () => {
    const user = userEvent.setup();
    vi.mocked(updateSavingContribution).mockResolvedValue({
      status: "updated",
    });

    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Colchón financiero",
      status: "active",
      savingContributions: [
        {
          id: "contrib-1",
          kind: "saving",
          amount: "50000.00",
          currency: "ARS",
          placeName: "Banco Santander",
          createdAt: "2026-08-15T10:00:00Z",
          allocations: [
            {
              goalId: "goal-1",
              goalName: "Colchón financiero",
              amount: "50000.00",
              percentage: "100.00",
            },
          ],
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Colchón financiero" }),
    );
    const editBtn = screen.getByRole("button", { name: /Corregir aporte/i });
    await user.click(editBtn);

    // Edit sheet opens with populated amount
    const amountInput = screen.getByLabelText(/monto en pesos/i);
    expect(amountInput).toHaveValue("50.000");

    await user.clear(amountInput);
    await user.type(amountInput, "75000");

    const saveBtn = screen.getByRole("button", {
      name: /guardar cambios|confirmar|actualizar/i,
    });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    await user.click(saveBtn);

    await waitFor(() => {
      expect(updateSavingContribution).toHaveBeenCalledWith({
        data: {
          contributionId: "contrib-1",
          draft: expect.objectContaining({
            currency: "ARS",
            amount: "75.000",
          }),
        },
      });
      expect(mockInvalidate).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("requires explicit confirmation before calling deleteSavingContribution", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteSavingContribution).mockResolvedValue({
      status: "deleted",
    });

    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Colchón financiero",
      status: "active",
      savingContributions: [
        {
          id: "contrib-1",
          kind: "saving",
          amount: "50000.00",
          currency: "ARS",
          placeName: "Banco Santander",
          createdAt: "2026-08-15T10:00:00Z",
          allocations: [
            {
              goalId: "goal-1",
              goalName: "Colchón financiero",
              amount: "50000.00",
              percentage: "100.00",
            },
          ],
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Colchón financiero" }),
    );
    const deleteBtn = screen.getByRole("button", { name: /Eliminar aporte/i });
    await user.click(deleteBtn);

    // Confirmation surface is visible
    expect(await screen.findByText(/¿Estás seguro/i)).toBeInTheDocument();
    expect(deleteSavingContribution).not.toHaveBeenCalled();

    // Confirm button inside confirmation dialog
    const confirmDeleteBtn = within(screen.getByRole("dialog")).getByRole(
      "button",
      { name: /eliminar aporte/i },
    );
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSavingContribution).toHaveBeenCalledWith({
        data: {
          contributionId: "contrib-1",
        },
      });
      expect(mockInvalidate).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("renders investment contribution in history with Inversión badge", async () => {
    const user = userEvent.setup();
    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Fondo de Inversión",
      strategy: "invest",
      status: "active",
      contributions: [
        {
          id: "contrib-inv-1",
          kind: "investment",
          amount: "100.00",
          currency: "USD",
          arsSpent: "120000.00",
          effectiveRate: "1200.00",
          createdAt: "2026-08-16T14:00:00Z",
          allocations: [
            {
              goalId: "goal-1",
              goalName: "Fondo de Inversión",
              amount: "100.00",
              percentage: "100.00",
            },
          ],
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Fondo de Inversión" }),
    );

    const detailRegion = screen.getByRole("region", {
      name: "Detalles de Fondo de Inversión",
    });
    expect(within(detailRegion).getByText("US$ 100,00")).toBeInTheDocument();
    expect(within(detailRegion).getByText("Inversión")).toBeVisible();
    expect(
      within(detailRegion).getByRole("button", {
        name: /Corregir aporte.*inversión/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(detailRegion).getByRole("button", {
        name: /Eliminar aporte.*inversión/i,
      }),
    ).toBeInTheDocument();
  });

  it("opens edit form for investment and preserves USD fields on correction submit", async () => {
    const user = userEvent.setup();
    vi.mocked(updateSavingContribution).mockResolvedValue({
      status: "updated",
    });

    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Fondo de Inversión",
      strategy: "invest",
      status: "active",
      contributions: [
        {
          id: "contrib-inv-1",
          kind: "investment",
          amount: "100.00",
          currency: "USD",
          arsSpent: "120000.00",
          effectiveRate: "1200.00",
          createdAt: "2026-08-16T14:00:00Z",
          allocations: [
            {
              goalId: "goal-1",
              goalName: "Fondo de Inversión",
              amount: "100.00",
              percentage: "100.00",
            },
          ],
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Fondo de Inversión" }),
    );
    const editBtn = screen.getByRole("button", {
      name: /Corregir aporte.*inversión/i,
    });
    await user.click(editBtn);

    // Edit sheet opens with title Corregir inversión and populated USD fields
    expect(screen.getByText("Corregir inversión")).toBeInTheDocument();
    const amountInput = screen.getByLabelText(/monto en dólares/i);
    expect(amountInput).toHaveValue("100");

    const rateInput = screen.getByLabelText(/tipo de cambio/i);
    expect(rateInput).toHaveValue("1.200");

    const arsSpentInput = screen.getByLabelText(/pesos gastados/i);
    expect(arsSpentInput).toHaveValue("120.000");

    await user.clear(amountInput);
    await user.type(amountInput, "150");

    const saveBtn = screen.getByRole("button", { name: /guardar cambios/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    await user.click(saveBtn);

    await waitFor(() => {
      expect(updateSavingContribution).toHaveBeenCalledWith({
        data: {
          contributionId: "contrib-inv-1",
          draft: expect.objectContaining({
            kind: "investment",
            currency: "USD",
            amount: "150",
          }),
        },
      });
      expect(mockInvalidate).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Inversión actualizada.");
    });
  });

  it("requires explicit confirmation before deleting an investment contribution", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteSavingContribution).mockResolvedValue({
      status: "deleted",
    });

    const activeGoal = makeGoal({
      id: "goal-1",
      name: "Fondo de Inversión",
      strategy: "invest",
      status: "active",
      contributions: [
        {
          id: "contrib-inv-1",
          kind: "investment",
          amount: "100.00",
          currency: "USD",
          arsSpent: "120000.00",
          effectiveRate: "1200.00",
          createdAt: "2026-08-16T14:00:00Z",
          allocations: [
            {
              goalId: "goal-1",
              goalName: "Fondo de Inversión",
              amount: "100.00",
              percentage: "100.00",
            },
          ],
        },
      ],
    });

    const workspace: GoalsWorkspaceType = makeWorkspace({
      groups: [{ status: "active", goals: [activeGoal] }],
    });

    render(<GoalsWorkspace workspace={workspace} />);

    await user.click(
      screen.getByRole("button", { name: "Ver detalle de Fondo de Inversión" }),
    );
    const deleteBtn = screen.getByRole("button", {
      name: /Eliminar aporte.*inversión/i,
    });
    await user.click(deleteBtn);

    // Confirmation surface is visible
    expect(
      await screen.findByText(
        /¿Estás seguro de que querés eliminar esta inversión\?/i,
      ),
    ).toBeInTheDocument();
    expect(deleteSavingContribution).not.toHaveBeenCalled();

    const confirmDeleteBtn = within(screen.getByRole("dialog")).getByRole(
      "button",
      { name: /eliminar inversión/i },
    );
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSavingContribution).toHaveBeenCalledWith({
        data: {
          contributionId: "contrib-inv-1",
        },
      });
      expect(mockInvalidate).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Inversión eliminada.");
    });
  });
});

describe("GoalsRouteStates", () => {
  it("renders GoalsLoading with 3 aria-hidden card skeletons and status text", () => {
    const { container } = render(<GoalsLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando objetivos…");
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    expect(skeletons[0]).toHaveClass("motion-reduce:animate-none");
  });

  it("disables card transitions for reduced-motion users", () => {
    const goal = makeGoal({});
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({
          groups: [{ status: "active", goals: [goal] }],
        })}
      />,
    );

    expect(
      screen.getByRole("article", { name: "Colchón financiero" }),
    ).toHaveClass("motion-reduce:transition-none");
  });

  it("renders GoalsError with alert role, neutral copy, and retry button", () => {
    const handleRetry = vi.fn();
    render(<GoalsError onRetry={handleRetry} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(/No pudimos cargar tus objetivos/i),
    ).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: "Reintentar" });
    expect(retryBtn).toBeInTheDocument();
    retryBtn.click();
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders a button trigger in populated workspace header and calls onNewGoal", () => {
    const handleNewGoal = vi.fn();
    const goal = makeGoal({});
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({
          groups: [{ status: "active", goals: [goal] }],
        })}
        onNewGoal={handleNewGoal}
      />,
    );

    const btn = screen.getByRole("button", { name: "Nuevo objetivo" });
    expect(btn).toHaveAttribute("id", "new-goal-trigger");
    btn.click();
    expect(handleNewGoal).toHaveBeenCalledTimes(1);
  });

  it("renders GoalsEmpty with explanation and a creation button trigger", () => {
    const handleNewGoal = vi.fn();
    render(<GoalsEmpty onNewGoal={handleNewGoal} />);

    expect(
      screen.getByRole("heading", { name: "No tenés objetivos registrados" }),
    ).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Nuevo objetivo" });
    expect(btn).toHaveAttribute("id", "new-goal-trigger");
    btn.click();
    expect(handleNewGoal).toHaveBeenCalledTimes(1);
  });
});
