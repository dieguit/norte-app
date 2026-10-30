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

export const CampaignTermsSchema = z
  .object({
    offers: z.array(CampaignOfferSchema).min(1).max(4),
    eligibility: RequirementSchema,
    // incomplete = some requirement could not be read from the source; never shown as eligible.
    eligibilityCompleteness: z.enum(["complete", "incomplete"]),
    unresolved: z.array(z.string().min(1)).max(10),
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
