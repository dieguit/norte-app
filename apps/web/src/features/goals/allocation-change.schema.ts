import { z } from 'zod'
import { goalImpactSchema } from './goal-creation.schema'

export const allocationChangeDraftSchema = goalImpactSchema

export const confirmAllocationChangeSchema = z.object({
  draft: allocationChangeDraftSchema,
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
})

export type AllocationChangeDraft = z.infer<typeof allocationChangeDraftSchema>
export type ConfirmAllocationChangeInput = z.infer<typeof confirmAllocationChangeSchema>
