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
    previewSavingContributionEdit: vi.fn(async ({ data }: { data: { draft: unknown } }) => ({ preview: { draft: data.draft, allocations: [] }, previewToken: '' })),
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

function makeGoal(overrides: Partial<GoalWorkspaceItem> = {}): GoalWorkspaceItem {
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
    completionEligible: false,
    ...overrides,
  };
}

type User = ReturnType<typeof userEvent.setup>;

async function openMenu(user: User, name: string) {
  await user.click(screen.getByRole("button", { name: `Más acciones de ${name}` }));
}

async function openDetail(user: User, name: string) {
  await openMenu(user, name);
  await user.click(await screen.findByRole("button", { name: "Ver detalle" }));
  return screen.findByRole("dialog", { name });
}

async function openContributionActions(user: User) {
  await user.click(screen.getByRole("button", { name: /^Acciones del aporte/ }));
}

describe("GoalsWorkspace component", () => {
  it("lists active goals by projected month under Activos with meta, progress and Hoy", () => {
    const zapas = makeGoal({
      id: "zapas", name: "Zapas", currency: "ARS",
      targetAmount: { amount: "250000.00", currency: "ARS" }, actualValue: { amount: "180000.00", currency: "ARS" }, progressPercentage: "72.00",
      projection: { status: "available", completionMonth: "2026-12" },
      funding: [{ percentage: "30.00", allocatedDestinationAmount: { amount: "45954.00", currency: "ARS" }, effectiveMonth: "2026-08-01" }],
    });
    const colchon = makeGoal({ id: "colchon", projection: { status: "available", completionMonth: "2027-01" } });
    const viaje = makeGoal({ id: "viaje", name: "Viaje a Japón", funding: [], actualValue: { amount: "0.00", currency: "USD" }, projection: { status: "no_future_allocation" } });
    render(<GoalsWorkspace workspace={makeWorkspace({ groups: [{ status: "active", goals: [viaje, colchon, zapas] }] })} />);

    expect(screen.getByRole("heading", { level: 2, name: "Activos" })).toBeInTheDocument();
    expect(screen.getByText("Por fecha proyectada")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Zapas", "Colchón financiero", "Viaje a Japón"]);
    expect(screen.getByText("Dic 2026")).toBeInTheDocument();
    expect(screen.getByText("Ahorro · ARS · recibe 30%")).toBeInTheDocument();
    expect(screen.getByText("Sin fecha · no recibe aportes")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progreso de Zapas" })).toHaveAttribute("aria-valuenow", "72");
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("$ 180.000 de $ 250.000", { exact: false }).closest("p")).toHaveTextContent("Hoy $ 180.000 de $ 250.000");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders the monthly plan with the split legend sorted by share", async () => {
    const user = userEvent.setup();
    const onChangePlanning = vi.fn();
    const a = makeGoal({ id: "a", name: "Zapas", funding: [{ percentage: "30.00", allocatedDestinationAmount: { amount: "459540.00", currency: "ARS" }, effectiveMonth: "2026-08-01" }] });
    const b = makeGoal({ id: "b", name: "Colchón financiero", funding: [{ percentage: "60.00", allocatedDestinationAmount: { amount: "959.00", currency: "USD" }, effectiveMonth: "2026-08-01" }] });
    render(<GoalsWorkspace workspace={makeWorkspace({ groups: [{ status: "active", goals: [a, b] }] })} onChangePlanning={onChangePlanning} />);

    const plan = screen.getByRole("region", { name: "Tu plan mensual" });
    expect(within(plan).getByText("90%")).toBeInTheDocument();
    expect(within(plan).getByText("de tu saldo · ≈ $ 135.000")).toBeInTheDocument();
    expect(within(plan).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Colchón financiero60%US$ 959/mes",
      "Zapas30%$ 459.540/mes",
    ]);
    await user.click(within(plan).getByRole("button", { name: "Cambiar planificación de objetivos" }));
    expect(onChangePlanning).toHaveBeenCalledTimes(1);
  });

  it("disables planning entry points when the balance is zero or negative", async () => {
    const user = userEvent.setup();
    const undated = makeGoal({ id: "u", name: "Viaje", funding: [], projection: { status: "no_future_allocation" } });
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({ financialSummary: makeFinancialSummary({ balance: { amount: "0.00", currency: "ARS" } }), groups: [{ status: "active", goals: [makeGoal({}), undated] }] })}
        onChangePlanning={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Cambiar planificación de objetivos" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Asignar aportes a Viaje" })).not.toBeInTheDocument();
    const detail = await openDetail(user, "Colchón financiero");
    expect(within(detail).queryByRole("button", { name: /Cambiar plan de/ })).not.toBeInTheDocument();
  });

  it("offers Asignar on unfunded undated goals", async () => {
    const user = userEvent.setup();
    const onChangePlanning = vi.fn();
    const undated = makeGoal({ id: "u", name: "Viaje", funding: [], projection: { status: "no_future_allocation" } });
    render(<GoalsWorkspace workspace={makeWorkspace({ groups: [{ status: "active", goals: [makeGoal({}), undated] }] })} onChangePlanning={onChangePlanning} />);
    expect(screen.getAllByRole("button", { name: /^Asignar aportes a/ })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Asignar aportes a Viaje" }));
    expect(onChangePlanning).toHaveBeenCalledTimes(1);
  });

  it("hides the plan and Activos when there are no active goals", () => {
    render(<GoalsWorkspace workspace={makeWorkspace({ groups: [{ status: "paused", goals: [makeGoal({ status: "paused" })] }] })} />);
    expect(screen.queryByRole("region", { name: "Tu plan mensual" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Activos" })).not.toBeInTheDocument();
  });

  it("keeps paused and completed goals in collapsed groups with counts", async () => {
    const user = userEvent.setup();
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({
          groups: [
            { status: "active", goals: [makeGoal({})] },
            { status: "paused", goals: [makeGoal({ id: "p", name: "Vacaciones en Brasil", status: "paused", projection: { status: "plan_paused" } })] },
            { status: "completed", goals: [makeGoal({ id: "c", name: "Comprar laptop", status: "completed", completedAt: "2026-03-15T00:00:00Z" })] },
          ],
        })}
      />,
    );
    const paused = screen.getByRole("button", { name: /Pausados/ });
    expect(paused).toHaveAttribute("aria-expanded", "false");
    expect(paused).toHaveTextContent("Pausados1");
    expect(screen.queryByText("Vacaciones en Brasil")).not.toBeInTheDocument();
    await user.click(paused);
    expect(screen.getByText("Vacaciones en Brasil")).toBeInTheDocument();
    expect(screen.getByText("Proyección pausada · recibe 100%")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Completados/ }));
    expect(screen.getByText("Cumplido · Marzo de 2026")).toBeInTheDocument();
  });

  it("offers menu actions according to status and eligibility", async () => {
    const user = userEvent.setup();
    const onEditGoal = vi.fn();
    const onChangeGoalLifecycle = vi.fn();
    const onCompleteGoal = vi.fn();
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({
          groups: [
            { status: "active", goals: [makeGoal({ completionEligible: true })] },
            { status: "paused", goals: [makeGoal({ id: "p", name: "Viaje", status: "paused", projection: { status: "plan_paused" } })] },
            { status: "completed", goals: [makeGoal({ id: "c", name: "Laptop", status: "completed" })] },
          ],
        })}
        onEditGoal={onEditGoal}
        onChangeGoalLifecycle={onChangeGoalLifecycle}
        onCompleteGoal={onCompleteGoal}
      />,
    );

    await openMenu(user, "Colchón financiero");
    expect(["Ver detalle", "Editar", "Pausar", "Marcar como cumplido"].every((name) => screen.getByRole("button", { name }))).toBe(true);
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(onEditGoal).toHaveBeenCalledWith("goal-1");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Ver detalle" })).not.toBeInTheDocument());

    await openMenu(user, "Colchón financiero");
    await user.click(screen.getByRole("button", { name: "Marcar como cumplido" }));
    expect(onCompleteGoal).toHaveBeenCalledWith("goal-1");

    await user.click(screen.getByRole("button", { name: /Pausados/ }));
    await openMenu(user, "Viaje");
    await user.click(screen.getByRole("button", { name: "Reanudar" }));
    expect(onChangeGoalLifecycle).toHaveBeenCalledWith("p", "resume");

    await user.click(screen.getByRole("button", { name: /Completados/ }));
    await openMenu(user, "Laptop");
    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Editar|Pausar|Reanudar|Marcar como cumplido)$/ })).not.toBeInTheDocument();
  });

  it("renders unknown targets without progress and keeps Hoy with the actual value", () => {
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({
          groups: [{ status: "active", goals: [makeGoal({ targetAmount: undefined, progressPercentage: undefined, actualValue: { amount: "150.00", currency: "USD" }, projection: { status: "target_unavailable" } })] }],
        })}
      />,
    );
    expect(screen.getByText("Objetivo por calcular · recibe 100%")).toBeInTheDocument();
    expect(screen.getByText("US$ 150", { exact: false }).closest("p")).toHaveTextContent("Hoy US$ 150");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("keeps progress text above 100 while capping the bar", () => {
    render(<GoalsWorkspace workspace={makeWorkspace({ groups: [{ status: "active", goals: [makeGoal({ progressPercentage: "125.00" })] }] })} />);
    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progreso de Colchón financiero" })).toHaveAttribute("aria-valuenow", "100");
  });

  it("shows the detail sheet with summary, plan and avances, and closes before running an action", async () => {
    const user = userEvent.setup();
    const onChangeGoalLifecycle = vi.fn();
    const goal = makeGoal({
      targetAmount: { amount: "3000.00", currency: "USD" }, actualValue: { amount: "1400.00", currency: "USD" },
      savingsValue: { amount: "1400.00", currency: "USD" }, investmentValue: { amount: "0.00", currency: "USD" },
      progressPercentage: "46.67", desiredDate: "2026-12-01",
      projection: { status: "available", completionMonth: "2027-01" },
      funding: [{ percentage: "60.00", allocatedDestinationAmount: { amount: "959.00", currency: "USD" }, effectiveMonth: "2026-10-01" }],
    });
    render(
      <GoalsWorkspace
        workspace={makeWorkspace({ financialSummary: makeFinancialSummary({ month: "2026-10" }), groups: [{ status: "active", goals: [goal] }] })}
        onChangeGoalLifecycle={onChangeGoalLifecycle}
        onChangePlanning={vi.fn()}
      />,
    );
    const detail = await openDetail(user, "Colchón financiero");
    expect(within(detail).getByText("Ahorro · USD · Prioridad alta")).toBeInTheDocument();
    expect(within(detail).getByText("de US$ 3.000", { exact: false })).toBeInTheDocument();
    expect(within(detail).getByText("47%")).toBeInTheDocument();
    expect(within(detail).getByText("Llega").nextSibling).toHaveTextContent("Ene 2027");
    expect(within(detail).getByText("Deseado").nextSibling).toHaveTextContent("Dic 2026");
    expect(within(detail).getByText("≈ US$ 959 por mes")).toBeInTheDocument();
    expect(within(detail).getByText("60% de tu aporte mensual · desde oct 2026")).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: "Cambiar plan de Colchón financiero" })).toBeInTheDocument();
    expect(within(detail).getByText("Inversiones").nextSibling).toHaveTextContent("—");
    expect(within(detail).queryByText("Historial de aportes")).not.toBeInTheDocument();

    await user.click(within(detail).getByRole("button", { name: "Pausar" }));
    expect(onChangeGoalLifecycle).toHaveBeenCalledWith("goal-1", "pause");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Colchón financiero" })).not.toBeInTheDocument());
  });

  it("shows completion details and read-only history for completed goals", async () => {
    const user = userEvent.setup();
    const goal = makeGoal({
      id: "c", name: "Comprar laptop", status: "completed", completedAt: "2026-03-15T00:00:00Z",
      targetAmount: { amount: "1000.00", currency: "USD" }, savingsValue: { amount: "1250.00", currency: "USD" }, actualValue: { amount: "1250.00", currency: "USD" },
      completionWithdrawals: [{ id: "w1", placeId: "p1", placeName: "Banco Santander", amount: { amount: "1000.00", currency: "USD" }, createdAt: "2026-03-15T00:00:00Z" }],
      savingContributions: [{ id: "k1", kind: "saving", amount: "100.00", currency: "USD", placeName: "Alcancía", createdAt: "2026-02-20T10:00:00Z", allocations: [] }],
    });
    render(<GoalsWorkspace workspace={makeWorkspace({ groups: [{ status: "completed", goals: [goal] }] })} onEditGoal={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Completados/ }));
    const detail = await openDetail(user, "Comprar laptop");

    const resumen = within(detail).getByRole("region", { name: "Resumen" });
    expect(within(resumen).getByText("Cumplido")).toBeInTheDocument();
    expect(within(resumen).getByText("US$ 1.000")).toBeInTheDocument();
    expect(within(resumen).queryByText("US$ 1.250")).not.toBeInTheDocument();
    expect(within(resumen).getByText("100%")).toBeInTheDocument();
    expect(within(resumen).getByRole("progressbar", { name: "Progreso de Comprar laptop" })).toHaveAttribute("aria-valuenow", "100");

    expect(within(detail).getByText("Completado").nextSibling).toHaveTextContent("Mar 2026");
    expect(within(detail).getByText("Fecha de cumplimiento")).toBeInTheDocument();
    expect(within(detail).getByText(/15 de marzo de 2026/i)).toBeInTheDocument();

    const cumplimiento = within(detail).getByRole("region", { name: "Cumplimiento" });
    expect(within(cumplimiento).getByText("Monto retirado para completar").nextSibling).toHaveTextContent("US$ 1.000");
    expect(within(cumplimiento).getByText("Retiro desde Banco Santander").nextSibling).toHaveTextContent("US$ 1.000");
    expect(within(cumplimiento).getByText("Excedente ahorrado").nextSibling).toHaveTextContent("US$ 250");

    expect(within(detail).getByText("Historial de aportes")).toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: /^(Editar|Pausar|Reanudar)$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Acciones del aporte/ })).not.toBeInTheDocument();
  });

  it("renders detail with multiple funding rows including zero-percent allocation without monthly amount", async () => {
    const user = userEvent.setup();
    const goal = makeGoal({
      name: "Auto",
      funding: [
        { percentage: "50.00", allocatedDestinationAmount: { amount: "500.00", currency: "USD" }, effectiveMonth: "2026-10-01" },
        { percentage: "0.00", effectiveMonth: "2026-11-01" },
      ],
    });
    render(<GoalsWorkspace workspace={makeWorkspace({ groups: [{ status: "active", goals: [goal] }] })} onChangePlanning={vi.fn()} />);
    const detail = await openDetail(user, "Auto");
    expect(within(detail).getByText("≈ US$ 500 por mes")).toBeInTheDocument();
    expect(within(detail).getByText("50% de tu aporte mensual · desde oct 2026")).toBeInTheDocument();
    expect(within(detail).getByText("Sin aporte mensual")).toBeInTheDocument();
    expect(within(detail).getByText("0% de tu aporte mensual · desde nov 2026")).toBeInTheDocument();
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

    const detail = await openDetail(user, "Colchón financiero");

    expect(within(detail).getByText("Ahorro · Banco Santander").closest("li")).toHaveTextContent("+$ 50.000,00");
    await openContributionActions(user);
    expect(
      screen.getByRole("button", { name: /Corregir aporte/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Eliminar aporte/i }),
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
          placeId: "place-1",
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

    await openDetail(user, "Colchón financiero");
    await openContributionActions(user);
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

    await openDetail(user, "Colchón financiero");
    await openContributionActions(user);
    const deleteBtn = screen.getByRole("button", { name: /Eliminar aporte/i });
    await user.click(deleteBtn);

    // Confirmation surface is visible
    expect(await screen.findByText(/¿Estás seguro/i)).toBeInTheDocument();
    expect(deleteSavingContribution).not.toHaveBeenCalled();

    // Confirm button inside confirmation popover
    const confirmDeleteBtn = screen.getByRole(
      "button",
      { name: "Eliminar aporte" },
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

    const detail = await openDetail(user, "Fondo de Inversión");

    expect(within(detail).getByText("Inversión").closest("li")).toHaveTextContent("+US$ 100,00");
    expect(within(detail).getByText("Inversión")).toBeVisible();
    await openContributionActions(user);
    expect(
      screen.getByRole("button", {
        name: /Corregir aporte.*inversión/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
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

    await openDetail(user, "Fondo de Inversión");
    await openContributionActions(user);
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

    await openDetail(user, "Fondo de Inversión");
    await openContributionActions(user);
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

    const confirmDeleteBtn = screen.getByRole(
      "button",
      { name: "Eliminar inversión" },
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
    expect(container.querySelectorAll("[data-skeleton-row]")).toHaveLength(3);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass("motion-reduce:animate-none");
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
