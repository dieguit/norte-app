import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  calculateAllocationAmounts,
  createMoney,
  isPositiveMoney,
  parseMoneyInput,
} from '../../lib/money'
import {
  type GoalProjection,
  type GoalsWorkspaceSource,
  buildGoalsWorkspace,
} from '../goals/goals'

import { PLANNING_ARS_PER_USD } from '../financial/financial'

export type ContributionKind = 'saving' | 'investment'

export interface EligibleGoalSource {
  id: string
  name?: string
  status?: string
  currency: CurrencyCode | string
  strategy: string
  percentage?: string | number
}

export function selectEligibleGoals<T extends EligibleGoalSource = EligibleGoalSource>(
  goals: T[],
  kind: ContributionKind,
  currency: CurrencyCode,
): T[] {
  const strategy = kind === 'saving' ? 'save' : 'invest'
  return goals.filter(
    (goal) => goal.status === 'active' && goal.currency === currency && goal.strategy === strategy,
  )
}

export interface SavingDraftInput {
  kind?: ContributionKind
  currency: CurrencyCode
  amount: string
  location?: string | null
  arsSpent?: string | null
  effectiveRate?: string | null
}

export interface SavingDraft {
  kind?: ContributionKind
  currency: CurrencyCode
  amount: Money
  location?: string
  arsSpent?: Money
  effectiveRate?: string
}

export interface EligibleGoal {
  id: string
  name: string
  percentage: string | number
}

export interface SavingAllocationPreview {
  goalId: string
  goalName: string
  percentage: string
  amount: Money
  progressBefore?: string
  progressAfter?: string
  projectionBefore?: GoalProjection
  projectionAfter?: GoalProjection
}

export interface SavingPreviewResult {
  draft: SavingDraft
  allocations: SavingAllocationPreview[]
}

export interface SavingContributionPreviewResult {
  preview: SavingPreviewResult
  previewToken: string
}

export interface SavingContributionContext {
  currentMonth: string
  eligibleGoals: EligibleGoal[]
  eligibleGoalsUsd: EligibleGoal[]
  eligibleInvestmentGoals?: EligibleGoal[]
  eligibleInvestmentGoalsUsd?: EligibleGoal[]
  monthlyTargetArs?: Money | null
  monthlyTargetUsd?: Money | null
  monthlyInvestmentTargetArs?: Money | null
  monthlyInvestmentTargetUsd?: Money | null
}

export type SavingContributionContextState =
  | { profile: 'missing' }
  | { profile: 'present'; context: SavingContributionContext }

export interface BuildSavingPreviewInput {
  kind?: ContributionKind
  draft: SavingDraftInput | SavingDraft
  eligibleGoals: EligibleGoal[]
  workspaceSource?: GoalsWorkspaceSource
  currentMonth?: string
}

export type BuildContributionPreviewInput = BuildSavingPreviewInput

export interface UsdPurchaseInput {
  usdAmount?: string | null
  arsSpent?: string | null
  effectiveRate?: string | null
}

export interface UsdPurchaseDerivation {
  usdAmount?: string
  arsSpent?: string
  effectiveRate?: string
}

