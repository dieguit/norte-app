import { z } from "zod";
import {
  CampaignTermsSchema,
  CatalogCategorySchema,
} from "./benefits-catalog.schema";

export const ExplorerSourceSchema = z.enum(["galicia", "playdigital"]);
export const ExplorerQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  source: ExplorerSourceSchema.optional(),
  bank: z.string().max(100).optional(),
  category: CatalogCategorySchema.optional(),
  tier: z.string().max(80).optional(),
  status: z.enum(["all", "available", "incomplete", "hidden"]).default("all"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
export type ExplorerQuery = z.infer<typeof ExplorerQuerySchema>;

export const ExplorerCampaignSchema = z.object({
  id: z.string().uuid(),
  source: ExplorerSourceSchema,
  externalId: z.string(),
  title: z.string(),
  brandId: z.string().uuid().nullable(),
  brandName: z.string().nullable(),
  categories: z.array(CatalogCategorySchema),
  terms: CampaignTermsSchema.nullable(),
  unpublishableReason: z.string().nullable(),
  bankSlugs: z.array(z.string()),
  hidden: z.boolean(),
  withdrawnAt: z.string().nullable(),
  lastSeenAt: z.string(),
  detailFetchedAt: z.string().nullable(),
  detailStale: z.boolean(),
  verifyUrl: z.string(),
  verifyHint: z.string().nullable(),
});
export type ExplorerCampaign = z.infer<typeof ExplorerCampaignSchema>;
export const ExplorerCampaignListSchema = z.object({
  items: z.array(ExplorerCampaignSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type ExplorerCampaignList = z.infer<typeof ExplorerCampaignListSchema>;
export const ExplorerCampaignDetailSchema = ExplorerCampaignSchema.extend({
  raw: z.object({ listing: z.unknown(), detail: z.unknown() }),
  rawTierSignal: z.string().nullable(),
  banks: z.array(
    z.object({
      slug: z.string(),
      terms: CampaignTermsSchema.nullable(),
      tierCodes: z.array(z.string()),
      withdrawnAt: z.string().nullable(),
      lastSeenAt: z.string(),
    }),
  ),
});
export type ExplorerCampaignDetail = z.infer<
  typeof ExplorerCampaignDetailSchema
>;

export const ExplorerBankSchema = z.object({
  slug: z.string(),
  name: z.string(),
  playdigitalId: z.string().nullable(),
  ownCatalog: z.boolean(),
  ownCatalogScope: z.string().nullable(),
});
export const ExplorerRunSchema = z.object({
  id: z.string().uuid(),
  source: ExplorerSourceSchema,
  bankSlug: z.string().nullable(),
  startedAt: z.string(),
  completedAt: z.string(),
  outcome: z.enum(["ok", "partial", "failed"]),
  complete: z.boolean(),
  totalReported: z.number().nullable(),
  rawRowCount: z.number(),
  observedCount: z.number(),
  upserted: z.number(),
  unpublishable: z.number(),
  anomalies: z.array(
    z.object({
      kind: z.string(),
      detail: z.string(),
      externalId: z.string().optional(),
    }),
  ),
  error: z.string().nullable(),
});
export const ExplorerOverviewSchema = z.object({
  banks: z.array(ExplorerBankSchema),
  runs: z.array(ExplorerRunSchema), // most recent 50, bounded
  tiers: z.record(
    z.string(),
    z.array(z.object({ code: z.string(), label: z.string() })),
  ),
});
export type ExplorerOverview = z.infer<typeof ExplorerOverviewSchema>;

export const ExplorerBrandSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  aliases: z.array(z.string()),
  campaignCount: z.number().int().nonnegative(),
});
export const ExplorerBrandListSchema = z.object({
  items: z.array(ExplorerBrandSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type ExplorerBrandList = z.infer<typeof ExplorerBrandListSchema>;
export const ExplorerMappingSchema = z.object({
  sourceKey: z.string(),
  category: CatalogCategorySchema.nullable(),
  affectedCampaigns: z.number().int().nonnegative(),
  updatedBy: z.string().nullable(),
});
export const ExplorerMappingListSchema = z.object({
  items: z.array(ExplorerMappingSchema),
});
export type ExplorerMappingList = z.infer<typeof ExplorerMappingListSchema>;
export const ExplorerAliasesPatchSchema = z.object({
  aliases: z.array(z.string().trim().min(1).max(120)).max(50),
});
export const ExplorerMappingPatchSchema = z.object({
  sourceKey: z.string().trim().min(1).max(200),
  category: CatalogCategorySchema,
});
export const ExplorerMergeSchema = z
  .object({
    fromId: z.string().uuid(),
    intoId: z.string().uuid(),
  })
  .refine((p) => p.fromId !== p.intoId, "Elegí dos marcas distintas");
