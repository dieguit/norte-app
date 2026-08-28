import { z } from 'zod'
import { isPositiveMoney, parseMoneyInput } from '../../lib/money'
import { FIXED_INCOME_SOURCES } from './incomes'

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Ingresá un mes válido.')

const amountSchema = z.string().refine(
  (amount) => {
    const parsed = parseMoneyInput(amount, 'ARS')
    return parsed !== null && isPositiveMoney(parsed)
  },
  'Ingresá un monto mayor a cero.',
)

const conceptSchema = z.string().trim().min(1, 'Ingresá un concepto.').max(120, 'Máximo 120 caracteres.')

const fixedSourceSchema = z.object({
  kind: z.enum(Object.keys(FIXED_INCOME_SOURCES) as [keyof typeof FIXED_INCOME_SOURCES, ...Array<keyof typeof FIXED_INCOME_SOURCES>]),
})

const customSourceSchema = z.union([
  z.object({ kind: z.literal('custom'), sourceId: z.string().uuid() }),
  z.object({
    kind: z.literal('custom'),
    name: z.string().trim().min(1, 'Ingresá una categoría.').max(120, 'Máximo 120 caracteres.'),
  }),
])

export const incomeDraftSchema = z.object({
  concept: conceptSchema,
  source: z.union([fixedSourceSchema, customSourceSchema]),
  amount: amountSchema,
  currency: z.enum(['ARS', 'USD']),
  recurring: z.boolean(),
  effectiveMonth: monthSchema,
})

export const createIncomeSchema = z.object({ draft: incomeDraftSchema })
export const updateIncomeSchema = z.object({ incomeId: z.string().uuid(), draft: incomeDraftSchema })
export const deleteIncomeSchema = z.object({ incomeId: z.string().uuid() })

export type IncomeDraft = z.infer<typeof incomeDraftSchema>