export function deriveUsdPurchase(input: UsdPurchaseInput): UsdPurchaseDerivation {
  const parseVal = (val?: string | null): BigNumber | null => {
    if (val === undefined || val === null) return null
    const clean = String(val).replace(/[$]|US[$]|USD|ARS|\s/gi, '').trim()
    if (!clean) return null
    let normalized = clean
    if (clean.includes(',') && clean.includes('.')) {
      normalized = clean.replace(/\./g, '').replace(',', '.')
    } else if (clean.includes(',')) {
      normalized = clean.replace(',', '.')
    } else if (clean.includes('.')) {
      const parts = clean.split('.')
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        normalized = clean.replace(/\./g, '')
      }
    }
    try {
      const bn = new BigNumber(normalized)
      if (!bn.isFinite() || bn.isNaN()) return null
      return bn
    } catch {
      return null
    }
  }

  const bnUsd = parseVal(input.usdAmount)
  const bnArs = parseVal(input.arsSpent)
  const bnRate = parseVal(input.effectiveRate)

  const isUsdProvided = input.usdAmount !== undefined && input.usdAmount !== null && String(input.usdAmount).trim() !== ''
  const isArsProvided = input.arsSpent !== undefined && input.arsSpent !== null && String(input.arsSpent).trim() !== ''
  const isRateProvided = input.effectiveRate !== undefined && input.effectiveRate !== null && String(input.effectiveRate).trim() !== ''

  if (isUsdProvided && (!bnUsd || !bnUsd.isGreaterThan(0))) {
    throw new Error('USD purchase values must be positive')
  }
  if (isArsProvided && (!bnArs || !bnArs.isGreaterThan(0))) {
    throw new Error('USD purchase values must be positive')
  }
  if (isRateProvided && (!bnRate || !bnRate.isGreaterThan(0))) {
    throw new Error('USD purchase values must be positive')
  }

  const providedCount = (isUsdProvided ? 1 : 0) + (isArsProvided ? 1 : 0) + (isRateProvided ? 1 : 0)

  if (providedCount < 2) {
    throw new Error('USD purchase derivation requires at least two positive values')
  }

  if (providedCount === 2) {
    if (isUsdProvided && isArsProvided && bnUsd && bnArs) {
      const derivedRate = bnArs.dividedBy(bnUsd).toFixed(2, BigNumber.ROUND_HALF_UP)
      return { effectiveRate: derivedRate }
    }
    if (isUsdProvided && isRateProvided && bnUsd && bnRate) {
      const derivedArs = bnUsd.times(bnRate).toFixed(2, BigNumber.ROUND_HALF_UP)
      return { arsSpent: derivedArs }
    }
    if (isArsProvided && isRateProvided && bnArs && bnRate) {
      const derivedUsd = bnArs.dividedBy(bnRate).toFixed(2, BigNumber.ROUND_HALF_UP)
      return { usdAmount: derivedUsd }
    }
  }

  if (providedCount === 3 && bnUsd && bnArs && bnRate) {
    const expectedArs = bnUsd.times(bnRate)
    const expectedArsStr = expectedArs.toFixed(2, BigNumber.ROUND_HALF_UP)
    const actualArsStr = bnArs.toFixed(2, BigNumber.ROUND_HALF_UP)
    const diff = bnArs.minus(expectedArs).abs()

    if (diff.isGreaterThan(0.01) && expectedArsStr !== actualArsStr) {
      throw new Error('USD purchase values are incoherent')
    }

    return {
      usdAmount: bnUsd.toFixed(2, BigNumber.ROUND_HALF_UP),
      arsSpent: bnArs.toFixed(2, BigNumber.ROUND_HALF_UP),
      effectiveRate: bnRate.toFixed(2, BigNumber.ROUND_HALF_UP),
    }
  }

  throw new Error('USD purchase derivation requires at least two positive values')
}

export function parseSavingDraft(input: SavingDraftInput | SavingDraft): SavingDraft {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid saving draft input')
  }

  if (input.currency !== 'ARS' && input.currency !== 'USD') {
    throw new Error(`Invalid currency: ${input.currency}`)
  }

  let amountMoney: Money
  if (typeof input.amount === 'string') {
    const parsed = parseMoneyInput(input.amount, input.currency)
    if (!parsed || !isPositiveMoney(parsed)) {
      throw new Error('Contribution amount must be positive')
    }
    amountMoney = parsed
  } else if (
    typeof input.amount === 'object' &&
    input.amount !== null &&
    'amount' in input.amount &&
    'currency' in input.amount
  ) {
    if (input.amount.currency !== input.currency || !isPositiveMoney(input.amount)) {
      throw new Error('Contribution amount must be positive')
    }
    amountMoney = input.amount
  } else {
    throw new Error('Contribution amount must be positive')
  }

  const location = input.location ? input.location.trim() || undefined : undefined

  if (input.currency === 'USD') {
    let arsSpentMoney: Money | undefined
    let effectiveRateStr: string | undefined

    if (input.arsSpent && input.effectiveRate) {
      const arsSpentStr = typeof input.arsSpent === 'string' ? input.arsSpent : input.arsSpent.amount
      const derivation = deriveUsdPurchase({
        usdAmount: amountMoney.amount,
        arsSpent: arsSpentStr,
        effectiveRate: input.effectiveRate,
      })
      arsSpentMoney = createMoney(derivation.arsSpent ?? arsSpentStr, 'ARS')
      effectiveRateStr = derivation.effectiveRate ?? input.effectiveRate
    } else if (input.arsSpent) {
      const arsSpentStr = typeof input.arsSpent === 'string' ? input.arsSpent : input.arsSpent.amount
      const derivation = deriveUsdPurchase({
        usdAmount: amountMoney.amount,
        arsSpent: arsSpentStr,
      })
      arsSpentMoney = createMoney(arsSpentStr, 'ARS')
      effectiveRateStr = derivation.effectiveRate!
    } else if (input.effectiveRate) {
      const derivation = deriveUsdPurchase({
        usdAmount: amountMoney.amount,
        effectiveRate: input.effectiveRate,
      })
      arsSpentMoney = createMoney(derivation.arsSpent!, 'ARS')
      effectiveRateStr = input.effectiveRate
    }

    return {
      ...(input.kind ? { kind: input.kind } : {}),
      currency: 'USD',
      amount: amountMoney,
      ...(location ? { location } : {}),
      arsSpent: arsSpentMoney,
      effectiveRate: effectiveRateStr,
    }
  }

  return {
    ...(input.kind ? { kind: input.kind } : {}),
    currency: 'ARS',
    amount: amountMoney,
    ...(location ? { location } : {}),
  }
}

