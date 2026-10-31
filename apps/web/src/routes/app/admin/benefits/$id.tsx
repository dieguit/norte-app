import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { getExplorerCampaign } from "@/features/benefits-admin/benefits-explorer.functions";
import { CampaignDetail } from "./-components/CampaignDetail";
import { ExplorerLoading, NoAccess } from "./-components/ExplorerParts";
import { ExplorerRouteError } from "./route";

const layout = getRouteApi("/app/admin/benefits");

export const Route = createFileRoute("/app/admin/benefits/$id")({
  loader: ({ params: { id } }) => getExplorerCampaign({ data: { id } }),
  pendingMs: 200,
  pendingComponent: ExplorerLoading,
  errorComponent: ExplorerRouteError,
  component: CampaignRoute,
});

function CampaignRoute() {
  const result = Route.useLoaderData();
  const overview = layout.useLoaderData();
  if (result.access === "denied" || overview.access === "denied")
    return <NoAccess />;
  return (
    <CampaignDetail
      key={result.data.id}
      campaign={result.data}
      overview={overview.data}
    />
  );
}
