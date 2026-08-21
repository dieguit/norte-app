import { z } from 'zod'

export const savingDraftInputSchema = z.object({
  currency: z.enum(['ARS', 'USD']),
  amount: z.string(),
  location: z.string().nullish(),
  arsSpent: z.string().nullish(),
  effectiveRate: z.string().nullish(),
})

export const previewTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Token de vista previa inválido.')

export const contributionIdSchema = z.string().uuid('ID de aporte inválido.')

export const confirmSavingContributionSchema = z.object({
  draft: savingDraftInputSchema,
  previewToken: previewTokenSchema,
})

export const updateSavingContributionSchema = z.object({
  contributionId: contributionIdSchema,
  draft: savingDraftInputSchema,
})

export const deleteSavingContributionSchema = z.object({
  contributionId: contributionIdSchema,
})

export type SavingContributionDraft = z.infer<typeof savingDraftInputSchema>
export type ConfirmSavingContributionInput = z.infer<typeof confirmSavingContributionSchema>
export type UpdateSavingContributionInput = z.infer<typeof updateSavingContributionSchema>
export type DeleteSavingContributionInput = z.infer<typeof deleteSavingContributionSchema>
