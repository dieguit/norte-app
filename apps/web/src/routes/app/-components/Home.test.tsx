// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "./Home";
import type { InitialHomeState } from "../../../features/financial/financial";
import type { PreviousMonthShortfall } from "../../../features/contributions/saving-contribution";
import { getSavingContributionContext } from "../../../features/contributions/saving-contribution.functions";

import type { RoadmapData } from "@repo/shared-types";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import { getGoalCompletionContext } from "../../../features/goals/goals.functions";

vi.mock("../../../features/contributions/saving-contribution.functions", () => ({
  getSavingContributionContext: vi.fn().mockResolvedValue(null),
  previewSavingContribution: vi.fn().mockResolvedValue(null),
  confirmSavingContribution: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../../features/goals/goals.functions", () => ({
  getGoalCompletionContext: vi.fn(),
  previewGoalCompletion: vi.fn(),
  confirmGoalCompletion: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    invalidate: vi.fn(),
  }),
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("Home component", () => {
  const emptyRoadmap: RoadmapData = {
    undatedObjectives: [],
    futureMonths: [],
    currentMonth: {
      month: "2026-05",
      objectives: [],
      oneTimeExpenses: [],
      recurringExpenses: [],
      endingExpenses: [],
      oneTimeIncomes: [],
      recurringIncomes: [],
      contributions: [],
    },
    historyMonths: [],
  };

  const fixedSavingsHome: InitialHomeState = {
    income: { amount: "1000000.00", currency: "ARS" },
    expensesKnowledge: "known",
    expenses: { amount: "400000.00", currency: "ARS" },
    plan: {
      fundingMethod: "save",
      destinationCurrency: "ARS",
      monthlyCommitment: { amount: "100000.00", currency: "ARS" },
      destinationAmount: { amount: "100000.00", currency: "ARS" },
      effectiveMonth: "2026-09",
      allocationPercentage: "100.00",
    },
    goal: {
      type: "fixed_savings",
      name: "Quiero ahorrar cierta suma de dinero",
      targetAmount: { amount: "500000.00", currency: "ARS" },
      currentAmount: { amount: "0.00", currency: "ARS" },
      emergencyFundMonths: undefined,
    },
    previousMonthShortfalls: [],
  };

  const completionGoal = (overrides: Partial<GoalWorkspaceItem> = {}): GoalWorkspaceItem => ({
    id: "goal-completion-1",
    name: "Viaje a Bariloche",
    type: "purchase",
    currency: "ARS",
    priority: "high",
    strategy: "save",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    targetAmount: { amount: "500000.00", currency: "ARS" },
    savingsValue: { amount: "500000.00", currency: "ARS" },
    investmentValue: { amount: "0.00", currency: "ARS" },
    actualValue: { amount: "500000.00", currency: "ARS" },
    progressPercentage: "100.00",
    funding: [],
    projection: { status: "available", completionMonth: "2026-08" },
    usesPlanningRate: false,
    completionEligible: true,
    ...overrides,
  });

  it("titles the page with the roadmap month and shows no alert without shortfalls", () => {
    render(<Home home={fixedSavingsHome} roadmap={emptyRoadmap} now={new Date("2026-05-15T12:00:00Z")} />);

    expect(screen.getByRole("heading", { level: 1, name: "Inicio · Mayo 2026" })).toBeVisible();
    expect(screen.queryByText(/faltó/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cumpliste tus objetivos/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tu hoja de ruta" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Metas de mayo" })).toBeVisible();
    expect(screen.getByText("Todavía no hay aportes planificados para este mes.")).toBeVisible();
  });

  it("renders one strip per shortfall and opens the prefilled catch-up", async () => {
    const user = userEvent.setup();
    vi.setSystemTime(new Date("2026-05-15T12:00:00Z"));
    vi.mocked(getSavingContributionContext).mockResolvedValue({
      profile: "present",
      context: {
        currentMonth: "2026-05",
        eligibleGoals: [{ id: "goal-ars-1", name: "Viaje a Bariloche", percentage: "100.00" }],
        eligibleGoalsUsd: [{ id: "goal-usd-1", name: "Colchón financiero", percentage: "100.00" }],
        eligibleInvestmentGoals: [{ id: "goal-inv-ars", name: "CEDEARs ARS", percentage: "100.00" }],
        eligibleInvestmentGoalsUsd: [],
        places: [],
        investmentState: { ars: { status: "ready" }, usd: { status: "ready" } },
      },
    });
    const shortfalls: PreviousMonthShortfall[] = [
      { kind: "saving", currency: "USD", amount: { amount: "20.00", currency: "USD" } },
      { kind: "investment", currency: "ARS", amount: { amount: "25000.00", currency: "ARS" } },
    ];

    render(<Home home={{ ...fixedSavingsHome, previousMonthShortfalls: shortfalls }} roadmap={emptyRoadmap} now={new Date("2026-05-15T12:00:00Z")} />);

    const alerts = screen.getByRole("region", { name: "Pendientes de abril" });
    expect(within(alerts).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Abril: faltó ahorrar US$ 20")).toBeVisible();
    expect(screen.getByText("Abril: faltó invertir $ 25.000")).toBeVisible();

    const buttons = screen.getAllByRole("button", { name: "Ponerse al día" });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[1]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Registrar inversión" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ahorré ARS" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Monto en pesos")).toHaveValue("25.000");
    expect(screen.getByText("Este aporte se registrará para Abril de 2026.")).toBeVisible();
  });

  it("caps alerts at three and summarizes the rest in the last strip", () => {
    const shortfalls: PreviousMonthShortfall[] = [
      { kind: "saving", currency: "ARS", amount: { amount: "1000.00", currency: "ARS" } },
      { kind: "saving", currency: "USD", amount: { amount: "20.00", currency: "USD" } },
      { kind: "investment", currency: "ARS", amount: { amount: "3000.00", currency: "ARS" } },
      { kind: "investment", currency: "USD", amount: { amount: "40.00", currency: "USD" } },
    ];
    render(<Home home={{ ...fixedSavingsHome, previousMonthShortfalls: shortfalls }} roadmap={emptyRoadmap} now={new Date("2026-05-15T12:00:00Z")} />);

    const items = within(screen.getByRole("region", { name: "Pendientes de abril" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveTextContent("Abril: faltó invertir $ 3.000 y 1 más");
  });

  it("shows this month targets from the planned funding", () => {
    const funded = completionGoal({
      id: "goal-funded",
      completionEligible: false,
      projection: { status: "available", completionMonth: "2026-12" },
      funding: [{ percentage: "100.00", allocatedDestinationAmount: { amount: "250000.00", currency: "ARS" }, effectiveMonth: "2026-01-01" }],
    });
    const roadmap: RoadmapData = {
      ...emptyRoadmap,
      currentMonth: {
        ...emptyRoadmap.currentMonth,
        contributions: [{ id: "c1", kind: "saving", amount: "180000.00", currency: "ARS", createdAt: "2026-05-03T12:00:00.000Z", allocations: [] }],
      },
      futureMonths: [{ ...emptyRoadmap.currentMonth, month: "2026-12", contributions: [], objectives: [funded] }],
    };
    render(<Home home={fixedSavingsHome} roadmap={roadmap} />);

    const targets = screen.getByRole("region", { name: "Metas de mayo" });
    const row = within(targets).getByRole("listitem");
    expect(row).toHaveTextContent("Ahorro en pesos");
    expect(row).toHaveTextContent("$ 180.000 de $ 250.000");
    expect(row).toHaveTextContent("Falta");
    expect(row).toHaveTextContent("$ 70.000");
  });

  it("opens the four-action chooser from Registrar", async () => {
    const user = userEvent.setup();
    vi.mocked(getSavingContributionContext).mockResolvedValue({
      profile: "present",
      context: {
        currentMonth: "2026-08",
        eligibleGoals: [{ id: "goal-ars-1", name: "Viaje a Bariloche", percentage: "100.00" }],
        eligibleGoalsUsd: [{ id: "goal-usd-1", name: "Colchón financiero", percentage: "100.00" }],
        eligibleInvestmentGoals: [{ id: "goal-inv-ars", name: "CEDEARs ARS", percentage: "100.00" }],
        eligibleInvestmentGoalsUsd: [],
        places: [],
        investmentState: { ars: { status: "ready" }, usd: { status: "ready" } },
      },
    });

    render(<Home home={fixedSavingsHome} roadmap={emptyRoadmap} />);
    await user.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Ahorré ARS" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ahorré USD" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Invertí ARS" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Invertí USD" }));
    expect(await screen.findByRole("button", { name: "Confirmar inversión" })).toBeDisabled();
  });

  it("shows each eligible goal as reached in the route and opens the shared completion sheet", async () => {
    const user = userEvent.setup();
    vi.mocked(getGoalCompletionContext).mockResolvedValue({
      profile: "present",
      context: {
        goalId: "goal-completion-2",
        goalName: "Fondo de emergencia",
        targetAmount: { amount: "750000.00", currency: "ARS" },
        savingsValue: { amount: "750000.00", currency: "ARS" },
        currentMonth: "2026-08",
        savingsPlaces: [{ id: "place-1", name: "Caja", balance: { amount: "750000.00", currency: "ARS" } }],
        activeGoals: [{ id: "goal-completion-2", name: "Fondo de emergencia", currency: "ARS" }],
      },
    });
    const goals = [
      completionGoal(),
      completionGoal({ id: "goal-completion-2", name: "Fondo de emergencia", targetAmount: { amount: "750000.00", currency: "ARS" }, savingsValue: { amount: "750000.00", currency: "ARS" }, actualValue: { amount: "750000.00", currency: "ARS" } }),
    ];

    render(<Home home={fixedSavingsHome} roadmap={emptyRoadmap} completionGoals={goals} />);

    const route = screen.getByRole("region", { name: "Tu hoja de ruta" });
    expect(within(route).getAllByText("Alcanzado · Mayo 2026")).toHaveLength(2);
    expect(within(route).getByText("$ 500.000 de $ 500.000")).toBeVisible();
    expect(within(route).getByText("$ 750.000 de $ 750.000")).toBeVisible();
    expect(screen.queryByText("Tu hoja de ruta empieza hoy")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Completar Fondo de emergencia" }));
    expect(await screen.findByRole("heading", { name: "Completar objetivo" })).toBeVisible();
    expect(getGoalCompletionContext).toHaveBeenCalledWith({ data: { goalId: "goal-completion-2" } });
  });

  it("does not render completion actions without eligible goals", () => {
    render(<Home home={fixedSavingsHome} roadmap={emptyRoadmap} completionGoals={[]} />);
    expect(screen.queryByRole("button", { name: /^Completar/ })).not.toBeInTheDocument();
  });
});
