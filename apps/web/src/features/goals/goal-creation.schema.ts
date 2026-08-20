import BigNumber from 'bignumber.js'
import { z } from 'zod'
import { parseMoneyInput, type CurrencyCode } from '../../lib/money'

export const goalTypeSchema = z.enum(['emergency_fund', 'purchase', 'retirement', 'other'])
export const goalPrioritySchema = z.enum(['high', 'medium', 'low'])
export const goalStrategySchema = z.enum(['save', 'invest'])
export const investmentAvailabilitySchema = z.enum(['available_now', 'available_from', 'long_term'])

export const percentageSchema = z.string().refine((value) => {
  try {
    const amount = new BigNumber(value.replace(',', '.'))
    const decimals = amount.decimalPlaces()
    return amount.isFinite() && amount.gte(0) && amount.lte(100) && decimals !== null && decimals <= 2
  } catch {
    return false
  }
}, 'Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.')

export const allocationEntrySchema = z.object({
  goalId: z.string().min(1),
  percentage: percentageSchema,
})

export const goalCreationDraftSchema = z.object({
  type: goalTypeSchema,
  name: z.string().trim().min(1, 'Ingresá un nombre.').max(120, 'Usá hasta 120 caracteres.'),
  targetAmount: z.string(),
  currency: z.enum(['ARS', 'USD']),
  desiredMonth: z.string(),
  priority: goalPrioritySchema,
  strategy: goalStrategySchema,
  annualReturnRate: z.string(),
  availability: investmentAvailabilitySchema,
  availableFromMonth: z.string(),
  allocations: z.array(allocationEntrySchema),
})

export type GoalCreationDraft = z.infer<typeof goalCreationDraftSchema>

export function createObjectiveSchema(currentMonth: string) {
  return goalCreationDraftSchema.superRefine((draft, context) => {
    if (draft.type === 'emergency_fund') {
      if (draft.currency !== 'USD') context.addIssue({ code: 'custom', path: ['currency'], message: 'El colchón financiero se planifica en USD.' })
    } else {
      const target = parseMoneyInput(draft.targetAmount, draft.currency as CurrencyCode)
      if (!target || new BigNumber(target.amount).lte(0)) context.addIssue({ code: 'custom', path: ['targetAmount'], message: 'Ingresá un monto objetivo mayor a cero.' })
    }
    if (draft.desiredMonth && draft.desiredMonth <= currentMonth) context.addIssue({ code: 'custom', path: ['desiredMonth'], message: 'Elegí un mes posterior al actual.' })
  })
}

export const goalPlanSchema = goalCreationDraftSchema.superRefine((draft, context) => {
  if (draft.strategy === 'invest') {
    let rate: BigNumber | null = null
    try {
      rate = new BigNumber(draft.annualReturnRate.replace(',', '.'))
    } catch {
      rate = null
    }
    const rateDecimals = rate?.decimalPlaces()
    if (!rate || !rate.isFinite() || rate.lt(0) || rate.gt(100) || rateDecimals === null || rateDecimals === undefined || rateDecimals > 3) {
      context.addIssue({ code: 'custom', path: ['annualReturnRate'], message: 'Ingresá un rendimiento entre 0% y 100%, con hasta tres decimales.' })
    }
    if (draft.availability === 'available_from' && !/^\d{4}-\d{2}$/.test(draft.availableFromMonth)) {
      context.addIssue({ code: 'custom', path: ['availableFromMonth'], message: 'Elegí desde qué mes estará disponible.' })
    }
  }
})

export const goalImpactSchema = z.object({
  allocations: z.array(allocationEntrySchema).min(1),
}).superRefine((data, context) => {
  let total = new BigNumber(0)
  for (const entry of data.allocations) {
    try {
      const entryBn = new BigNumber(entry.percentage.replace(',', '.'))
      if (entryBn.isFinite()) {
        total = total.plus(entryBn)
      }
    } catch {
      // Ignored here since allocationEntrySchema will flag individual invalid entries
    }
  }
  if (!total.eq(100)) {
    context.addIssue({ code: 'custom', path: ['allocations'], message: `La distribución debe sumar 100%. Ahora suma ${total.toFixed(2)}%.` })
  }
})

export const confirmGoalCreationSchema = z.object({
  draft: goalCreationDraftSchema,
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((input, context) => {
  const impactResult = goalImpactSchema.safeParse({ allocations: input.draft.allocations })
  if (!impactResult.success) {
    for (const issue of impactResult.error.issues) {
      context.addIssue({ code: 'custom', message: issue.message, path: ['draft', ...issue.path] })
    }
  }
})

export type ConfirmGoalCreationInput = z.infer<typeof confirmGoalCreationSchema>

export function parseGoalCreationSubmission(input: unknown, currentMonth: string): GoalCreationDraft {
  const draft = goalCreationDraftSchema.parse(input)
  createObjectiveSchema(currentMonth).parse(draft)
  goalPlanSchema.parse(draft)
  if (draft.allocations && draft.allocations.length > 0) {
    goalImpactSchema.parse({ allocations: draft.allocations })
  }
  return draft
}
