// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Roadmap } from "./Roadmap";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import type { RoadmapData, RoadmapMonth } from "@repo/shared-types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: React.ComponentProps<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const goal = {
  id: "goal-1",
  name: "Colchón de 3 meses",
  type: "emergency_fund",
  currency: "ARS",
  priority: "high",
  strategy: "save",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  savingsValue: { amount: "0.00", currency: "ARS" },
  investmentValue: { amount: "0.00", currency: "ARS" },
  actualValue: { amount: "0.00", currency: "ARS" },
  funding: [],
  projection: { status: "available", completionMonth: "2026-09" },
  usesPlanningRate: false,
  completionEligible: false,
} satisfies GoalWorkspaceItem;

const month = (value: string): RoadmapMonth => ({
  month: value,
  objectives: [],
  oneTimeExpenses: [],
  recurringExpenses: [],
  endingExpenses: [],
  oneTimeIncomes: [],
  recurringIncomes: [],
  contributions: [],
});

const roadmap: RoadmapData = {
  undatedObjectives: [
    {
      ...goal,
      id: "goal-2",
      name: "Viaje",
      projection: { status: "commitment_absent" },
    },
  ],
  futureMonths: [
    {
      ...month("2026-09"),
      objectives: [goal],
      recurringExpenses: [
        {
          id: "rent",
          sourceKind: "housing",
          sourceId: null,
          sourceName: "Vivienda",
          concept: null,
          amount: "900000.00",
          currency: "ARS",
          recurring: true,
          effectiveMonth: "2026-08",
          endMonth: null,
        },
      ],
      recurringIncomes: [
        {
          id: "salary",
          sourceKind: "salary",
          sourceId: null,
          sourceName: "Sueldo",
          concept: null,
          amount: "3000000.00",
          currency: "ARS",
          recurring: true,
          effectiveMonth: "2026-08",
        },
      ],
    },
  ],
  currentMonth: {
    ...month("2026-08"),
    recurringExpenses: [
      {
        id: "rent",
        sourceKind: "housing",
        sourceId: null,
        sourceName: "Vivienda",
        concept: null,
        amount: "900000.00",
        currency: "ARS",
        recurring: true,
        effectiveMonth: "2026-08",
        endMonth: null,
      },
    ],
    recurringIncomes: [
      {
        id: "salary",
        sourceKind: "salary",
        sourceId: null,
        sourceName: "Sueldo",
        concept: null,
        amount: "3000000.00",
        currency: "ARS",
        recurring: true,
        effectiveMonth: "2026-08",
      },
    ],
  },
  historyMonths: [month("2026-07"), month("2026-06")],
};

