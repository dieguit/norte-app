import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { getBenefitSettings } from "@/features/benefits/benefits.functions";
import { BenefitsError, BenefitsLoading } from "./-components/BenefitParts";

export const Route = createFileRoute("/app/finances/benefits")({
  head: () => ({
    meta: [
      { title: "Beneficios | Norte" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: () => getBenefitSettings(),
  pendingMs: 200,
  pendingComponent: BenefitsLoading,
  errorComponent: BenefitsRouteError,
  component: Outlet,
});

export function BenefitsRouteError() {
  const router = useRouter();
  return <BenefitsError onRetry={() => void router.invalidate()} />;
}
