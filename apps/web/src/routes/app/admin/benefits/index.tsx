import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { ExplorerQuerySchema } from "@repo/shared-types";
import { getExplorerCampaigns } from "@/features/benefits-admin/benefits-explorer.functions";
import {
  CampaignsPage,
  type CampaignSearch,
} from "./-components/CampaignsPage";
import { ExplorerLoading, NoAccess } from "./-components/ExplorerParts";
import { ExplorerRouteError } from "./route";

const SEARCH_KEYS = [
  "q",
  "source",
  "bank",
  "category",
  "tier",
  "status",
  "page",
] as const;
const PAGE_SIZE = 30;
const layout = getRouteApi("/app/admin/benefits");

// Invalid params are dropped one by one, so a bad link degrades to "all" instead of an error.
function validateSearch(raw: Record<string, unknown>): CampaignSearch {
  const entries = SEARCH_KEYS.map((key) => [
    key,
    raw[key] === ""
      ? undefined
      : ExplorerQuerySchema.shape[key].safeParse(raw[key]).data,
  ]);
  const search = Object.fromEntries(
    entries.filter(([, v]) => v !== undefined),
  ) as CampaignSearch;
  if (search.status === "all") delete search.status;
  if (search.page === 1) delete search.page;
  return search;
}

export const Route = createFileRoute("/app/admin/benefits/")({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getExplorerCampaigns({
      data: ExplorerQuerySchema.parse({ ...deps, pageSize: PAGE_SIZE }),
    }),
  pendingMs: 200,
  pendingComponent: ExplorerLoading,
  errorComponent: ExplorerRouteError,
  component: CampaignsRoute,
});

function CampaignsRoute() {
  const result = Route.useLoaderData();
  const overview = layout.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  if (result.access === "denied" || overview.access === "denied")
    return <NoAccess />;
  return (
    <CampaignsPage
      list={result.data}
      search={search}
      overview={overview.data}
      onSearchChange={(next) =>
        void navigate({
          search: (prev) =>
            validateSearch({ ...prev, ...next, page: undefined }),
        })
      }
      linkForPage={(page) => ({
        to: "/app/admin/benefits",
        search: (prev: CampaignSearch) => validateSearch({ ...prev, page }),
      })}
    />
  );
}
