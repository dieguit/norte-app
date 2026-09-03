import { z } from 'zod'
import { allocationEntrySchema } from './goal-creation.schema'

const goalLifecycleSchema = z.enum(['pause', 'resume'])

export const goalLifecycleRequestSchema = z.object({
  goalId: z.string().uuid(),
  lifecycle: goalLifecycleSchema,
})

export const goalLifecyclePreviewSchema = z.object({
  goalId: z.string().uuid(),
  lifecycle: goalLifecycleSchema,
  allocations: z.array(allocationEntrySchema).optional(),
})

export const confirmGoalLifecycleSchema = goalLifecyclePreviewSchema.extend({
  allocations: z.array(allocationEntrySchema),
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
})

export type GoalLifecycle = z.infer<typeof goalLifecycleSchema>
export type GoalLifecycleRequestInput = z.infer<typeof goalLifecycleRequestSchema>
export type GoalLifecyclePreviewInput = z.infer<typeof goalLifecyclePreviewSchema>
export type ConfirmGoalLifecycleInput = z.infer<typeof confirmGoalLifecycleSchema>
