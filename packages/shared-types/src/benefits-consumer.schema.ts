import { z } from "zod";
import {
  BenefitCapSchema,
  CARD_TYPES,
  CardNetworkSchema,
  RequirementSchema,
} from "./benefits.schema";
import {
  CATALOG_CATEGORIES,
  CampaignOfferSchema,
  CampaignTermsSchema,
  CatalogCategorySchema,
} from "./benefits-catalog.schema";

export const DIGEST_CATEGORIES = CATALOG_CATEGORIES.filter(
  (c): c is Exclude<(typeof CATALOG_CATEGORIES)[number], "otros"> =>
    c !== "otros",
);
export const DigestCategorySchema = z.enum(
  DIGEST_CATEGORIES as [
    (typeof DIGEST_CATEGORIES)[number],
    ...(typeof DIGEST_CATEGORIES)[number][],
  ],
);
export type DigestCategory = z.infer<typeof DigestCategorySchema>;

const slug = z.string().min(1).max(80);

export const BenefitCardSchema = z
  .object({ type: z.enum(CARD_TYPES), network: CardNetworkSchema })
  .strict();
export type BenefitCard = z.infer<typeof BenefitCardSchema>;

export const BenefitBankProfileSchema = z
  .object({
    slug,
    tier: slug.nullable(), // null = "No sé"
    cards: z
      .array(BenefitCardSchema)
      .max(10)
      .refine(
        (cards) =>
          new Set(cards.map((c) => `${c.type}:${c.network}`)).size ===
          cards.length,
        "Tarjeta repetida",
      ),
  })
  .strict();
export type BenefitBankProfile = z.infer<typeof BenefitBankProfileSchema>;

export const UpdateBenefitProfileSchema = z
  .object({
    banks: z
      .array(BenefitBankProfileSchema)
      .max(20)
      .refine(
        (banks) => new Set(banks.map((b) => b.slug)).size === banks.length,
        "Banco repetido",
      ),
    usesModo: z.boolean(),
    categories: z
      .array(DigestCategorySchema)
      .min(1, "Elegí al menos una categoría.")
      .max(DIGEST_CATEGORIES.length),
  })
  .strict();
export type UpdateBenefitProfile = z.infer<typeof UpdateBenefitProfileSchema>;

export const BenefitProfileSchema = UpdateBenefitProfileSchema.extend({
  categories: z.array(DigestCategorySchema),
  enabled: z.boolean(), // daily digest
});
export type BenefitProfile = z.infer<typeof BenefitProfileSchema>;

export const BenefitBankOptionSchema = z.object({
  slug: z.string(),
  name: z.string(),
  coverage: z.enum(["modo", "modo_and_own"]),
  ownCatalogScope: z.string().nullable(),
  tiers: z.array(z.object({ code: z.string(), label: z.string() })),
  stale: z.boolean(), // no trustworthy run in the last 48h
});
export const BenefitBankListSchema = z.object({
  banks: z.array(BenefitBankOptionSchema),
});
export type BenefitBankList = z.infer<typeof BenefitBankListSchema>;

export const BenefitSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  category: CatalogCategorySchema.optional(),
  bank: slug.optional(),
  day: z.enum(["today", "tomorrow", "week"]).default("today"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type BenefitSearchQuery = z.infer<typeof BenefitSearchQuerySchema>;

const isoDay = z.iso.date();

const benefitQualifications = {
  capState: CampaignTermsSchema.shape.capState,
  caps: z.array(BenefitCapSchema),
  minimumSpendMinor: z.number().int().nonnegative().nullable(),
  validity: CampaignTermsSchema.shape.validity,
  nextDate: isoDay, // first day in the requested window when it applies
  channels: z.array(z.string()),
  where: z.string().nullable(),
  requiresModo: z.boolean(),
  // Which of the user's bank cards satisfy it; empty when no card is required.
  usableWith: z.array(
    z.object({
      bankSlug: z.string(),
      bankName: z.string(),
      card: BenefitCardSchema.nullable(),
    }),
  ),
};

export const BenefitResultSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(["galicia", "playdigital"]),
  brandName: z.string().nullable(),
  title: z.string(),
  categories: z.array(CatalogCategorySchema),
  offers: z.array(CampaignOfferSchema),
  ...benefitQualifications,
  purchaseConditions: CampaignTermsSchema.shape.purchaseConditions,
  // needs_tier = eligible only for a tier the user hasn't told us ("No sé").
  match: z.enum(["eligible", "conditional", "needs_tier"]),
  tierLabels: z.array(z.string()), // tiers this variant requires, bank's wording
  variants: z.array(
    z.object({
      id: z.string().uuid(),
      variantKey: z.string(),
      offers: z.array(CampaignOfferSchema),
      ...benefitQualifications,
      tierLabels: z.array(z.string()),
      match: z.enum(["eligible", "conditional", "needs_tier"]),
      purchaseConditions: CampaignTermsSchema.shape.purchaseConditions,
    }),
  ),
  verifyUrl: z.string(),
  verifyHint: z.string().nullable(),
  updatedAt: z.string(),
});
export type BenefitResult = z.infer<typeof BenefitResultSchema>;

export const BenefitSearchResultSchema = z.object({
  profileConfigured: z.boolean(),
  items: z.array(BenefitResultSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  pageSize: z.number().int(),
  countsByCategory: z.record(z.string(), z.number().int().nonnegative()),
  staleBanks: z.array(z.string()),
});
export type BenefitSearchResult = z.infer<typeof BenefitSearchResultSchema>;

export const BenefitDetailSchema = BenefitResultSchema.extend({
  match: z.enum(["eligible", "conditional", "needs_tier", "ineligible"]),
  eligibility: RequirementSchema,
  legalText: z.string().nullable(),
  warnings: z.array(z.string()),
});
export type BenefitDetail = z.infer<typeof BenefitDetailSchema>;
