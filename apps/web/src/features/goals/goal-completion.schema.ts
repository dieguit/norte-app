import BigNumber from 'bignumber.js'
import { z } from 'zod'
import { allocationEntrySchema } from './goal-creation.schema'

export function isPlainDecimalMoneyString(value: unknown): value is string {
  return typeof value === 'string' && /^\d+(?:[.,]\d{1,2})?$/.test(value.trim())
}

const positiveAmountSchema = z.string().trim().refine((value) => {
  if (!isPlainDecimalMoneyString(value)) return false
  try {
    const amount = new BigNumber(value.replace(',', '.'))
    const decimals = amount.decimalPlaces()
    return amount.isFinite() && amount.isGreaterThan(0) && decimals !== null && decimals <= 2
  } catch {
    return false
  }
}, 'Ingresá un monto mayor a cero, con hasta dos decimales.')

export const goalCompletionRequestSchema = z.object({
  goalId: z.string().uuid(),
})

export const goalCompletionPreviewSchema = z
  .object({
    goalId: z.string().uuid(),
    withdrawals: z
      .array(
        z.object({
          placeId: z.string().uuid(),
          amount: positiveAmountSchema,
        }),
      )
      .min(1),
    allocations: z.array(allocationEntrySchema),
  })
  .refine(
    ({ withdrawals }) =>
      new Set(withdrawals.map(({ placeId }) => placeId)).size === withdrawals.length,
    { message: 'Cada lugar de ahorro puede aparecer una sola vez.' },
  )

export const confirmGoalCompletionSchema = goalCompletionPreviewSchema.safeExtend({
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
})

export type GoalCompletionRequestInput = z.infer<typeof goalCompletionRequestSchema>
export type GoalCompletionPreviewInput = z.infer<typeof goalCompletionPreviewSchema>
export type ConfirmGoalCompletionInput = z.infer<typeof confirmGoalCompletionSchema>
