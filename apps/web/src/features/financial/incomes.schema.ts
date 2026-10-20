import { z } from 'zod'
import { IncomeDraftSchema } from '@repo/shared-types'

const incomeDraftSchema = IncomeDraftSchema

export const createIncomeSchema = z.object({ draft: incomeDraftSchema })
export const updateIncomeSchema = z.object({
  incomeId: z.string().uuid(),
  draft: incomeDraftSchema,
})
export const deleteIncomeSchema = z.object({ incomeId: z.string().uuid() })

export type IncomeDraft = z.output<typeof incomeDraftSchema>
type IncomeDraftSchemaInput = z.input<typeof incomeDraftSchema>
export type IncomeDraftInput = Omit<IncomeDraftSchemaInput, 'source'> & {
  source?: IncomeDraftSchemaInput['source']
}
