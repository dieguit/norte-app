import { z } from 'zod'
import {
  ConfirmGoalCompletionWireSchema,
  GoalCompletionPreviewWireSchema,
} from '@repo/shared-types'

export const goalCompletionRequestSchema = z.object({
  goalId: z.string().uuid(),
})

export const goalCompletionPreviewSchema = z.object({
  goalId: z.string().uuid(),
  withdrawals: GoalCompletionPreviewWireSchema.shape.withdrawals,
  allocations: GoalCompletionPreviewWireSchema.shape.allocations,
})

export const confirmGoalCompletionSchema = goalCompletionPreviewSchema.extend({
  previewToken: ConfirmGoalCompletionWireSchema.shape.previewToken,
})

export type GoalCompletionRequestInput = z.infer<typeof goalCompletionRequestSchema>
export type GoalCompletionPreviewInput = z.infer<typeof goalCompletionPreviewSchema>
export type ConfirmGoalCompletionInput = z.infer<typeof confirmGoalCompletionSchema>
