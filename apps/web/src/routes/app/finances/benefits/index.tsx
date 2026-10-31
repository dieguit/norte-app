import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";
import { BenefitSearchQuerySchema } from "@repo/shared-types";
import { searchBenefits } from "@/features/benefits/benefits.functions";
import { BenefitsLoading } from "./-components/BenefitParts";
import { BenefitsList, type ListSearch } from "./-components/BenefitsList";
import { BenefitsRouteError } from "./route";

const KEYS = ["q", "category", "bank", "day"] as const;
const PAGE_SIZE = 20;
const layout = getRouteApi("/app/finances/benefits");

// Bad params (old digest links, typos) are dropped one by one instead of failing the page.
function validateSearch(raw: Record<string, unknown>): ListSearch {
  const search = Object.fromEntries(
    KEYS.map((key) => [
      key,
      raw[key] === ""
        ? undefined
        : BenefitSearchQuerySchema.shape[key].safeParse(raw[key]).data,
    ]).filter(([, v]) => v !== undefined),
  ) as ListSearch;
  if (search.day === "today") delete search.day;
  return search;
}

export const Route = createFileRoute("/app/finances/benefits/")({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    searchBenefits({
      data: BenefitSearchQuerySchema.parse({ ...deps, pageSize: PAGE_SIZE }),
    }),
  pendingMs: 200,
  pendingComponent: BenefitsLoading,
  errorComponent: BenefitsRouteError,
  component: BenefitsRoute,
});

function BenefitsRoute() {
  const result = Route.useLoaderData();
  const { banks, profile } = layout.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const query = BenefitSearchQuerySchema.parse({
    ...search,
    pageSize: PAGE_SIZE,
  });
  return (
    <BenefitsList
      key={JSON.stringify(search)}
      result={result}
      query={query}
      profile={profile}
      banks={banks}
      onSearchChange={(next) =>
        void navigate({
          search: (prev) => validateSearch({ ...prev, ...next }),
        })
      }
    />
  );
}
