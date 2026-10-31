import {
  createFileRoute,
  Outlet,
  useMatch,
  useRouter,
} from "@tanstack/react-router";
import { getExplorerOverview } from "@/features/benefits-admin/benefits-explorer.functions";
import { Page } from "@/components/norte/PageLayout";
import { ExplorerLayout } from "./-components/ExplorerLayout";
import { ExplorerError, NoAccess } from "./-components/ExplorerParts";

export const Route = createFileRoute("/app/admin/benefits")({
  head: () => ({
    meta: [
      { title: "Explorador de beneficios | Norte" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: () => getExplorerOverview(),
  errorComponent: () => (
    <Page>
      <ExplorerRouteError />
    </Page>
  ),
  component: ExplorerRoute,
});

export function ExplorerRouteError() {
  const router = useRouter();
  return <ExplorerError onRetry={() => void router.invalidate()} />;
}

function ExplorerRoute() {
  const overview = Route.useLoaderData();
  const detail = useMatch({
    from: "/app/admin/benefits/$id",
    shouldThrow: false,
  });
  return (
    <ExplorerLayout showTabs={!detail && overview.access === "granted"}>
      {overview.access === "denied" ? <NoAccess /> : <Outlet />}
    </ExplorerLayout>
  );
}
