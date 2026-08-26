// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import {
  getAllocationChangeContext,
  previewAllocationChange,
  confirmAllocationChange,
} from "../../../../features/goals/goals.functions";
import type {
  AllocationChangeContext,
  AllocationChangePreviewResult,
} from "../../../../features/goals/allocation-change";
import { AllocationChange } from "./AllocationChange";
import { AllocationChangeSheet } from "./AllocationChangeSheet";

vi.mock("@tanstack/react-router", () => ({
  useRouter: vi.fn(),
}));

const posthogCapture = vi.fn();

vi.mock("@posthog/react", () => ({
  usePostHog: () => ({ capture: posthogCapture }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../../features/goals/goals.functions", () => ({
  getAllocationChangeContext: vi.fn(),
  previewAllocationChange: vi.fn(),
  confirmAllocationChange: vi.fn(),
}));

afterEach(cleanup);

describe("AllocationChange and AllocationChangeSheet", () => {
  const mockInvalidate = vi.fn().mockResolvedValue(undefined);

  const sampleContext: AllocationChangeContext = {
    currentMonth: "2026-08",
    financialSummary: {
      month: "2026-08",
      income: { amount: "150000.00", currency: "ARS" },
      expenses: { amount: "40000.00", currency: "ARS" },
      balance: { amount: "110000.00", currency: "ARS" },
      dedicationPercentage: "90.00",
      contribution: { amount: "99000.00", currency: "ARS" },
    },
    plannedMonthlyContribution: { amount: "99000.00", currency: "ARS" },
    activeGoals: [
      { id: "goal-1", name: "Fondo de emergencia", currency: "ARS", projection: { status: "available", completionMonth: "2026-12" } },
      { id: "goal-2", name: "Viaje a Japón", currency: "USD", projection: { status: "available", completionMonth: "2027-08" } },
    ],
    currentAllocation: {
      effectiveMonth: "2026-08-01",
      entries: [
        { goalId: "goal-1", percentage: "60.00" },
        { goalId: "goal-2", percentage: "40.00" },
      ],
    },
  };

  const makeMockPreview = (
    overrides?: Partial<AllocationChangePreviewResult>,
  ): AllocationChangePreviewResult => ({
    previewToken: "b".repeat(64),
    proposal: {
      dedicationPercentage: 90,
      allocation: {
        monthlyContribution: { amount: "99000.00", currency: "ARS" },
        effectiveMonth: "2026-09-01",
        totalPercentage: "100.00",
        entries: [
          {
            goalId: "goal-1",
            goalName: "Fondo de emergencia",
            percentage: "60.00",
            allocatedBaseAmount: { amount: "59400.00", currency: "ARS" },
            allocatedDestinationAmount: { amount: "59400.00", currency: "ARS" },
            pending: false,
          },
          {
            goalId: "goal-2",
            goalName: "Viaje a Japón",
            percentage: "40.00",
            allocatedBaseAmount: { amount: "39600.00", currency: "ARS" },
            allocatedDestinationAmount: { amount: "30.46", currency: "USD" },
            pending: false,
          },
        ],
      },
      impacts: [
        {
          goalId: "goal-1",
          goalName: "Fondo de emergencia",
          before: {
            status: "existing",
            projection: { status: "available", completionMonth: "2026-12" },
            allocatedMonthlyAmounts: [{ amount: "59400.00", currency: "ARS" }],
          },
          after: { status: "available", completionMonth: "2026-12" },
        },
        {
          goalId: "goal-2",
          goalName: "Viaje a Japón",
          before: {
            status: "existing",
            projection: { status: "available", completionMonth: "2027-08" },
            allocatedMonthlyAmounts: [{ amount: "30.46", currency: "USD" }],
          },
          after: { status: "available", completionMonth: "2027-08" },
        },
      ],
      proposedSource: {
        profile: null,
        goals: [],
        savingsPositions: [],
        investmentPositions: [],
        snapshots: [],
        allocations: [],
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      invalidate: mockInvalidate,
    } as any);
  });

  describe("AllocationChangeSheet container", () => {
    it("does not render sheet contents when open is false", () => {
      render(<AllocationChangeSheet open={false} onOpenChange={vi.fn()} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("loads context and renders AllocationChange when open is true", async () => {
      vi.mocked(getAllocationChangeContext).mockResolvedValue({
        profile: "present",
        context: sampleContext,
      });
      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());

      render(<AllocationChangeSheet open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByText("Planificación de objetivos"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Redistribuí tu aporte mensual y revisá el impacto antes de confirmar.",
        ),
      ).toBeInTheDocument();

      expect(
        await screen.findByText("Distribución e impacto"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", {
          name: /porcentaje para fondo de emergencia/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /porcentaje para viaje a japón/i }),
      ).toBeInTheDocument();
    });

    it("renders error message when profile is missing", async () => {
      vi.mocked(getAllocationChangeContext).mockResolvedValue({
        profile: "missing",
      } as any);

      render(<AllocationChangeSheet open={true} onOpenChange={vi.fn()} />);

      expect(
        await screen.findByText(
          "Completá tu perfil financiero antes de cambiar la planificación.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("renders empty state when there are no active goals", async () => {
      vi.mocked(getAllocationChangeContext).mockResolvedValue({
        profile: "present",
        context: {
          ...sampleContext,
          activeGoals: [],
        },
      });

      render(<AllocationChangeSheet open={true} onOpenChange={vi.fn()} />);

      expect(
        await screen.findByText(
          "No tenés objetivos activos para redistribuir.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Actualizar Plan" }),
      ).not.toBeInTheDocument();
    });

    it("renders context loading error and retains close button", async () => {
      vi.mocked(getAllocationChangeContext).mockRejectedValue(
        new Error("Fallo de conexión"),
      );

      render(<AllocationChangeSheet open={true} onOpenChange={vi.fn()} />);

      expect(await screen.findByText("Fallo de conexión")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("cancels state update when unmounted before context resolves", async () => {
      let resolveContext!: (val: any) => void;
      const promise = new Promise((resolve) => {
        resolveContext = resolve;
      });
      vi.mocked(getAllocationChangeContext).mockReturnValue(promise as any);

      const { unmount } = render(
        <AllocationChangeSheet open={true} onOpenChange={vi.fn()} />,
      );
      unmount();

      resolveContext({ profile: "present", context: sampleContext });
    });
  });

  describe("AllocationChange interactions", () => {
    it('shows current goal dates while the initial preview is pending', () => {
      vi.mocked(previewAllocationChange).mockReturnValue(new Promise(() => {}))

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      )

      expect(screen.getAllByText('Antes')).toHaveLength(2)
      expect(screen.getAllByText('Con este cambio')).toHaveLength(2)
      expect(screen.getAllByText('Diciembre de 2026')).toHaveLength(2)
      expect(screen.getAllByText('Agosto de 2027')).toHaveLength(2)
      expect(screen.getByText('Actualizando impacto...')).toBeVisible()
    })

    it('opening the Sheet loads "Distribución e impacto", dedication slider at 90%, and renders active goals', async () => {
      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      );

      expect(screen.getByText("Distribución e impacto")).toBeInTheDocument();
      expect(screen.getByText("Aporte mensual a objetivos")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Elegí qué porcentaje de tu saldo mensual querés destinar a tus objetivos.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("90%")).toBeInTheDocument();
      expect(screen.getByText("$ 99.000,00")).toBeInTheDocument();

      expect(
        screen.getByRole("textbox", {
          name: /porcentaje para fondo de emergencia/i,
        }),
      ).toHaveValue("60,00");
      expect(
        screen.getByRole("textbox", { name: /porcentaje para viaje a japón/i }),
      ).toHaveValue("40,00");
    });

    it("moving the dedication slider to 75% immediately shows $82.500,00 and updates goal amounts locally before preview resolves", async () => {
      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      const sliders = screen.getAllByRole("slider", { hidden: true });
      const dedicationSlider =
        sliders.find((el) => el.getAttribute("aria-label")?.includes("Porcentaje del saldo")) ??
        sliders[0];

      // Change dedication slider to 75%
      fireEvent.change(dedicationSlider, { target: { value: "75" } });

      // Local contribution amount updates immediately: 110,000 * 0.75 = 82,500
      expect(screen.getByText("75%")).toBeInTheDocument();
      expect(screen.getByText("$ 82.500,00")).toBeInTheDocument();

      // Goal allocated base amounts update immediately: 82,500 * 0.60 = 49,500; 82,500 * 0.40 = 33,000
      expect(screen.getByText("$ 49.500,00")).toBeInTheDocument();
      expect(screen.getByText("$ 33.000,00")).toBeInTheDocument();

      // Confirmation is disabled because preview is out of sync or pending
      expect(
        screen.getByRole("button", { name: "Actualizar Plan" }),
      ).toBeDisabled();
      expect(
        screen.getByText(
          /Actualizando impacto\.\.\.|Proyección pendiente de actualización/,
        ),
      ).toBeInTheDocument();
    });

    it("committing the dedication slider triggers preview with dedicationPercentage: 75 and enables confirmation once synced", async () => {
      const initialPreview = makeMockPreview();
      const updatedPreview = makeMockPreview({
        proposal: {
          ...initialPreview.proposal,
          dedicationPercentage: 75,
          allocation: {
            ...initialPreview.proposal.allocation,
            monthlyContribution: { amount: "82500.00", currency: "ARS" },
            entries: [
              {
                ...initialPreview.proposal.allocation.entries[0],
                allocatedBaseAmount: { amount: "49500.00", currency: "ARS" },
                allocatedDestinationAmount: {
                  amount: "49500.00",
                  currency: "ARS",
                },
              },
              {
                ...initialPreview.proposal.allocation.entries[1],
                allocatedBaseAmount: { amount: "33000.00", currency: "ARS" },
                allocatedDestinationAmount: {
                  amount: "25.38",
                  currency: "USD",
                },
              },
            ],
          },
        },
      });

      vi.mocked(previewAllocationChange)
        .mockResolvedValueOnce(initialPreview)
        .mockResolvedValueOnce(updatedPreview);

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      const sliders = screen.getAllByRole("slider", { hidden: true });
      const dedicationSlider =
        sliders.find((el) =>
          el.getAttribute("aria-label")?.includes("Porcentaje del saldo"),
        ) ?? sliders[0];

      fireEvent.change(dedicationSlider, { target: { value: "75" } });

      await waitFor(() => {
        expect(previewAllocationChange).toHaveBeenCalledWith({
          data: {
            dedicationPercentage: 75,
            allocations: [
              { goalId: "goal-1", percentage: "60.00" },
              { goalId: "goal-2", percentage: "40.00" },
            ],
          },
        });
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });
    });

    it("renders dedication slider and confirmation disabled when balance is zero or negative with explanatory message", async () => {
      const zeroBalanceContext: AllocationChangeContext = {
        ...sampleContext,
        financialSummary: {
          ...sampleContext.financialSummary,
          balance: { amount: "0.00", currency: "ARS" },
          contribution: { amount: "0.00", currency: "ARS" },
        },
      };

      vi.mocked(previewAllocationChange).mockResolvedValue(
        makeMockPreview({
          proposal: {
            ...makeMockPreview().proposal,
            allocation: {
              ...makeMockPreview().proposal.allocation,
              monthlyContribution: { amount: "0.00", currency: "ARS" },
            },
          },
        }),
      );

      render(
        <AllocationChange
          context={zeroBalanceContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      );

      const sliders = screen.getAllByRole("slider", { hidden: true });
      const dedicationSlider =
        sliders.find((el) =>
          el.getAttribute("aria-label")?.includes("Porcentaje del saldo"),
        ) ?? sliders[0];
      expect(dedicationSlider).toBeDisabled();

      expect(
        screen.getByText(
          "No tenés saldo disponible este mes para asignar a objetivos.",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: "Actualizar Plan" }),
      ).toBeDisabled();
    });

    it("changing a percentage invokes the proportional rebalanceAllocationEntries behavior", async () => {
      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      const g1Input = screen.getByRole("textbox", {
        name: /porcentaje para fondo de emergencia/i,
      });
      const g2Input = screen.getByRole("textbox", {
        name: /porcentaje para viaje a japón/i,
      });

      // Change goal 1 to 70%
      fireEvent.change(g1Input, { target: { value: "70" } });

      expect(g1Input).toHaveValue("70,00");
      expect(g2Input).toHaveValue("30,00");
    });

    it("confirmation is disabled when total is invalid or preview no longer matches draft", async () => {
      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      const g1Input = screen.getByRole("textbox", {
        name: /porcentaje para fondo de emergencia/i,
      });

      // Set directly to an unnormalized/invalid value
      fireEvent.change(g1Input, { target: { value: "invalid" } });

      expect(
        screen.getByRole("button", { name: "Actualizar Plan" }),
      ).toBeDisabled();
      expect(
        screen.getByText("Proyección pendiente de actualización"),
      ).toBeInTheDocument();
      expect(screen.getByText('Completá la distribución para calcular el impacto')).toBeVisible()
      expect(screen.getAllByText('Antes')).toHaveLength(2)
      expect(screen.getAllByText('Con este cambio')).toHaveLength(2)
    });

    it('a valid blur generates a preview with "Antes" and "Con este cambio"', async () => {
      const mockInitialPreview = makeMockPreview();
      const mockUpdatedPreview = makeMockPreview({
        proposal: {
          ...mockInitialPreview.proposal,
          allocation: {
            ...mockInitialPreview.proposal.allocation,
            entries: [
              {
                ...mockInitialPreview.proposal.allocation.entries[0],
                percentage: "70.00",
              },
              {
                ...mockInitialPreview.proposal.allocation.entries[1],
                percentage: "30.00",
              },
            ],
          },
          impacts: [
            {
              goalId: "goal-1",
              goalName: "Fondo de emergencia",
              before: {
                status: "existing",
                projection: { status: "available", completionMonth: "2026-12" },
                allocatedMonthlyAmounts: [
                  { amount: "59400.00", currency: "ARS" },
                ],
              },
              after: { status: "available", completionMonth: "2026-10" },
            },
            {
              goalId: "goal-2",
              goalName: "Viaje a Japón",
              before: {
                status: "existing",
                projection: { status: "available", completionMonth: "2027-08" },
                allocatedMonthlyAmounts: [{ amount: "30.46", currency: "USD" }],
              },
              after: { status: "available", completionMonth: "2027-11" },
            },
          ],
        },
      });

      vi.mocked(previewAllocationChange)
        .mockResolvedValueOnce(mockInitialPreview)
        .mockResolvedValueOnce(mockUpdatedPreview);

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      const g1Input = screen.getByRole("textbox", {
        name: /porcentaje para fondo de emergencia/i,
      });
      fireEvent.change(g1Input, { target: { value: "70" } });
      fireEvent.blur(g1Input);

      await waitFor(() => {
        expect(previewAllocationChange).toHaveBeenCalledTimes(2);
      });

      expect(screen.getAllByText("Antes").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Con este cambio").length).toBeGreaterThan(0);
      expect(screen.getByText("Octubre de 2026")).toBeInTheDocument();
      expect(screen.getByText("Noviembre de 2027")).toBeInTheDocument();
    });

    it('successful confirmation invalidates the router, emits "Plan actualizado.", and closes', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const onUpdated = vi.fn();

      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());
      vi.mocked(confirmAllocationChange).mockResolvedValue({
        status: "updated",
      });

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={onCancel}
          onUpdated={onUpdated}
        />,
      );

      const confirmBtn = await screen.findByRole("button", {
        name: "Actualizar Plan",
      });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(confirmAllocationChange).toHaveBeenCalledWith({
          data: {
            draft: {
              dedicationPercentage: 90,
              allocations: [
                { goalId: "goal-1", percentage: "60.00" },
                { goalId: "goal-2", percentage: "40.00" },
              ],
            },
            previewToken: "b".repeat(64),
          },
        });
      });

      expect(mockInvalidate).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Plan actualizado.");
      expect(onUpdated).toHaveBeenCalledTimes(1);
      expect(posthogCapture).not.toHaveBeenCalled();
    });

    it('captures only the dedication event when the slider changed to 75 and confirms', async () => {
      const user = userEvent.setup();
      const onUpdated = vi.fn();

      const initialPreview = makeMockPreview();
      const updatedPreview = makeMockPreview({
        proposal: {
          ...initialPreview.proposal,
          dedicationPercentage: 75,
        },
      });

      vi.mocked(previewAllocationChange)
        .mockResolvedValueOnce(initialPreview)
        .mockResolvedValueOnce(updatedPreview);
      vi.mocked(confirmAllocationChange).mockResolvedValue({
        status: "updated",
      });

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={onUpdated}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      const sliders = screen.getAllByRole("slider", { hidden: true });
      const dedicationSlider =
        sliders.find((el) =>
          el.getAttribute("aria-label")?.includes("Porcentaje del saldo"),
        ) ?? sliders[0];

      fireEvent.change(dedicationSlider, { target: { value: "75" } });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      await user.click(screen.getByRole("button", { name: "Actualizar Plan" }));

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalledTimes(1);
      });
      expect(posthogCapture).toHaveBeenCalledWith(
        "goal_monthly_balance_percentage_updated",
      );
      expect(posthogCapture).not.toHaveBeenCalledWith(
        "goal_allocations_updated",
      );
    });

    it('captures only the allocations event when entries change from 60/40 to 70/30 and confirms', async () => {
      const user = userEvent.setup();
      const onUpdated = vi.fn();

      const initialPreview = makeMockPreview();
      const updatedPreview = makeMockPreview({
        proposal: {
          ...initialPreview.proposal,
          allocation: {
            ...initialPreview.proposal.allocation,
            entries: [
              {
                ...initialPreview.proposal.allocation.entries[0],
                percentage: "70.00",
              },
              {
                ...initialPreview.proposal.allocation.entries[1],
                percentage: "30.00",
              },
            ],
          },
        },
      });

      vi.mocked(previewAllocationChange)
        .mockResolvedValueOnce(initialPreview)
        .mockResolvedValueOnce(updatedPreview);
      vi.mocked(confirmAllocationChange).mockResolvedValue({
        status: "updated",
      });

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={onUpdated}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      const g1Input = screen.getByRole("textbox", {
        name: /porcentaje para fondo de emergencia/i,
      });
      fireEvent.change(g1Input, { target: { value: "70" } });
      fireEvent.blur(g1Input);

      await waitFor(() => {
        expect(previewAllocationChange).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Actualizar Plan" }),
        ).toBeEnabled();
      });

      await user.click(screen.getByRole("button", { name: "Actualizar Plan" }));

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalledTimes(1);
      });
      expect(posthogCapture).toHaveBeenCalledWith("goal_allocations_updated");
      expect(posthogCapture).not.toHaveBeenCalledWith(
        "goal_monthly_balance_percentage_updated",
      );
    });

    it("a stale result preserves the draft, replaces the preview, and shows stale error message", async () => {
      const user = userEvent.setup();
      const onUpdated = vi.fn();

      const refreshedPreview = makeMockPreview({
        previewToken: "c".repeat(64),
        proposal: {
          ...makeMockPreview().proposal,
          dedicationPercentage: 80,
          allocation: {
            ...makeMockPreview().proposal.allocation,
            entries: [
              {
                ...makeMockPreview().proposal.allocation.entries[0],
                percentage: "50.00",
              },
              {
                ...makeMockPreview().proposal.allocation.entries[1],
                percentage: "50.00",
              },
            ],
          },
        },
      });

      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());
      vi.mocked(confirmAllocationChange).mockResolvedValue({
        status: "stale",
        preview: refreshedPreview,
      });

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={onUpdated}
        />,
      );

      const confirmBtn = await screen.findByRole("button", {
        name: "Actualizar Plan",
      });
      await user.click(confirmBtn);

      expect(
        await screen.findByText(
          "Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.",
        ),
      ).toBeInTheDocument();

      expect(onUpdated).not.toHaveBeenCalled();
      expect(mockInvalidate).not.toHaveBeenCalled();
      expect(posthogCapture).not.toHaveBeenCalled();

      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", {
          name: /porcentaje para fondo de emergencia/i,
        }),
      ).toHaveValue("50,00");
      expect(
        screen.getByRole("textbox", { name: /porcentaje para viaje a japón/i }),
      ).toHaveValue("50,00");
    });

    it("network error on confirmation retains entries and shows error message", async () => {
      const user = userEvent.setup();
      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());
      vi.mocked(confirmAllocationChange).mockRejectedValue(
        new Error("Error del servidor al confirmar"),
      );

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={vi.fn()}
          onUpdated={vi.fn()}
        />,
      );

      const confirmBtn = await screen.findByRole("button", {
        name: "Actualizar Plan",
      });
      await user.click(confirmBtn);

      expect(
        await screen.findByText("Error del servidor al confirmar"),
      ).toBeInTheDocument();
      expect(posthogCapture).not.toHaveBeenCalled();
      expect(
        screen.getByRole("textbox", {
          name: /porcentaje para fondo de emergencia/i,
        }),
      ).toHaveValue("60,00");
      expect(
        screen.getByRole("textbox", { name: /porcentaje para viaje a japón/i }),
      ).toHaveValue("40,00");
    });

    it("calls onCancel when Cancelar button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      vi.mocked(previewAllocationChange).mockResolvedValue(makeMockPreview());

      render(
        <AllocationChange
          context={sampleContext}
          onCancel={onCancel}
          onUpdated={vi.fn()}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
