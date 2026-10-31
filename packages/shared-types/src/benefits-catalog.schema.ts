import { z } from "zod";
import { BenefitCapSchema, RequirementSchema } from "./benefits.schema";

// v3 fixed taxonomy; "otros" is never selectable for the digest.
export const CATALOG_CATEGORIES = [
  "supermercados",
  "gastronomia",
  "indumentaria",
  "hogar",
  "electronica",
  "salud-belleza",
  "viajes",
  "transporte",
  "combustible-autos",
  "entretenimiento",
  "ninos-libreria",
  "mascotas-servicios",
  "otros",
] as const;
export const CatalogCategorySchema = z.enum(CATALOG_CATEGORIES);
export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;
export const CATALOG_CATEGORY_LABELS: Record<CatalogCategory, string> = {
  supermercados: "Supermercados",
  gastronomia: "Gastronomía",
  indumentaria: "Indumentaria y accesorios",
  hogar: "Hogar",
  electronica: "Electrónica",
  "salud-belleza": "Salud y belleza",
  viajes: "Viajes",
  transporte: "Transporte",
  "combustible-autos": "Combustible y autos",
  entretenimiento: "Entretenimiento",
  "ninos-libreria": "Niños, juguetes y librería",
  "mascotas-servicios": "Mascotas y servicios",
  otros: "Otros",
};

const isoDay = z.iso.date(); // real calendar dates only

// A campaign can combine offers, e.g. Galicia "20% de ahorro y hasta 18 cuotas sin interés".
export const CampaignOfferSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("percent"),
      percentageBps: z.number().int().min(1).max(10_000),
      // Galicia says "ahorro" without telling discount from cashback.
      mode: z.enum(["discount", "cashback", "unspecified"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("installments"),
      count: z.number().int().min(2).max(60),
      upTo: z.boolean(), // "hasta N cuotas"
    })
    .strict(),
]);
export type CampaignOffer = z.infer<typeof CampaignOfferSchema>;

const conditionText = z.string().trim().min(1).max(500);
const purchaseTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
export const PurchaseConditionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("participating_locations"),
      instruction: conditionText,
      evidence: conditionText,
    })
    .strict(),
  z
    .object({
      kind: z.literal("acquirer"),
      mode: z.enum(["include", "exclude"]),
      names: z.array(conditionText).min(1).max(20),
      evidence: conditionText,
    })
    .strict(),
  z
    .object({
      kind: z.literal("daily_time"),
      from: purchaseTime,
      to: purchaseTime,
      timezone: z.literal("America/Argentina/Buenos_Aires"),
      evidence: conditionText,
    })
    .strict()
    .refine(
      (value) => value.from <= value.to,
      "Overnight purchase windows unsupported",
    ),
  z
    .object({
      kind: z.literal("coupon"),
      code: conditionText.nullable(),
      instruction: conditionText,
      evidence: conditionText,
    })
    .strict(),
  z
    .object({
      kind: z.literal("legal_purchase"),
      text: z.string().trim().min(1).max(2000),
      evidence: conditionText,
    })
    .strict(),
]);
export type PurchaseCondition = z.infer<typeof PurchaseConditionSchema>;

export const CampaignTermsSchema = z
  .object({
    offers: z.array(CampaignOfferSchema).min(1).max(4),
    eligibility: RequirementSchema,
    // incomplete = some requirement could not be read from the source; never shown as eligible.
    eligibilityCompleteness: z.enum(["complete", "incomplete"]),
    unresolved: z.array(z.string().min(1)).max(10),
    purchaseConditions: z.array(PurchaseConditionSchema).max(20).default([]),
    capState: z.enum(["known", "none", "unknown"]),
    caps: z.array(BenefitCapSchema).max(5),
    minimumSpendMinor: z.number().int().nonnegative().nullable(), // null = unknown, 0 = none
    validity: z
      .object({
        from: isoDay.nullable(),
        to: isoDay.nullable(), // inclusive, Argentina; null = unknown end
        weekdays: z.array(z.number().int().min(0).max(6)).min(1).nullable(), // null = every day
      })
      .strict(),
    channels: z.array(z.string().min(1)).max(10), // e.g. modo, qr, nfc, online, instore
    where: z.string().max(500).nullable(), // "Consultá los locales adheridos"
    legalText: z.string().max(20_000).nullable(),
    warnings: z.array(z.string().min(1)).max(10),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (t.capState === "known" && !t.caps.length)
      ctx.addIssue({ code: "custom", message: "capState known requiere caps" });
    if (t.capState !== "known" && t.caps.length)
      ctx.addIssue({ code: "custom", message: "caps sólo con capState known" });
    if (t.validity.from && t.validity.to && t.validity.from > t.validity.to)
      ctx.addIssue({ code: "custom", message: "vigencia invertida" });
  });
export type CampaignTerms = z.infer<typeof CampaignTermsSchema>;
