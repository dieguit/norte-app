import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { BenefitSettingsForm } from "./-components/BenefitSettingsForm";

const layout = getRouteApi("/app/finances/benefits");

export const Route = createFileRoute("/app/finances/benefits/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { banks, profile } = layout.useLoaderData();
  return <BenefitSettingsForm banks={banks} profile={profile} />;
}
