import "@tanstack/react-start/server-only";
import {
  ExplorerCampaignListSchema,
  ExplorerCampaignDetailSchema,
  ExplorerOverviewSchema,
  ExplorerBrandListSchema,
  ExplorerMappingListSchema,
  type ExplorerQuery,
  type CatalogCategory,
} from "@repo/shared-types";
import { z } from "zod";
import {
  callFinancialApi,
  mutateFinancialApi,
  throwFinancialApiError,
} from "../financial/financial.server";

const base = "/admin/benefits/explorer";
const okSchema = z.object({ ok: z.literal(true) });

async function read<T>(path: string, schema: z.ZodType<T>) {
  const response = await callFinancialApi(`${base}/${path}`);
  if (response.status === 403) return { access: "denied" as const };
  if (!response.ok)
    await throwFinancialApiError(response, "No pudimos cargar el explorador.");
  return {
    access: "granted" as const,
    data: schema.parse(await response.json()),
  };
}

function queryString(data: Record<string, string | number | undefined>) {
  return new URLSearchParams(
    Object.entries(data)
      .filter(
        (entry): entry is [string, string | number] => entry[1] !== undefined,
      )
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}

async function mutate(path: string, method: string, body: unknown) {
  const response = await mutateFinancialApi(
    `${base}/${path}`,
    method,
    body,
    "No pudimos guardar el cambio.",
  );
  return okSchema.parse(await response.json());
}

export async function getExplorerCampaignsServer({
  data,
}: {
  data: ExplorerQuery;
}) {
  return read(`campaigns?${queryString(data)}`, ExplorerCampaignListSchema);
}
export async function getExplorerCampaignServer({
  data,
}: {
  data: { id: string };
}) {
  return read(
    `campaigns/${encodeURIComponent(data.id)}`,
    ExplorerCampaignDetailSchema.extend({
      raw: z.object({ listing: z.json(), detail: z.json() }),
    }),
  );
}
export async function getExplorerOverviewServer() {
  return read("overview", ExplorerOverviewSchema);
}
export async function getExplorerBrandsServer({
  data,
}: {
  data: { q?: string; page: number; pageSize: number };
}) {
  return read(`brands?${queryString(data)}`, ExplorerBrandListSchema);
}
export async function getExplorerMappingsServer() {
  return read("mappings", ExplorerMappingListSchema);
}
export async function hideExplorerCampaignServer({
  data,
}: {
  data: { id: string; hidden: boolean };
}) {
  return mutate(`campaigns/${encodeURIComponent(data.id)}`, "PATCH", {
    hidden: data.hidden,
  });
}
export async function saveExplorerAliasesServer({
  data,
}: {
  data: { id: string; aliases: string[] };
}) {
  return mutate(`brands/${encodeURIComponent(data.id)}`, "PATCH", {
    aliases: data.aliases,
  });
}
export async function mergeExplorerBrandsServer({
  data,
}: {
  data: { fromId: string; intoId: string };
}) {
  return mutate("brands/merge", "POST", data);
}
export async function saveExplorerMappingServer({
  data,
}: {
  data: { sourceKey: string; category: CatalogCategory };
}) {
  return mutate("mappings", "PATCH", data);
}
