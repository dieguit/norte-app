import { describe, expect, it } from "vitest";
import type { RoadmapData, RoadmapMonth } from "@repo/shared-types";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import { activeGoals, contributedLabel, monthTargets, monthsAway, shortMoney } from "./home-view";

const goal = (overrides: Partial<GoalWorkspaceItem> = {}): GoalWorkspaceItem => ({
  id: "g1",
  name: "Zapas",
  type: "purchase",
  currency: "ARS",
  priority: "high",
  strategy: "save",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  savingsValue: { amount: "0.00", currency: "ARS" },
  investmentValue: { amount: "0.00", currency: "ARS" },
  actualValue: { amount: "0.00", currency: "ARS" },
  funding: [],
  projection: { status: "available", completionMonth: "2026-12" },
  usesPlanningRate: false,
  completionEligible: false,
  ...overrides,
});

const fund = (effectiveMonth: string, amount: string, currency: "ARS" | "USD" = "ARS") => ({
  percentage: "40.00",
  allocatedDestinationAmount: { amount, currency },
  effectiveMonth,
});

const contribution = (kind: "saving" | "investment", amount: string, currency: "ARS" | "USD"): RoadmapMonth["contributions"][number] => ({
  id: `${kind}-${currency}-${amount}`,
  kind,
  amount,
  currency,
  createdAt: "2026-10-05T12:00:00.000Z",
  allocations: [],
});

const month = (value: string, objectives: GoalWorkspaceItem[] = []): RoadmapMonth => ({
  month: value,
  objectives,
  oneTimeExpenses: [],
  recurringExpenses: [],
  endingExpenses: [],
  oneTimeIncomes: [],
  recurringIncomes: [],
  contributions: [],
});

describe("monthTargets", () => {
  it("sums the funding active this month per kind and currency and subtracts this month's contributions", () => {
    const goals = [
      goal({ funding: [fund("2026-01-01", "100000.00"), fund("2026-10-01", "150000.00"), fund("2026-11-01", "999.00")] }),
      goal({ id: "g2", funding: [fund("2026-09-01", "100000.00")] }),
      goal({ id: "g3", currency: "USD", funding: [fund("2026-09-01", "628.00", "USD")] }),
      goal({ id: "g4", strategy: "invest", funding: [fund("2026-09-01", "100000.00")] }),
    ];
    const targets = monthTargets(
      goals,
      [
        contribution("saving", "180000.00", "ARS"),
        contribution("saving", "200.00", "USD"),
        contribution("saving", "-5.00", "USD"),
        contribution("investment", "120000.00", "ARS"),
      ],
      "2026-10",
    );

    expect(targets.map((t) => [t.label, t.target.amount, t.contributed.amount, t.missing.amount])).toEqual([
      ["Ahorro en pesos", "250000.00", "180000.00", "70000.00"],
      ["Ahorro en dólares", "628.00", "200.00", "428.00"],
      ["Inversión en pesos", "100000.00", "120000.00", "0.00"],
    ]);
    expect(targets[0].share).toBeCloseTo(0.72);
    expect(targets[2].share).toBe(1);
  });

  it("returns no targets without planned funding", () => {
    expect(monthTargets([goal()], [contribution("saving", "10.00", "ARS")], "2026-10")).toEqual([]);
  });
});

describe("monthsAway", () => {
  it.each([
    ["2026-10", "2026-10", "Este mes"],
    ["2026-10", "2026-11", "En 1 mes"],
    ["2026-10", "2027-01", "En 3 meses"],
    ["2026-10", "2027-10", "En 1 año"],
    ["2026-10", "2031-03", "En 4 años y 5 meses"],
  ])("%s → %s = %s", (from, to, label) => {
    expect(monthsAway(from, to)).toBe(label);
  });
});

describe("labels and goal collection", () => {
  it("formats contributed currencies without zero parts", () => {
    expect(contributedLabel([contribution("saving", "230000.00", "ARS"), contribution("investment", "600.00", "USD")])).toBe("Aportaste $ 230.000 · US$ 600");
    expect(contributedLabel([contribution("saving", "20.50", "USD")])).toBe("Aportaste US$ 20,50");
    expect(contributedLabel([])).toBe("Sin aportes registrados");
    expect(shortMoney({ amount: "70000.00", currency: "ARS" })).toBe("$ 70.000");
  });

  it("collects each non-completed goal once across the roadmap", () => {
    const roadmap: RoadmapData = {
      undatedObjectives: [goal({ id: "undated" })],
      futureMonths: [month("2026-12", [goal()])],
      currentMonth: month("2026-10", [goal(), goal({ id: "done", status: "completed" })]),
      historyMonths: [],
    };
    expect(activeGoals(roadmap).map((item) => item.id)).toEqual(["g1", "undated"]);
  });
});
