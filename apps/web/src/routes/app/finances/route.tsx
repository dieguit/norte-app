import {
  createFileRoute,
  Outlet,
  useChildMatches,
  useRouter,
} from "@tanstack/react-router";
import { getFinancesWorkspace } from "../../../features/financial/financial.functions";
import { FinancialOnboarding } from "../-components/FinancialOnboarding";
import {
  FinancesWorkspace,
  type FinancesView,
} from "./-components/FinancesWorkspace";

export const Route = createFileRoute("/app/finances")({
  head: () => ({
    meta: [
      { title: "Finanzas | Norte" },
      {
        name: "description",
        content:
          "Gestioná tus ingresos y gastos para mantener tu planificación financiera actualizada.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: () => getFinancesWorkspace(),
  pendingMs: 0,
  component: FinancesRoute,
  errorComponent: FinancesRouteError,
});

function FinancesRouteError() {
  const router = useRouter();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        No pudimos cargar tus finanzas.
      </p>
      <button
        type="button"
        className="underline underline-offset-4"
        onClick={() => router.invalidate()}
      >
        Reintentar
      </button>
    </div>
  );
}

const VIEW_BY_ROUTE_ID: Record<string, FinancesView> = {
  "/app/finances/incomes": "incomes",
  "/app/finances/expenses": "expenses",
  "/app/finances/savings": "savings",
  "/app/finances/benefits": "benefits",
};

function FinancesRoute() {
  const data = Route.useLoaderData();
  const routeId = useChildMatches({ select: (matches) => matches[0]?.routeId });
  if (!data) return <FinancialOnboarding />;
  return (
    <FinancesWorkspace
      workspace={data}
      view={(routeId && VIEW_BY_ROUTE_ID[routeId]) || "summary"}
    >
      <Outlet />
    </FinancesWorkspace>
  );
}
