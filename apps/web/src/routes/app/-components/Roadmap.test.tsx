// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Roadmap } from "./Roadmap";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import type {
  RoadmapData,
  RoadmapMonth,
} from "../../../features/roadmap/roadmap";

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
  it("renders topology and progressively discloses chronological history", async () => {
    const user = userEvent.setup();
    render(<Roadmap roadmap={roadmap} />);

    expect(
      screen.getByRole("heading", { name: "Tu hoja de ruta" }),
    ).toBeVisible();
    expect(screen.getByText(/Hoy/)).toBeVisible();
    expect(screen.getByText("Historial")).toBeVisible();
    expect(
      screen.getByText("Septiembre de 2026").closest("section"),
    ).toHaveClass("py-3");
    expect(
      screen.getByRole("region", {
        name: "Gastos previstos para Agosto de 2026",
      }),
    ).toHaveAttribute("data-side", "left");
    expect(
      screen.getByRole("region", {
        name: "Ingresos y aportes para Agosto de 2026",
      }),
    ).toHaveAttribute("data-side", "right");
    expect(
      screen.getByRole("heading", { name: "Colchón de 3 meses" }),
    ).toHaveAttribute("data-roadmap-objective", "full-width");
    const projectedGoalCard = screen
      .getByRole("heading", { name: "Colchón de 3 meses" })
      .closest("article");
    expect(projectedGoalCard).toHaveClass("bg-[var(--surface-strong)]");
    expect(projectedGoalCard).not.toHaveClass("backdrop-blur-md");
    expect(
      screen.getByRole("heading", { name: "Viaje" }).closest("article"),
    ).toHaveClass("bg-[var(--surface-strong)]");
    expect(screen.queryByText("Julio de 2026")).not.toBeInTheDocument();
    expect(screen.queryByText("Junio de 2026")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cargar Julio de 2026" }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Cargar Julio de 2026" }),
    );
    expect(screen.getByText("Julio de 2026")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cargar Junio de 2026" }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Cargar Junio de 2026" }),
    );
    expect(screen.getByText("Junio de 2026")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /^Cargar/ }),
    ).not.toBeInTheDocument();

    expect(
      [...screen.getByText("Historial").parentElement!.querySelectorAll("h3")].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(["Junio de 2026", "Julio de 2026"]);
  });

  it("does not render income or expense sections for future months", () => {
    render(<Roadmap roadmap={roadmap} />);

    expect(
      screen.queryByRole("region", {
        name: "Gastos previstos para Septiembre de 2026",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", {
        name: "Ingresos y aportes para Septiembre de 2026",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders undated objectives after the timeline", () => {
    render(<Roadmap roadmap={roadmap} />);

    const todayHeading = screen.getByRole("heading", { name: /Hoy/ });
    const undatedHeading = screen.getByRole("heading", {
      name: "Sin fecha proyectada",
    });

    expect(
      todayHeading.compareDocumentPosition(undatedHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders empty roadmap state when there is no activity", () => {
    const emptyRoadmap: RoadmapData = {
      undatedObjectives: [],
      futureMonths: [],
      currentMonth: month("2026-08"),
      historyMonths: [],
    };
    render(<Roadmap roadmap={emptyRoadmap} />);

    expect(screen.getByText("Tu hoja de ruta empieza hoy")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Finanzas" })).toHaveAttribute(
      "href",
      "/app/finances",
    );
    expect(
      screen.getByRole("link", { name: "Ir a Objetivos" }),
    ).toHaveAttribute("href", "/app/goals");
  });

  it("distinguishes completed milestones with explicit success text and icon", () => {
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

    const completedCard = screen
      .getByRole("heading", { name: "Viaje cumplido" })
      .closest("article");
    expect(completedCard).toHaveClass(
      "border-[var(--lagoon-deep)]/35",
      "bg-[var(--lagoon)]/90",
    );
    expect(completedCard).not.toHaveClass("bg-[var(--lagoon)]/25");
    const completedLabelText = within(completedCard!).getByText(
      "Objetivo completado",
    );
    expect(completedLabelText).toBeVisible();
    const completedLabel = completedLabelText.closest("p");
    expect(completedLabel).toHaveClass("text-[var(--sea-ink)]");
    expect(
      completedCard?.querySelector("svg.lucide-circle-check"),
    ).toHaveAttribute("aria-hidden", "true");
    const projectedLabelText = screen.getByText("Objetivo proyectado");
    expect(projectedLabelText).toBeVisible();
    expect(projectedLabelText.closest("p")).toHaveClass("text-[var(--palm)]");
  });
});