export function buildSavingPreview(input: BuildSavingPreviewInput): SavingPreviewResult {
  const draft = parseSavingDraft(input.draft)

  if (!input.eligibleGoals || input.eligibleGoals.length === 0) {
    throw new Error('No eligible goals')
  }

  let sumWeights = new BigNumber(0)
  const parsedWeights = input.eligibleGoals.map((g) => {
    try {
      const bn = new BigNumber(String(g.percentage).trim().replace(',', '.'))
      if (bn.isFinite() && !bn.isNaN() && bn.isGreaterThanOrEqualTo(0)) {
        sumWeights = sumWeights.plus(bn)
        return bn
      }
      return new BigNumber(0)
    } catch {
      return new BigNumber(0)
    }
  })

  const weights = sumWeights.isZero()
    ? input.eligibleGoals.map(() => new BigNumber(1))
    : parsedWeights
  const activeSumWeights = sumWeights.isZero()
    ? new BigNumber(input.eligibleGoals.length)
    : sumWeights

  const totalPctCents = new BigNumber(10000)
  const items = input.eligibleGoals.map((g, index) => {
    const weight = weights[index]
    const exactPctCents = totalPctCents.times(weight).dividedBy(activeSumWeights)
    const basePctCents = exactPctCents.integerValue(BigNumber.ROUND_DOWN)
    const remainder = exactPctCents.minus(basePctCents)
    return {
      id: g.id,
      name: g.name,
      index,
      basePctCents,
      remainder,
    }
  })

  const sumBasePctCents = items.reduce((acc, item) => acc.plus(item.basePctCents), new BigNumber(0))
  const leftoverPctCents = totalPctCents.minus(sumBasePctCents).toNumber()

  const sortedIndices = items
    .map((item, idx) => ({ idx, remainder: item.remainder, index: item.index }))
    .sort((a, b) => {
      const cmp = b.remainder.comparedTo(a.remainder) ?? 0
      if (cmp !== 0) return cmp
      return a.index - b.index
    })

  const finalPctCentsMap = new Map<number, BigNumber>()
  items.forEach((item, idx) => finalPctCentsMap.set(idx, item.basePctCents))

  for (let i = 0; i < leftoverPctCents; i++) {
    const targetIdx = sortedIndices[i % sortedIndices.length].idx
    const current = finalPctCentsMap.get(targetIdx)!
    finalPctCentsMap.set(targetIdx, current.plus(1))
  }

  const normalizedTargets = items.map((item, idx) => {
    const finalPctCents = finalPctCentsMap.get(idx)!
    const percentage = finalPctCents.dividedBy(100).toFixed(2)
    return {
      id: item.id,
      name: item.name,
      percentage,
    }
  })

  const allocatedMoneyList = calculateAllocationAmounts(
    draft.amount,
    normalizedTargets.map((t) => ({ id: t.id, percentage: t.percentage })),
  )

  const allocations: SavingAllocationPreview[] = normalizedTargets.map((target) => {
    const allocated = allocatedMoneyList.find((a) => a.id === target.id)!
    return {
      goalId: target.id,
      goalName: target.name,
      percentage: target.percentage,
      amount: allocated.amount,
    }
  })

  if (input.workspaceSource && input.currentMonth) {
    const beforeWorkspace = buildGoalsWorkspace(input.workspaceSource, input.currentMonth)

    const kind = input.kind ?? 'saving'
    let proposedSource: GoalsWorkspaceSource

    if (kind === 'investment') {
      const existingInvestments = [...(input.workspaceSource.investmentPositions ?? [])]
      for (const alloc of allocations) {
        const existingIdx = existingInvestments.findIndex((p) => p.goalId === alloc.goalId)
        if (existingIdx >= 0) {
          const existing = existingInvestments[existingIdx]
          const newCurrentValue = new BigNumber(existing.currentValue)
            .plus(new BigNumber(alloc.amount.amount))
            .toFixed(2)
          existingInvestments[existingIdx] = {
            ...existing,
            currentValue: newCurrentValue,
          }
        } else {
          existingInvestments.push({
            id: `synthetic-${alloc.goalId}`,
            goalId: alloc.goalId,
            currentValue: alloc.amount.amount,
            currency: alloc.amount.currency,
          })
        }
      }
      proposedSource = {
        ...input.workspaceSource,
        investmentPositions: existingInvestments,
      }
    } else {
      const syntheticPositions = allocations.map((alloc) => ({
        id: `synthetic-${alloc.goalId}`,
        goalId: alloc.goalId,
        amount: alloc.amount.amount,
        currency: alloc.amount.currency,
        location: draft.location ?? null,
      }))
      proposedSource = {
        ...input.workspaceSource,
        savingsPositions: [
          ...(input.workspaceSource.savingsPositions ?? []),
          ...syntheticPositions,
        ],
      }
    }

    const afterWorkspace = buildGoalsWorkspace(proposedSource, input.currentMonth)

    const beforeGoals = beforeWorkspace.groups.flatMap((g) => g.goals)
    const afterGoals = afterWorkspace.groups.flatMap((g) => g.goals)

    for (const alloc of allocations) {
      const beforeGoal = beforeGoals.find((g) => g.id === alloc.goalId)
      const afterGoal = afterGoals.find((g) => g.id === alloc.goalId)

      if (beforeGoal) {
        alloc.progressBefore = beforeGoal.progressPercentage
        alloc.projectionBefore = beforeGoal.projection
      }
      if (afterGoal) {
        alloc.progressAfter = afterGoal.progressPercentage
        alloc.projectionAfter = afterGoal.projection
      }
    }
  }

  return {
    draft,
    allocations,
  }
}

