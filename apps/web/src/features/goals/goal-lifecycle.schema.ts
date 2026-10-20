import { z } from 'zod'
import {
  GoalLifecycleActionSchema,
  GoalLifecyclePreviewWireSchema,
  ConfirmGoalLifecycleWireSchema,
} from '@repo/shared-types'

export const goalLifecycleRequestSchema = z.object({
  goalId: z.string().uuid(),
  lifecycle: GoalLifecycleActionSchema,
})

export const goalLifecyclePreviewSchema = z.object({
  goalId: z.string().uuid(),
  lifecycle: GoalLifecycleActionSchema,
  allocations: GoalLifecyclePreviewWireSchema.shape.allocations,
})

export const confirmGoalLifecycleSchema = z.object({
  goalId: z.string().uuid(),
  lifecycle: GoalLifecycleActionSchema,
  allocations: ConfirmGoalLifecycleWireSchema.shape.allocations,
  previewToken: ConfirmGoalLifecycleWireSchema.shape.previewToken,
})

export type GoalLifecycle = z.infer<typeof GoalLifecycleActionSchema>
export type GoalLifecycleRequestInput = z.infer<typeof goalLifecycleRequestSchema>
export type GoalLifecyclePreviewInput = z.infer<typeof goalLifecyclePreviewSchema>
export type ConfirmGoalLifecycleInput = z.infer<typeof confirmGoalLifecycleSchema>
