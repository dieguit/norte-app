// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import { GoalNode } from "./RoadmapParts";

afterEach(cleanup);

const goal: GoalWorkspaceItem = {
  id: "goal-1",
  name: "Casa propia",
  type: "purchase",
  currency: "USD",
  priority: "high",
  strategy: "save",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  savingsValue: { amount: "9000.00", currency: "USD" },
  investmentValue: { amount: "0.00", currency: "USD" },
  actualValue: { amount: "9000.00", currency: "USD" },
  targetAmount: { amount: "50000.00", currency: "USD" },
  progressPercentage: "18.00",
  funding: [],
  projection: { status: "available", completionMonth: "2030-03" },
  usesPlanningRate: false,
  completionEligible: false,
};

describe("GoalNode", () => {
  it("shows progress, today amounts and an on-time badge", () => {
    render(
      <GoalNode
        goal={{ ...goal, desiredDateDeltaMonths: 0 }}
        currentMonth="2025-10"
      />,
    );

    expect(screen.getByText(/· En 4 años y 5 meses$/)).toBeVisible();
    expect(screen.getByText("18%")).toBeVisible();
    expect(screen.getByText("Hoy")).toBeVisible();
    expect(screen.getByText("US$ 9.000 de US$ 50.000")).toBeVisible();
    expect(screen.getByText("A tiempo")).toBeVisible();
  });

  it("flags late goals and hides progress when there is no target", () => {
    render(
      <GoalNode
        goal={{
          ...goal,
          targetAmount: undefined,
          progressPercentage: undefined,
          desiredDateDeltaMonths: 2,
        }}
        currentMonth="2025-10"
      />,
    );

    expect(screen.getByText("2 meses tarde")).toBeVisible();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.getByText("US$ 9.000")).toBeVisible();
  });

  it("omits the badge without a desired date", () => {
    render(<GoalNode goal={goal} currentMonth="2025-10" />);
    expect(screen.queryByText("A tiempo")).not.toBeInTheDocument();
  });
});
