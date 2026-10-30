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
export const CardNetworkSchema = z.enum(CARD_NETWORKS);
export const CARD_TYPES = ["credit", "debit", "prepaid"] as const;
// Access to an account/app is modelled as a `membership` instrument with a usage, to keep INSTRUMENT_TYPES stable.
export const MEMBERSHIP_USAGES = [
  "wallet_access",
  "account_access",
  "subscription",
  "loyalty",
] as const;

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
export const BENEFIT_LIFECYCLE = [
  "draft",
  "needs_review",
  "published",
  "expired",
  "withdrawn",
] as const;

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

export const BenefitRulesSchema = z
  .object({
    eligibility: RequirementSchema,
    eligibilityCompleteness: z.enum(["complete", "incomplete"]),
    unresolved: z.array(z.string().min(1)).default([]),
    offer: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("discount"),
        percentageBps: z.number().int().min(1).max(10_000),
      }),
      z.object({
        type: z.literal("cashback"),
        percentageBps: z.number().int().min(1).max(10_000),
      }),
      z.object({
        type: z.literal("installments"),
        installments: z.number().int().min(2).max(60),
      }),
      z.object({ type: z.literal("points"), description: z.string().min(1) }),
      z.object({ type: z.literal("other"), description: z.string().min(1) }),
    ]),
    currency: z.literal("ARS"),
    // null = unknown minimum; 0 = no minimum.
    minimumSpendMinor: z.number().int().nonnegative().nullable(),
    capState: z.enum(["known", "none", "unknown"]),
    caps: z.array(BenefitCapSchema).max(5),
    validity: z
      .object({
        from: isoDay.nullable(), // inclusive, America/Argentina/Buenos_Aires
        to: isoDay.nullable(), // inclusive; null = unknown end, NOT unlimited
        weekdays: z.array(z.number().int().min(0).max(6)).min(1).nullable(), // 0=Sunday; null = every weekday
        monthDays: z.array(z.number().int().min(1).max(31)).min(1).nullable(), // null = every day of month
      })
      .strict(),
    channels: z
      .object({
        allowed: z.array(slug).default([]),
        excluded: z.array(slug).default([]),
      })
      .strict(),
    requiredActions: z.array(z.string().min(1)).default([]),
    stackable: z.enum(TRI_STATE),
    // ongoing = fixed membership perk; the digest only surfaces it on category match or right after declaring it.
    recurrence: z.enum(["campaign", "ongoing"]),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.capState === "known" && !r.caps.length)
      ctx.addIssue({ code: "custom", message: "capState known requiere caps" });
    if (r.capState === "none" && r.caps.length)
      ctx.addIssue({ code: "custom", message: "capState none sin caps" });
    if (r.validity.from && r.validity.to && r.validity.from > r.validity.to)
      ctx.addIssue({ code: "custom", message: "vigencia invertida" });
  });
export type BenefitRules = z.infer<typeof BenefitRulesSchema>;

export const BenefitMatchSchema = z.object({
  benefitId: z.string(),
  eligibility: z.enum(["eligible", "ineligible", "needs_information"]),
  availability: z.enum(["available", "upcoming", "unavailable", "unknown"]),
  nextDate: isoDay.nullable(),
  stale: z.boolean(),
  // Allowed channels are alternatives, not cumulative required actions.
  channels: z.object({
    allowed: z.array(z.string()),
    excluded: z.array(z.string()),
  }),
  matchedInstrumentSlugs: z.array(z.string()),
  missingFacts: z.array(z.string()),
  reasons: z.array(z.string()),
  requiredActions: z.array(z.string()),
  estimatedSavingMinor: z.number().int().nonnegative().nullable(),
  estimateAssumptions: z.array(z.string()),
});
export type BenefitMatch = z.infer<typeof BenefitMatchSchema>;

export const BenefitCatalogResponseSchema = z.object({
  providers: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      kind: z.enum(PROVIDER_KINDS),
      coverage: z.enum(["active", "partial", "pending"]),
      instruments: z.array(
        z.object({
          slug: z.string(),
          label: z.string(),
          network: z.enum(CARD_NETWORKS).nullable(),
          type: z.enum(INSTRUMENT_TYPES),
          tier: z.string().nullable(),
          issuerProviderSlug: z.string().nullable(),
          segment: z.string().nullable(),
          productLevel: z.string().nullable(),
          usage: z.enum(MEMBERSHIP_USAGES).nullable(),
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
  instrumentFacts: BenefitProfileFactsSchema.shape.instrumentFacts
    .removeDefault()
    .optional(),
  providerFacts: BenefitProfileFactsSchema.shape.providerFacts
    .removeDefault()
    .optional(),
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
  ...BenefitProfileFactsSchema.shape,
  instrumentSlugs: z.array(z.string()),
  categories: z.array(BenefitCategorySchema),
  enabled: z.boolean(),
});
export type BenefitPreferences = z.infer<typeof BenefitPreferencesSchema>;
