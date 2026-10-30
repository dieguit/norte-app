import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { RunsPage } from "./-components/RunsPage";

const layout = getRouteApi("/app/admin/benefits");

export const Route = createFileRoute("/app/admin/benefits/runs")({
  component: RunsRoute,
});

function RunsRoute() {
  const overview = layout.useLoaderData();
  return overview.access === "granted" ? (
    <RunsPage overview={overview.data} />
  ) : null;
}