describe("Roadmap component", () => {
  it("discloses history one month at a time above the current position", async () => {
    const user = userEvent.setup();
    render(<Roadmap roadmap={roadmap} />);

    expect(
      screen.getByRole("heading", { name: "Tu hoja de ruta" }),
    ).toBeVisible();
    expect(screen.getByText("Aportes y objetivos proyectados")).toBeVisible();
    expect(screen.queryByText("Julio 2026")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Ver meses anteriores" }),
    );
    expect(screen.getByRole("heading", { name: "Julio 2026" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Ver meses anteriores" }),
    );
    expect(
      screen.queryByRole("button", { name: "Ver meses anteriores" }),
    ).not.toBeInTheDocument();

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Junio 2026",
      "Julio 2026",
      "Estás acá · Agosto 2026",
      "Sin fecha proyectada",
    ]);
    expect(screen.getAllByText("Sin aportes registrados")).toHaveLength(2);
  });

  it("shows projected goals and no per-month income or expense breakdown", () => {
    render(<Roadmap roadmap={roadmap} />);

    expect(
      screen.getByRole("heading", { level: 4, name: "Colchón de 3 meses" }),
    ).toBeVisible();
    expect(screen.getByText(/· En 1 mes$/)).toBeVisible();
    expect(
      screen.queryByRole("region", { name: /Gastos previstos/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Vivienda")).not.toBeInTheDocument();
  });

  it("totals what is saved for active goals at the current position", () => {
    render(
      <Roadmap
        roadmap={{
          ...roadmap,
          futureMonths: [
            {
              ...month("2026-09"),
              objectives: [
                {
                  ...goal,
                  actualValue: { amount: "1820000.00", currency: "ARS" },
                },
              ],
            },
          ],
          undatedObjectives: [
            {
              ...goal,
              id: "usd",
              name: "Viaje",
              currency: "USD",
              actualValue: { amount: "2350.00", currency: "USD" },
              projection: { status: "commitment_absent" },
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText("Llevás ahorrado para tus objetivos"),
    ).toBeVisible();
    const totals = screen.getByText(
      "Llevás ahorrado para tus objetivos",
    ).nextElementSibling!;
    expect(totals).toHaveTextContent("$ 1.820.000");
    expect(totals).toHaveTextContent("US$ 2.350");
  });

  it("lists undated goals after the timeline with a plan link", () => {
    render(<Roadmap roadmap={roadmap} />);

    const current = screen.getByRole("heading", {
      name: "Estás acá · Agosto 2026",
    });
    const undated = screen.getByRole("heading", {
      name: "Sin fecha proyectada",
    });
    expect(
      current.compareDocumentPosition(undated) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Sin aporte mensual")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Planificar Viaje" }),
    ).toHaveAttribute("href", "/app/goals");
  });

  it("marks the last closed month as fulfilled or short", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Roadmap roadmap={roadmap} closedMonth="2026-07" shortfalls={[]} />,
    );
    await user.click(
      screen.getByRole("button", { name: "Ver meses anteriores" }),
    );
    expect(screen.getByText("Cumplido")).toBeVisible();

    rerender(
      <Roadmap
        roadmap={roadmap}
        closedMonth="2026-07"
        shortfalls={[
          {
            kind: "saving",
            currency: "USD",
            amount: { amount: "120.00", currency: "USD" },
          },
        ]}
      />,
    );
    expect(screen.getByText("Faltó US$ 120")).toBeVisible();
  });

  it("renders a reached goal once, with its completion action and reallocation note", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const reached = {
      ...goal,
      progressPercentage: "100.00",
      targetAmount: { amount: "250000.00", currency: "ARS" as const },
      actualValue: { amount: "250000.00", currency: "ARS" as const },
      funding: [{ percentage: "40.00", effectiveMonth: "2026-01-01" }],
      completionEligible: true,
    };
    render(
      <Roadmap
        roadmap={roadmap}
        completionGoals={[reached]}
        onComplete={onComplete}
      />,
    );

    expect(
      screen.getAllByRole("heading", { name: "Colchón de 3 meses" }),
    ).toHaveLength(1);
    expect(screen.getByText("Alcanzado · Agosto 2026")).toBeVisible();
    expect(
      screen.getByText("Al completarlo, su 40% se reparte entre los demás"),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Completar Colchón de 3 meses" }),
    );
    expect(onComplete).toHaveBeenCalledWith("goal-1");
  });

  it("renders empty roadmap state when there is no activity", () => {
    render(
      <Roadmap
        roadmap={{
          undatedObjectives: [],
          futureMonths: [],
          currentMonth: month("2026-08"),
          historyMonths: [],
        }}
      />,
    );

    expect(screen.getByText("Tu hoja de ruta empieza hoy")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Finanzas" })).toHaveAttribute(
      "href",
      "/app/finances",
    );
    expect(
      screen.getByRole("link", { name: "Ir a Objetivos" }),
    ).toHaveAttribute("href", "/app/goals");
  });

  it("lists goals completed this month at the current position", () => {
    const completedGoal = {
      ...goal,
      id: "completed-goal",
      name: "Viaje cumplido",
      status: "completed" as const,
      completedAt: "2026-08-15T00:00:00.000Z",
    };
    render(
      <Roadmap
        roadmap={{
          ...roadmap,
          currentMonth: {
            ...roadmap.currentMonth,
            objectives: [completedGoal],
          },
        }}
      />,
    );

    expect(screen.getByText("Cumpliste Viaje cumplido")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Viaje cumplido" }),
    ).not.toBeInTheDocument();
  });
});
