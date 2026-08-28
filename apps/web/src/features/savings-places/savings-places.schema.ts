import { z } from 'zod'
import { isPositiveMoney, parseMoneyInput } from '../../lib/money'

export const savingsPlaceSelectionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('existing'), placeId: z.string().uuid('Elegí un lugar válido.') }),
  z.object({
    kind: z.literal('new'),
    name: z.string().trim().min(1, 'Escribí un nombre para el lugar.').max(120),
  }),
])

export type SavingsPlaceSelection = z.infer<typeof savingsPlaceSelectionSchema>

export const createSavingsPlaceSchema = z.object({
  name: z.string().trim().min(1, 'Escribí un nombre para el lugar.').max(120),
})

export const renameSavingsPlaceSchema = z.object({
  placeId: z.string().uuid(),
  name: z.string().trim().min(1, 'Escribí un nombre para el lugar.').max(120),
})

export const deleteSavingsPlaceSchema = z.object({
  placeId: z.string().uuid(),
})

export const transferSavingsSchema = z
  .object({
    fromPlaceId: z.string().uuid(),
    toPlaceId: z.string().uuid(),
    currency: z.enum(['ARS', 'USD']),
    amount: z.string().transform((value, ctx) => {
      const parsed = parseMoneyInput(value, 'ARS')
      if (!parsed || !isPositiveMoney(parsed)) {
        ctx.addIssue({ code: 'custom', message: 'Ingresá un monto mayor a cero.' })
        return z.NEVER
      }
      return parsed.amount
    }),
  })
  .refine((data) => data.fromPlaceId !== data.toPlaceId, {
    message: 'El origen y el destino deben ser distintos.',
  })
