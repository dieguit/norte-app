import { createServerFn } from "@tanstack/react-start";
import {
  ExplorerQuerySchema,
  ExplorerAliasesPatchSchema,
  ExplorerMappingPatchSchema,
  ExplorerMergeSchema,
} from "@repo/shared-types";
import { z } from "zod";
import {
  getExplorerCampaignsServer,
  getExplorerCampaignServer,
  getExplorerOverviewServer,
  getExplorerBrandsServer,
  getExplorerMappingsServer,
  hideExplorerCampaignServer,
  saveExplorerAliasesServer,
  mergeExplorerBrandsServer,
  saveExplorerMappingServer,
} from "./benefits-explorer.server";

const id = z.object({ id: z.string().uuid() });
export const getExplorerCampaigns = createServerFn({ method: "GET" })
  .validator((input: unknown) => ExplorerQuerySchema.parse(input))
  .handler(getExplorerCampaignsServer);
export const getExplorerCampaign = createServerFn({ method: "GET" })
  .validator((input: unknown) => id.parse(input))
  .handler(getExplorerCampaignServer);
export const getExplorerOverview = createServerFn({ method: "GET" }).handler(
  getExplorerOverviewServer,
);
export const getExplorerBrands = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    ExplorerQuerySchema.pick({ q: true, page: true, pageSize: true }).parse(
      input,
    ),
  )
  .handler(getExplorerBrandsServer);
export const getExplorerMappings = createServerFn({ method: "GET" }).handler(
  getExplorerMappingsServer,
);
export const hideExplorerCampaign = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    id.extend({ hidden: z.boolean() }).parse(input),
  )
  .handler(hideExplorerCampaignServer);
export const saveExplorerAliases = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    id.extend(ExplorerAliasesPatchSchema.shape).parse(input),
  )
  .handler(saveExplorerAliasesServer);
export const mergeExplorerBrands = createServerFn({ method: "POST" })
  .validator((input: unknown) => ExplorerMergeSchema.parse(input))
  .handler(mergeExplorerBrandsServer);
export const saveExplorerMapping = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    ExplorerMappingPatchSchema.refine(
      (p) => /^(pd:\d+(\/\d+)?|galicia:[^\r\n]+)$/.test(p.sourceKey),
      "Categoría de origen inválida",
    ).parse(input),
  )
  .handler(saveExplorerMappingServer);
