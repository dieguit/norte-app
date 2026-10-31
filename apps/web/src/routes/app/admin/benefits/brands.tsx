import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExplorerQuerySchema } from "@repo/shared-types";
import { getExplorerBrands } from "@/features/benefits-admin/benefits-explorer.functions";
import { BrandsPage } from "./-components/BrandsPage";
import { ExplorerLoading, NoAccess } from "./-components/ExplorerParts";
import { ExplorerRouteError } from "./route";

type BrandSearch = { q?: string; page?: number };
const PAGE_SIZE = 30;

function validateSearch(raw: Record<string, unknown>): BrandSearch {
  const q =
    typeof raw.q === "string" && raw.q.trim()
      ? ExplorerQuerySchema.shape.q.safeParse(raw.q).data
      : undefined;
  const page = ExplorerQuerySchema.shape.page.safeParse(raw.page).data;
  return { ...(q ? { q } : {}), ...(page && page > 1 ? { page } : {}) };
}

export const Route = createFileRoute("/app/admin/benefits/brands")({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getExplorerBrands({
      data: { q: deps.q, page: deps.page ?? 1, pageSize: PAGE_SIZE },
    }),
  pendingMs: 200,
  pendingComponent: ExplorerLoading,
  errorComponent: ExplorerRouteError,
  component: BrandsRoute,
});

function BrandsRoute() {
  const result = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  if (result.access === "denied") return <NoAccess />;
  return (
    <BrandsPage
      list={result.data}
      q={search.q ?? ""}
      onSearch={(q) => void navigate({ search: validateSearch({ q }) })}
      linkForPage={(page) => ({
        to: "/app/admin/benefits/brands",
        search: validateSearch({ ...search, page }),
      })}
    />
  );
}
