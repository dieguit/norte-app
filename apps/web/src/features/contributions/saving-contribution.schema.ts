import { z } from 'zod'

export const contributionDraftInputSchema = z.object({
  kind: z.enum(['saving', 'investment']).optional().default('saving'),
  currency: z.enum(['ARS', 'USD']),
  amount: z.string(),
  arsSpent: z.string().nullish(),
  effectiveRate: z.string().nullish(),
})

export const savingDraftInputSchema = contributionDraftInputSchema

export const previewTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Token de vista previa inválido.')

export const contributionIdSchema = z.string().uuid('ID de aporte inválido.')

const catchUpMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes de regularización inválido.')

export const confirmContributionSchema = z.object({
  draft: contributionDraftInputSchema,
  previewToken: previewTokenSchema,
  catchUpMonth: catchUpMonthSchema.optional(),
})

export const confirmSavingContributionSchema = confirmContributionSchema

export const updateContributionSchema = z.object({
  contributionId: contributionIdSchema,
  draft: contributionDraftInputSchema,
})

export const updateSavingContributionSchema = updateContributionSchema

export const deleteContributionSchema = z.object({
  contributionId: contributionIdSchema,
})

export const deleteSavingContributionSchema = deleteContributionSchema

export type ContributionDraft = z.input<typeof contributionDraftInputSchema>
export type SavingContributionDraft = ContributionDraft
export type ConfirmContributionInput = z.input<typeof confirmContributionSchema>
export type ConfirmSavingContributionInput = ConfirmContributionInput
export type UpdateContributionInput = z.input<typeof updateContributionSchema>
export type UpdateSavingContributionInput = UpdateContributionInput
export type DeleteContributionInput = z.input<typeof deleteContributionSchema>
export type DeleteSavingContributionInput = DeleteContributionInput

