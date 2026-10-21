import { z } from 'zod';
import { MoneySchema, ProjectionSchema } from './goals.schema';

const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const PreviewTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Token de vista previa inválido.');
const ContributionIdSchema = z.string().uuid('ID de aporte inválido.');
const CatchUpMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes de regularización inválido.');

const SavingsPlaceSelectionWireSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('existing'), placeId: z.string().uuid('Elegí un lugar válido.') }).strict(),
  z.object({ kind: z.literal('new'), name: z.string().trim().min(1, 'Escribí un nombre para el lugar.').max(120) }).strict(),
]);

export const ContributionDraftWireBaseSchema = z.object({
  kind: z.enum(['saving', 'investment']).optional().default('saving'),
  currency: z.enum(['ARS', 'USD']),
  amount: z.string(),
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: z.string().nullish(),
  effectiveRate: z.string().nullish(),
}).strict();

export const SavingContributionDraftWireSchema = ContributionDraftWireBaseSchema.superRefine((data, ctx) => {
  if (data.kind === 'saving' && !data.place) {
    ctx.addIssue({ code: 'custom', message: 'Elegí un lugar para tu ahorro.', path: ['place'] });
  }
});

export const ConfirmSavingContributionWireSchema = z.object({
  draft: SavingContributionDraftWireSchema,
  previewToken: PreviewTokenSchema,
  catchUpMonth: CatchUpMonthSchema.optional(),
}).strict();

export const UpdateSavingContributionWireSchema = z.object({
  draft: SavingContributionDraftWireSchema,
}).strict();

export const ContributionIdPathWireSchema = z.object({ id: ContributionIdSchema }).strict();

const EligibleGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  percentage: z.union([z.string(), z.number()]),
}).strict();

const InvestmentCurrencyStateSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ready') }).strict(),
  z.object({ status: z.literal('incomplete'), reason: z.literal('missing_investment_position') }).strict(),
]);

export const SavingContributionContextSchema = z.object({
  currentMonth: MonthSchema,
  eligibleGoals: z.array(EligibleGoalSchema),
  eligibleGoalsUsd: z.array(EligibleGoalSchema),
  eligibleInvestmentGoals: z.array(EligibleGoalSchema).optional(),
  eligibleInvestmentGoalsUsd: z.array(EligibleGoalSchema).optional(),
  monthlyTargetArs: MoneySchema.nullish(),
  monthlyTargetUsd: MoneySchema.nullish(),
  monthlyInvestmentTargetArs: MoneySchema.nullish(),
  monthlyInvestmentTargetUsd: MoneySchema.nullish(),
  places: z.array(z.object({ id: z.string(), name: z.string() }).strict()),
  investmentState: z.object({ ars: InvestmentCurrencyStateSchema, usd: InvestmentCurrencyStateSchema }).strict(),
}).strict();

export const SavingContributionContextMissingSchema = z.object({ profile: z.literal('missing') }).strict();
export const SavingContributionContextPresentSchema = z.object({ profile: z.literal('present'), context: SavingContributionContextSchema }).strict();
export const SavingContributionContextStateSchema = z.discriminatedUnion('profile', [
  SavingContributionContextMissingSchema,
  SavingContributionContextPresentSchema,
]);

const SavingDraftResultSchema = z.object({
  kind: z.enum(['saving', 'investment']).optional(),
  currency: z.enum(['ARS', 'USD']),
  amount: MoneySchema,
  place: SavingsPlaceSelectionWireSchema.optional(),
  arsSpent: MoneySchema.optional(),
  effectiveRate: z.string().optional(),
}).strict();

const SavingAllocationPreviewSchema = z.object({
  goalId: z.string(),
  goalName: z.string(),
  percentage: z.string(),
  amount: MoneySchema,
  progressBefore: z.string().optional(),
  progressAfter: z.string().optional(),
  projectionBefore: ProjectionSchema.optional(),
  projectionAfter: ProjectionSchema.optional(),
}).strict();

const SavingContributionPreviewBodySchema = z.object({
  draft: SavingDraftResultSchema,
  allocations: z.array(SavingAllocationPreviewSchema),
}).strict();

export const SavingContributionEditPreviewSchema = z.object({
  preview: SavingContributionPreviewBodySchema,
}).strict();

export const SavingContributionPreviewSchema = z.object({
  preview: SavingContributionPreviewBodySchema,
  previewToken: PreviewTokenSchema,
}).strict();

export const SavingContributionCreatedSchema = z.object({ status: z.literal('created'), contributionId: z.string().uuid() }).strict();
export const SavingContributionStaleSchema = z.object({ status: z.literal('stale'), preview: SavingContributionPreviewSchema }).strict();
export const SavingContributionConfirmationSchema = z.discriminatedUnion('status', [
  SavingContributionCreatedSchema,
  SavingContributionStaleSchema,
]);

export const SavingContributionUpdatedSchema = z.object({ status: z.literal('updated') }).strict();
export const SavingContributionDeletedSchema = z.object({ status: z.literal('deleted') }).strict();

export type SavingContributionDraftWire = z.input<typeof SavingContributionDraftWireSchema>;
export type ConfirmSavingContributionWire = z.input<typeof ConfirmSavingContributionWireSchema>;
export type UpdateSavingContributionWire = z.input<typeof UpdateSavingContributionWireSchema>;
export type SavingContributionContext = z.infer<typeof SavingContributionContextSchema>;
export type SavingContributionContextState = z.infer<typeof SavingContributionContextStateSchema>;
export type SavingContributionPreview = z.infer<typeof SavingContributionPreviewSchema>;
export type SavingContributionEditPreview = z.infer<typeof SavingContributionEditPreviewSchema>;
export type SavingContributionConfirmation = z.infer<typeof SavingContributionConfirmationSchema>;
