import { z } from 'zod'
import { isPositiveMoney, parseMoneyInput } from '../../lib/money'
import { FIXED_EXPENSE_SOURCES } from './expenses'

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
  kind: z.enum(
    Object.keys(FIXED_EXPENSE_SOURCES) as [
      keyof typeof FIXED_EXPENSE_SOURCES,
      ...Array<keyof typeof FIXED_EXPENSE_SOURCES>,
    ],
  ),
})

const customSourceSchema = z.union([
  z.object({ kind: z.literal('custom'), sourceId: z.string().uuid() }),
  z.object({
    kind: z.literal('custom'),
    name: z.string().trim().min(1, 'Ingresá una categoría.').max(120, 'Máximo 120 caracteres.'),
  }),
])

export const expenseDraftSchema = z.object({
  concept: conceptSchema,
  source: z.union([fixedSourceSchema, customSourceSchema]),
  amount: amountSchema,
  currency: z.enum(['ARS', 'USD']),
  recurring: z.boolean(),
})

export const createExpenseSchema = z.object({
  draft: expenseDraftSchema,
  effectiveMonth: monthSchema,
})

export const updateExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  draft: expenseDraftSchema,
  effectiveMonth: monthSchema,
})

export const deleteExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  effectiveMonth: monthSchema,
})

export type ExpenseDraft = z.infer<typeof expenseDraftSchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
export type DeleteExpenseInput = z.infer<typeof deleteExpenseSchema>
