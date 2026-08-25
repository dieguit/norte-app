// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinancialSummaryCards } from "./FinancialSummaryCards";

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
}));

afterEach(cleanup);

const summary = {
  month: "2026-08",
  income: { amount: "300000.00", currency: "ARS" as const },
  expenses: { amount: "100000.00", currency: "ARS" as const },
  balance: { amount: "200000.00", currency: "ARS" as const },
  dedicationPercentage: "90",
  contribution: { amount: "180000.00", currency: "ARS" as const },
};

describe("FinancialSummaryCards", () => {
  it("keeps goals actions in goals mode", async () => {
    const user = userEvent.setup();
    const onChangePlanning = vi.fn();
    render(
      <FinancialSummaryCards
        mode="goals"
        summary={summary}
        onChangePlanning={onChangePlanning}
      />,
    );

    expect(screen.getByRole("link", { name: "Ver finanzas" })).toHaveAttribute(
      "href",
      "/app/finances",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Cambiar planificación de objetivos",
      }),
    );
    expect(onChangePlanning).toHaveBeenCalledOnce();
  });

  it("uses finances navigation in finances mode", () => {
    render(<FinancialSummaryCards mode="finances" summary={summary} />);

    const region = screen.getByRole("region", {
      name: "Resumen mensual para objetivos",
    });
    expect(
      within(region).getByRole("heading", {
        name: "Finanzas de Agosto de 2026",
      }),
    ).toBeInTheDocument();
    expect(
      within(region).queryByRole("link", { name: "Ver finanzas" }),
    ).not.toBeInTheDocument();
    expect(
      within(region).getByRole("link", {
        name: "Cambiar planificación en objetivos",
      }),
    ).toHaveAttribute("href", "/app/goals");
  });

  it("keeps the finances link available for a non-positive balance", () => {
    render(
      <FinancialSummaryCards
        mode="finances"
        summary={{
          ...summary,
          balance: { amount: "-1.00", currency: "ARS" },
          contribution: { amount: "0.00", currency: "ARS" },
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Cambiar planificación en objetivos" }),
    ).toHaveAttribute("href", "/app/goals");
  });
});
