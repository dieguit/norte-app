import { z } from "zod";

export const BENEFIT_CATEGORIES = [
  "supermercado",
  "combustible",
  "gastronomia",
  "cine",
  "farmacia",
  "indumentaria",
  "viajes",
  "tecnologia",
  "otros",
] as const;
export const BenefitCategorySchema = z.enum(BENEFIT_CATEGORIES);
export type BenefitCategory = z.infer<typeof BenefitCategorySchema>;
export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  supermercado: "Supermercado",
  combustible: "Combustible",
  gastronomia: "Gastronomía",
  cine: "Cine",
  farmacia: "Farmacia",
  indumentaria: "Indumentaria",
  viajes: "Viajes",
  tecnologia: "Tecnología",
  otros: "Otros",
};

export const BENEFIT_KINDS = [
  "discount",
  "cashback",
  "installments",
  "nxm",
] as const;
export type BenefitKind = (typeof BENEFIT_KINDS)[number];
export const BENEFIT_CAP_PERIODS = [
  "transaction",
  "day",
  "week",
  "month",
] as const;
export type BenefitCapPeriod = (typeof BENEFIT_CAP_PERIODS)[number];

export const PROVIDER_KINDS = [
  "bank",
  "network",
  "wallet",
  "membership",
] as const;
export const INSTRUMENT_TYPES = [
  "credit",
  "debit",
  "prepaid",
  "membership",
] as const;
export const CARD_NETWORKS = ["visa", "mastercard", "amex", "cabal"] as const;

export const BenefitCatalogResponseSchema = z.object({
  providers: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      kind: z.enum(PROVIDER_KINDS),
      instruments: z.array(
        z.object({
          slug: z.string(),
          label: z.string(),
          network: z.enum(CARD_NETWORKS).nullable(),
          type: z.enum(INSTRUMENT_TYPES),
          tier: z.string().nullable(),
        }),
      ),
    }),
  ),
  categories: z.array(
    z.object({ slug: BenefitCategorySchema, label: z.string() }),
  ),
});
export type BenefitCatalogResponse = z.infer<
  typeof BenefitCatalogResponseSchema
>;

export const UpdateBenefitPreferencesSchema = z.object({
  instrumentSlugs: z
    .array(z.string().min(1))
    .min(1, "Elegí al menos una tarjeta, cuenta o membresía.")
    .max(100),
  categories: z
    .array(BenefitCategorySchema)
    .min(1, "Elegí al menos una categoría."),
});
export type UpdateBenefitPreferences = z.infer<
  typeof UpdateBenefitPreferencesSchema
>;

export const BenefitPreferencesSchema = z.object({
  instrumentSlugs: z.array(z.string()),
  categories: z.array(BenefitCategorySchema),
  enabled: z.boolean(),
});
export type BenefitPreferences = z.infer<typeof BenefitPreferencesSchema>;
