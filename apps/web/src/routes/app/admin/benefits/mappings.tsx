import { createFileRoute } from "@tanstack/react-router";
import { getExplorerMappings } from "@/features/benefits-admin/benefits-explorer.functions";
import { ExplorerLoading, NoAccess } from "./-components/ExplorerParts";
import { MappingsPage } from "./-components/MappingsPage";
import { ExplorerRouteError } from "./route";

export const Route = createFileRoute("/app/admin/benefits/mappings")({
  loader: () => getExplorerMappings(),
  pendingMs: 200,
  pendingComponent: ExplorerLoading,
  errorComponent: ExplorerRouteError,
  component: MappingsRoute,
});

function MappingsRoute() {
  const result = Route.useLoaderData();
  return result.access === "denied" ? (
    <NoAccess />
  ) : (
    <MappingsPage list={result.data} />
  );
}
