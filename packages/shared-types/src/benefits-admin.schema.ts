import { z } from "zod";
import {
  BENEFIT_LIFECYCLE,
  BenefitCategorySchema,
  BenefitRulesSchema,
} from "./benefits.schema";

export const BenefitLifecycleSchema = z.enum(BENEFIT_LIFECYCLE);

export const BenefitEvidenceSchema = z.object({
  sourceUrl: z.string(),
  detailUrl: z.string().nullable(),
  termsUrl: z.string().nullable(),
  quotes: z.array(z.object({ field: z.string(), quote: z.string() })),
});

export const AdminBenefitListQuerySchema = z.object({
  status: BenefitLifecycleSchema.optional(),
  source: z.string().min(1).max(80).optional(),
});
export type AdminBenefitListQuery = z.infer<typeof AdminBenefitListQuerySchema>;

export const AdminBenefitListItemSchema = z.object({
  id: z.string(),
  lifecycle: BenefitLifecycleSchema,
  origin: z.enum(["harvest", "manual"]),
  publisherProviderSlug: z.string(),
  category: BenefitCategorySchema,
  title: z.string(),
  merchant: z.string().nullable(),
  rules: BenefitRulesSchema,
  hasPendingRevision: z.boolean(),
  lastVerifiedAt: z.string().nullable(), // ISO
});
export type AdminBenefitListItem = z.infer<typeof AdminBenefitListItemSchema>;

export const AdminBenefitListSchema = z.object({
  benefits: z.array(AdminBenefitListItemSchema),
});
export type AdminBenefitList = z.infer<typeof AdminBenefitListSchema>;

export const AdminBenefitRevisionSchema = z.object({
  id: z.string(),
  baseVersion: z.number().int(),
  category: BenefitCategorySchema,
  title: z.string(),
  merchant: z.string().nullable(),
  rules: BenefitRulesSchema,
  evidence: BenefitEvidenceSchema,
  actor: z.string(),
  createdAt: z.string(), // ISO
  // Top-level fields that differ from the current snapshot; rules sub-keys as "rules.<key>".
  changedFields: z.array(z.string()),
});

export const AdminBenefitDetailSchema = AdminBenefitListItemSchema.extend({
  evidence: BenefitEvidenceSchema,
  protectedFields: z.array(z.string()),
  version: z.number().int(),
  pendingRevision: AdminBenefitRevisionSchema.nullable(),
});
export type AdminBenefitDetail = z.infer<typeof AdminBenefitDetailSchema>;

export const AdminBenefitActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    reason: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("reject"), reason: z.string().min(1).max(500) }),
  z.object({ action: z.literal("reverify") }),
]);
export type AdminBenefitAction = z.infer<typeof AdminBenefitActionSchema>;

export const AdminBenefitActionResultSchema = z.object({
  benefitId: z.string(),
  lifecycle: BenefitLifecycleSchema,
  version: z.number().int(),
});
export type AdminBenefitActionResult = z.infer<
  typeof AdminBenefitActionResultSchema
>;

export const AdminSourceSchema = z.object({
  sourceId: z.string(),
  providerSlug: z.string(),
  url: z.string(),
  status: z.string(),
  coverage: z.string(),
  note: z.string().nullable(),
  enabled: z.boolean(), // effective (catalog default + DB override)
  autoPublish: z.boolean(),
  lastRun: z
    .object({
      outcome: z.enum(["ok", "partial", "blocked", "failed"]),
      complete: z.boolean(),
      detected: z.number().int(),
      valid: z.number().int(),
      rejected: z.number().int(),
      diagnostics: z.array(z.string()),
      startedAt: z.string(), // ISO
    })
    .nullable(),
});
export type AdminSource = z.infer<typeof AdminSourceSchema>;

export const AdminSourceListSchema = z.object({
  sources: z.array(AdminSourceSchema),
});
export type AdminSourceList = z.infer<typeof AdminSourceListSchema>;

export const AdminSourcePolicyPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    autoPublish: z.boolean().optional(),
  })
  .refine(
    (p) => p.enabled !== undefined || p.autoPublish !== undefined,
    "Nada para cambiar",
  );
export type AdminSourcePolicyPatch = z.infer<
  typeof AdminSourcePolicyPatchSchema
>;
