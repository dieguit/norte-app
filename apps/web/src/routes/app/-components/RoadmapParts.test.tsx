// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoadmapTimeline } from "./RoadmapParts";
import type { RoadmapMonth } from "../../../features/roadmap/roadmap";

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

function expense({
  id,
  sourceKind,
  concept,
  amount,
  currency,
}: {
  id: string;
  sourceKind: string;
  concept: string | null;
  amount: string;
  currency: "ARS" | "USD";
}): RoadmapMonth["oneTimeExpenses"][number] {
  return {
    id,
    sourceKind,
    sourceId: null,
    sourceName: "Vivienda",
    concept,
    amount,
    currency,
    recurring: false,
    effectiveMonth: "2026-09",
    endMonth: null,
  };
}

function contribution({
  id,
  amount,
  currency,
  kind,
}: {
  id: string;
  amount: string;
  currency: "ARS" | "USD";
  kind: "saving" | "investment";
}): RoadmapMonth["contributions"][number] {
  return {
    id,
    amount,
    currency,
    kind,
    createdAt: "2026-09-01T00:00:00.000Z",
    allocations: [],
  };
}

describe("RoadmapParts - Financial grouping", () => {
  it("expands a category to show inline concept totals while keeping contributions itemized", async () => {
    const user = userEvent.setup();
    const currentMonth: RoadmapMonth = {
      month: "2026-09",
      objectives: [],
      recurringExpenses: [],
      endingExpenses: [],
      oneTimeIncomes: [],
      recurringIncomes: [],
      contributions: [
        contribution({
          id: "contrib-1",
          amount: "500.00",
          currency: "ARS",
          kind: "saving",
        }),
      ],
      oneTimeExpenses: [
        expense({
          id: "rent-1",
          sourceKind: "housing",
          concept: "Alquiler",
          amount: "100.25",
          currency: "ARS",
        }),
        expense({
          id: "rent-2",
          sourceKind: "housing",
          concept: "Alquiler",
          amount: "50.75",
          currency: "ARS",
        }),
        expense({
          id: "housing-blank",
          sourceKind: "housing",
          concept: " ",
          amount: "25.00",
          currency: "ARS",
        }),
        expense({
          id: "housing-usd",
          sourceKind: "housing",
          concept: null,
          amount: "10.00",
          currency: "USD",
        }),
      ],
    };

    render(<RoadmapTimeline futureMonths={[]} currentMonth={currentMonth} />);

    const arsCategory = screen.getByRole("button", {
      name: /Alquiler \/ vivienda:\s*\$176,00/,
    });

    expect(arsCategory).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Alquiler: $151,00")).not.toBeInTheDocument();
    expect(screen.getByText("$176,00")).toBeInTheDocument();

    await user.click(arsCategory);

    expect(arsCategory).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText((_, element) => element?.textContent === "Alquiler: $151,00")
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Sin concepto: $25,00")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Alquiler \/ vivienda:\s*US\$10,00/ })
    ).toBeInTheDocument();

    // Verify contribution remains itemized and rendered once with label and amount
    expect(screen.getByText("Ahorro")).toBeInTheDocument();
    expect(screen.getByText("$ 500,00")).toBeInTheDocument();
  });
});
