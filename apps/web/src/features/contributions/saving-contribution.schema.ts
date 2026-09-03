import { z } from 'zod'
import { savingsPlaceSelectionSchema } from '../savings-places/savings-places.schema'

const contributionDraftInputSchema = z
  .object({
    kind: z.enum(['saving', 'investment']).optional().default('saving'),
    currency: z.enum(['ARS', 'USD']),
    amount: z.string(),
    place: savingsPlaceSelectionSchema.optional(),
    arsSpent: z.string().nullish(),
    effectiveRate: z.string().nullish(),
  })
  .superRefine((data, ctx) => {
    if ((data.kind ?? 'saving') === 'saving' && !data.place) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Elegí un lugar para tu ahorro.',
        path: ['place'],
      })
    }
  })

export const savingDraftInputSchema = contributionDraftInputSchema

const previewTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Token de vista previa inválido.')

const contributionIdSchema = z.string().uuid('ID de aporte inválido.')

const catchUpMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes de regularización inválido.')

const confirmContributionSchema = z.object({
  draft: contributionDraftInputSchema,
  previewToken: previewTokenSchema,
  catchUpMonth: catchUpMonthSchema.optional(),
})

export const confirmSavingContributionSchema = confirmContributionSchema

const updateContributionSchema = z.object({
  contributionId: contributionIdSchema,
  draft: contributionDraftInputSchema,
})

export const updateSavingContributionSchema = updateContributionSchema

const deleteContributionSchema = z.object({
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
