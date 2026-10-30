import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { getBenefit } from "@/features/benefits/benefits.functions";
import { BenefitDetailView } from "./-components/BenefitDetailView";
import { BenefitsLoading } from "./-components/BenefitParts";
import { BenefitsRouteError } from "./route";

const layout = getRouteApi("/app/finances/benefits");

export const Route = createFileRoute("/app/finances/benefits/$id")({
  loader: ({ params: { id } }) => getBenefit({ data: { id } }),
  pendingMs: 200,
  pendingComponent: BenefitsLoading,
  errorComponent: BenefitsRouteError,
  component: BenefitRoute,
});

function BenefitRoute() {
  const benefit = Route.useLoaderData();
  const { banks } = layout.useLoaderData();
  return <BenefitDetailView key={benefit.id} benefit={benefit} banks={banks} />;
}