export function buildContributionPreview(input: BuildContributionPreviewInput): SavingPreviewResult {
  return buildSavingPreview(input)
}

export interface SerializeContributionStateInput {
  kind?: ContributionKind
  draft: SavingDraftInput | SavingDraft
  eligibleGoals: EligibleGoal[]
  currentMonth?: string
}

export function serializeContributionState(input: SerializeContributionStateInput): string {
  const normalizedDraft = parseSavingDraft(input.draft)
  const normalized = {
    kind:
      input.kind ??
      normalizedDraft.kind ??
      (typeof input.draft === 'object' && input.draft && 'kind' in input.draft && input.draft.kind
        ? input.draft.kind
        : undefined) ??
      'saving',
    currentMonth: input.currentMonth ?? null,
    draft: {
      currency: normalizedDraft.currency,
      amount: normalizedDraft.amount.amount,
      location: normalizedDraft.location ?? null,
      arsSpent: normalizedDraft.arsSpent ? normalizedDraft.arsSpent.amount : null,
      effectiveRate: normalizedDraft.effectiveRate ?? null,
    },
    eligibleGoals: input.eligibleGoals
      .map((g) => ({
        id: g.id,
        name: g.name,
        percentage: new BigNumber(String(g.percentage).replace(',', '.')).toFixed(2),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
  return JSON.stringify(normalized)
}

export function serializeSavingContributionState(input: {
  draft: SavingDraftInput | SavingDraft
  eligibleGoals: EligibleGoal[]
  currentMonth?: string
}): string {
  return serializeContributionState({ ...input, kind: 'saving' })
}

export function deriveMonthlyContributionTargets(input: {
  monthlyCommitmentArs?: string | Money | null
  goals: Array<{
    id: string
    currency: CurrencyCode
    strategy: string
    percentage: string | number
  }>
  existingContributions?: Array<{
    amount: string | Money
    currency: string
    createdAt: Date | string
  }>
  currentMonth?: string
  kind?: ContributionKind
}): {
  monthlyTargetArs: Money | null
  monthlyTargetUsd: Money | null
} {
  const commitmentStr =
    typeof input.monthlyCommitmentArs === 'object' && input.monthlyCommitmentArs
      ? input.monthlyCommitmentArs.amount
      : input.monthlyCommitmentArs
  if (!commitmentStr) {
    return { monthlyTargetArs: null, monthlyTargetUsd: null }
  }

  const commitmentBn = new BigNumber(commitmentStr)
  if (!commitmentBn.isFinite() || commitmentBn.isLessThanOrEqualTo(0)) {
    return { monthlyTargetArs: null, monthlyTargetUsd: null }
  }

  let currentMonthContributedArs = new BigNumber(0)
  let currentMonthContributedUsd = new BigNumber(0)

  if (input.existingContributions && input.currentMonth) {
    for (const c of input.existingContributions) {
      const createdStr =
        c.createdAt instanceof Date
          ? c.createdAt.toISOString().slice(0, 7)
          : String(c.createdAt).slice(0, 7)
      if (createdStr === input.currentMonth) {
        const amtStr =
          typeof c.amount === 'object' && c.amount ? c.amount.amount : String(c.amount)
        const amtBn = new BigNumber(amtStr)
        if (amtBn.isFinite() && amtBn.isGreaterThan(0)) {
          if (c.currency === 'ARS') {
            currentMonthContributedArs = currentMonthContributedArs.plus(amtBn)
          } else if (c.currency === 'USD') {
            currentMonthContributedUsd = currentMonthContributedUsd.plus(amtBn)
          }
        }
      }
    }
  }

  const targetStrategy = (input.kind ?? 'saving') === 'saving' ? 'save' : 'invest'

  // ARS goals
  const arsGoals = input.goals.filter(
    (g) => g.currency === 'ARS' && g.strategy === targetStrategy,
  )
  let totalArsPercent = new BigNumber(0)
  for (const g of arsGoals) {
    const pct = new BigNumber(String(g.percentage).replace(',', '.'))
    if (pct.isFinite() && pct.isGreaterThan(0)) {
      totalArsPercent = totalArsPercent.plus(pct)
    }
  }

  let monthlyTargetArs: Money | null = null
  if (arsGoals.length > 0 && totalArsPercent.isGreaterThan(0)) {
    const targetArsAmount = commitmentBn
      .multipliedBy(totalArsPercent)
      .dividedBy(100)
    const remainingArs = BigNumber.max(
      0,
      targetArsAmount.minus(currentMonthContributedArs),
    ).toFixed(2, BigNumber.ROUND_HALF_UP)
    monthlyTargetArs = createMoney(remainingArs, 'ARS')
  }

  // USD goals
  const usdGoals = input.goals.filter(
    (g) => g.currency === 'USD' && g.strategy === targetStrategy,
  )
  let totalUsdAmount = new BigNumber(0)
  const planningRate = new BigNumber(PLANNING_ARS_PER_USD)

  for (const g of usdGoals) {
    const pct = new BigNumber(String(g.percentage).replace(',', '.'))
    if (pct.isFinite() && pct.isGreaterThan(0)) {
      const arsShare = commitmentBn.multipliedBy(pct).dividedBy(100)
      const usdShare = arsShare.dividedBy(planningRate)
      totalUsdAmount = totalUsdAmount.plus(usdShare)
    }
  }

  let monthlyTargetUsd: Money | null = null
  if (usdGoals.length > 0 && totalUsdAmount.isGreaterThan(0)) {
    const remainingUsd = BigNumber.max(
      0,
      totalUsdAmount.minus(currentMonthContributedUsd),
    ).toFixed(2, BigNumber.ROUND_HALF_UP)
    monthlyTargetUsd = createMoney(remainingUsd, 'USD')
  }

  return { monthlyTargetArs, monthlyTargetUsd }
}

export function deriveMonthlySavingTargets(
  input: Parameters<typeof deriveMonthlyContributionTargets>[0],
) {
  return deriveMonthlyContributionTargets({ ...input, kind: input.kind ?? 'saving' })
}

export interface PreviousMonthShortfall {
  kind: ContributionKind
  currency: CurrencyCode
  amount: Money
}

export function derivePreviousMonthShortfalls(input: {
  closedMonth: string
  plannedMonthlyContribution: string | null
  goals: Array<{ id: string; strategy: string; currency: CurrencyCode }>
  allocations: Array<{ goalId: string; percentage: string }>
  savingContributions: Array<{ amount: string; currency: string; createdAt: Date | string }>
  investmentContributions: Array<{ amount: string; currency: string; createdAt: Date | string }>
}): PreviousMonthShortfall[] {
  if (!input.plannedMonthlyContribution || !input.allocations || input.allocations.length === 0) {
    return []
  }

  const commitmentBn = new BigNumber(input.plannedMonthlyContribution)
  if (!commitmentBn.isFinite() || commitmentBn.isLessThanOrEqualTo(0)) {
    return []
  }

  const categories: Array<{
    kind: ContributionKind
    currency: CurrencyCode
    strategy: 'save' | 'invest'
  }> = [
    { kind: 'saving', currency: 'ARS', strategy: 'save' },
    { kind: 'saving', currency: 'USD', strategy: 'save' },
    { kind: 'investment', currency: 'ARS', strategy: 'invest' },
    { kind: 'investment', currency: 'USD', strategy: 'invest' },
  ]

  const allocationByGoalId = new Map<string, BigNumber>()
  for (const a of input.allocations) {
    const pct = new BigNumber(String(a.percentage).replace(',', '.'))
    if (pct.isFinite() && pct.isGreaterThan(0)) {
      allocationByGoalId.set(a.goalId, pct)
    }
  }

  const planningRate = new BigNumber(PLANNING_ARS_PER_USD)
  const shortfalls: PreviousMonthShortfall[] = []

  for (const cat of categories) {
    const matchingGoals = input.goals.filter(
      (g) => g.currency === cat.currency && g.strategy === cat.strategy,
    )

    if (matchingGoals.length === 0) {
      continue
    }

    let expectedAmount = new BigNumber(0)
    for (const g of matchingGoals) {
      const pct = allocationByGoalId.get(g.id)
      if (pct && pct.isGreaterThan(0)) {
        const arsShare = commitmentBn.multipliedBy(pct).dividedBy(100)
        if (cat.currency === 'USD') {
          expectedAmount = expectedAmount.plus(arsShare.dividedBy(planningRate))
        } else {
          expectedAmount = expectedAmount.plus(arsShare)
        }
      }
    }

    if (expectedAmount.isLessThanOrEqualTo(0)) {
      continue
    }

    const contribList =
      cat.kind === 'saving' ? input.savingContributions : input.investmentContributions

    let actualAmount = new BigNumber(0)
    for (const c of contribList) {
      if (c.currency !== cat.currency) continue
      let createdIso: string | null = null
      try {
        createdIso =
          c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : new Date(c.createdAt).toISOString()
      } catch {
        createdIso = null
      }

      if (!createdIso || createdIso.slice(0, 7) !== input.closedMonth) {
        continue
      }

      try {
        const amt = new BigNumber(c.amount)
        if (amt.isFinite() && amt.isGreaterThan(0)) {
          actualAmount = actualAmount.plus(amt)
        }
      } catch {
        // ignore invalid contribution amount
      }
    }

    if (actualAmount.isLessThan(expectedAmount)) {
      const diffBn = expectedAmount.minus(actualAmount)
      const formattedDiff = diffBn.toFixed(2, BigNumber.ROUND_HALF_UP)
      if (new BigNumber(formattedDiff).isGreaterThan(0)) {
        shortfalls.push({
          kind: cat.kind,
          currency: cat.currency,
          amount: createMoney(formattedDiff, cat.currency),
        })
      }
    }
  }

  return shortfalls
}
