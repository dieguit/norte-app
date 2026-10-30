import { z } from "zod";

export const INSTRUMENT_TYPES = [
  "credit",
  "debit",
  "prepaid",
  "membership",
] as const;
export const CARD_NETWORKS = ["visa", "mastercard", "amex", "cabal"] as const;
export const CardNetworkSchema = z.enum(CARD_NETWORKS);
export const CARD_TYPES = ["credit", "debit", "prepaid"] as const;
const slug = z.string().min(1).max(80);
const slugList = z.array(slug).min(1).max(50);

// Fields are evaluated against ONE card: lists are OR, distinct fields are AND, exclusions win.
export const CardSelectorSchema = z
  .object({
    instrumentSlugs: slugList.optional(),
    issuerProviderSlugs: slugList.optional(),
    excludedIssuerProviderSlugs: slugList.optional(),
    network: CardNetworkSchema.optional(),
    types: z.array(z.enum(CARD_TYPES)).min(1).optional(),
    productLevels: slugList.optional(),
    segments: slugList.optional(),
    issuerCountries: z.array(z.string().length(2)).min(1).optional(),
  })
  .strict()
  .refine((s) => Object.values(s).some((v) => v !== undefined), {
    message: "CardSelector vacío",
  });
export type CardSelector = z.infer<typeof CardSelectorSchema>;

export const PROVIDER_FACT_KEYS = [
  "salaryAccount",
  "plan",
  "loyaltyLevel",
  "tier",
] as const;

export type Requirement =
  | { allOf: Requirement[] }
  | { anyOf: Requirement[] }
  | { card: CardSelector }
  | { membership: { instrumentSlug: string } }
  | {
      providerFact: {
        providerSlug: string;
        key: (typeof PROVIDER_FACT_KEYS)[number];
        values: (string | boolean)[];
      };
    };

export const REQUIREMENT_MAX_DEPTH = 5;
export const REQUIREMENT_MAX_NODES = 50;

const RequirementNodeSchema: z.ZodType<Requirement> = z.lazy(() =>
  z.union([
    z.object({ allOf: z.array(RequirementNodeSchema).min(1) }).strict(),
    z.object({ anyOf: z.array(RequirementNodeSchema).min(1) }).strict(),
    z.object({ card: CardSelectorSchema }).strict(),
    z
      .object({ membership: z.object({ instrumentSlug: slug }).strict() })
      .strict(),
    z
      .object({
        providerFact: z
          .object({
            providerSlug: slug,
            key: z.enum(PROVIDER_FACT_KEYS),
            values: z.array(z.union([z.string().min(1), z.boolean()])).min(1),
          })
          .strict(),
      })
      .strict(),
  ]),
);

function requirementShape(
  r: Requirement,
  depth = 1,
): { depth: number; nodes: number } {
  const children = "allOf" in r ? r.allOf : "anyOf" in r ? r.anyOf : [];
  return children.reduce(
    (acc, child) => {
      const c = requirementShape(child, depth + 1);
      return {
        depth: Math.max(acc.depth, c.depth),
        nodes: acc.nodes + c.nodes,
      };
    },
    { depth, nodes: 1 },
  );
}

export const RequirementSchema = RequirementNodeSchema.refine((r) => {
  const { depth, nodes } = requirementShape(r);
  return depth <= REQUIREMENT_MAX_DEPTH && nodes <= REQUIREMENT_MAX_NODES;
}, "Árbol de requisitos demasiado grande");

const isoDay = z.iso.date();

// undefined = unknown; never read a missing fact as false.
export const InstrumentFactsSchema = z
  .object({
    segment: slug.optional(),
    productLevel: slug.optional(),
    issuerCountry: z.string().length(2).optional(),
    membershipStatus: z.enum(["active", "inactive", "unknown"]).optional(),
    membershipValidUntil: isoDay.optional(),
  })
  .strict();
export type InstrumentFacts = z.infer<typeof InstrumentFactsSchema>;

export const ProviderFactsSchema = z
  .object({
    salaryAccount: z.boolean().optional(),
    plan: slug.optional(),
    loyaltyLevel: slug.optional(),
    tier: slug.optional(),
  })
  .strict();
export type ProviderFacts = z.infer<typeof ProviderFactsSchema>;

export const BenefitProfileFactsSchema = z.object({
  instrumentFacts: z.record(slug, InstrumentFactsSchema).default({}),
  providerFacts: z.record(slug, ProviderFactsSchema).default({}),
});
export type BenefitProfileFacts = z.infer<typeof BenefitProfileFactsSchema>;

export const OFFER_TYPES = [
  "discount",
  "cashback",
  "installments",
  "points",
  "other",
] as const;
export const CAP_PERIODS = [
  "transaction",
  "day",
  "week",
  "month",
  "campaign",
] as const;
export const CAP_SCOPES = [
  "card",
  "account",
  "person",
  "bank",
  "promotion",
] as const;
export const TRI_STATE = ["yes", "no", "unknown"] as const;
// Money is integer minor units (ARS centavos); percentages are basis points.
export const BenefitCapSchema = z
  .object({
    amountMinor: z.number().int().positive().nullable(), // null = cap exists, amount unknown
    period: z.enum(CAP_PERIODS),
    scope: z.enum(CAP_SCOPES).nullable(),
    sharedCapGroupId: slug.optional(),
  })
  .strict();
export type BenefitCap = z.infer<typeof BenefitCapSchema>;
