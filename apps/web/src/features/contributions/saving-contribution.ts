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
  type ContributionKind,
  type GoalProjection,
  type GoalsWorkspaceSource,
  buildGoalsWorkspace,
} from '../goals/goals'
import {
  serializeGoalCoreCollections,
  serializeGoalFinancialSources,
  serializeGoalPlanCollections,
  serializeGoalProfile,
} from '../goals/goal-proposal-serialization'

import { PLANNING_ARS_PER_USD } from '../financial/financial'

export type { ContributionKind } from '../goals/goals'

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

export interface ContributionEligibilityState {
  eligibleGoals: EligibleGoal[]
  eligibleGoalsUsd: EligibleGoal[]
  eligibleInvestmentGoals: EligibleGoal[]
  eligibleInvestmentGoalsUsd: EligibleGoal[]
}

export function getEligibleContributionGoals(
  state: ContributionEligibilityState,
  kind: ContributionKind,
  currency: CurrencyCode,
): EligibleGoal[] {
  if (kind === 'investment') {
    return currency === 'USD' ? state.eligibleInvestmentGoalsUsd : state.eligibleInvestmentGoals
  }
  return currency === 'USD' ? state.eligibleGoalsUsd : state.eligibleGoals
}

function getContributionGoalError(kind: ContributionKind, currency: CurrencyCode): string {
  const action = kind === 'investment' ? 'la inversión' : 'el ahorro'
  return `No hay objetivos activos para distribuir ${action} en ${currency}.`
}

export function requireEligibleContributionGoals(
  state: ContributionEligibilityState,
  kind: ContributionKind,
  currency: CurrencyCode,
): EligibleGoal[] {
  const goals = getEligibleContributionGoals(state, kind, currency)
  if (!goals.length) throw new Error(getContributionGoalError(kind, currency))
  return goals
}

export interface SavingDraftInput {
  kind?: ContributionKind
  currency: CurrencyCode
  amount: string
  place?: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string }
  arsSpent?: string | null
  effectiveRate?: string | null
}

export interface SavingDraft {
  kind?: ContributionKind
  currency: CurrencyCode
  amount: Money
  place?: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string }
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
  places: Array<{ id: string; name: string }>
  investmentState: InvestmentContributionDataState
}

export type InvestmentContributionCurrencyState =
  | { status: 'ready' }
  | { status: 'incomplete'; reason: 'missing_investment_position' }

export interface InvestmentContributionDataState {
  ars: InvestmentContributionCurrencyState
  usd: InvestmentContributionCurrencyState
}

function getInvestmentContributionCurrencyState(
  source: Pick<GoalsWorkspaceSource, 'goals' | 'investmentPositions'>,
  currency: 'ARS' | 'USD',
): InvestmentContributionCurrencyState {
  const positionGoalIds = new Set(
    source.investmentPositions
      .filter((position) => position.currency === currency)
      .map((position) => position.goalId),
  )
  const hasMissingPosition = source.goals.some(
    (goal) =>
      goal.status === 'active' &&
      goal.strategy === 'invest' &&
      goal.currency === currency &&
      !positionGoalIds.has(goal.id),
  )
  return hasMissingPosition
    ? { status: 'incomplete', reason: 'missing_investment_position' }
    : { status: 'ready' }
}

export function getInvestmentContributionDataState(
  source: Pick<GoalsWorkspaceSource, 'goals' | 'investmentPositions'>,
): InvestmentContributionDataState {
  return {
    ars: getInvestmentContributionCurrencyState(source, 'ARS'),
    usd: getInvestmentContributionCurrencyState(source, 'USD'),
  }
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

type ParsedUsdValue = { value: BigNumber | null; provided: boolean }

function normalizeDotSeparatedNumber(value: string): string {
  const parts = value.split('.')
  return parts.length > 2 || (parts.length === 2 && parts[1].length === 3)
    ? value.replace(/\./g, '')
    : value
}

function normalizeNumericText(value?: string | null): string | null {
  if (value === undefined || value === null) return null
  const clean = String(value).replace(/[$]|US[$]|USD|ARS|\s/gi, '').trim()
  if (!clean) return null
  return normalizeNumericSeparators(clean)
}

function hasCommaAndDot(value: string): boolean {
  return value.includes(',') && value.includes('.')
}

function normalizeNumericSeparators(value: string): string {
  if (hasCommaAndDot(value)) return value.replace(/\./g, '').replace(',', '.')
  if (value.includes(',')) return value.replace(',', '.')
  return normalizeDotSeparatedNumber(value)
}

function isFiniteNumber(value: BigNumber): boolean {
  return value.isFinite() && !value.isNaN()
}

function parseNumericValue(value?: string | null): BigNumber | null {
  const normalized = normalizeNumericText(value)
  if (!normalized) return null
  try {
    const parsed = new BigNumber(normalized)
    return isFiniteNumber(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isValueProvided(value?: string | null): boolean {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function parseUsdPurchaseValues(input: UsdPurchaseInput) {
  const values = [input.usdAmount, input.arsSpent, input.effectiveRate]
  const parsed = values.map((value): ParsedUsdValue => ({
    value: parseNumericValue(value),
    provided: isValueProvided(value),
  }))
  return {
    usd: parsed[0],
    ars: parsed[1],
    rate: parsed[2],
    providedCount: parsed.filter(({ provided }) => provided).length,
  }
}

function validateUsdPurchaseValues(values: ReturnType<typeof parseUsdPurchaseValues>): void {
  for (const item of [values.usd, values.ars, values.rate]) {
    if (item.provided && !item.value?.isGreaterThan(0)) {
      throw new Error('USD purchase values must be positive')
    }
  }
}

function hasUsdPurchasePair(first: ParsedUsdValue, second: ParsedUsdValue): boolean {
  return first.provided && second.provided && !!first.value && !!second.value
}

function deriveUsdRate(usd: BigNumber, ars: BigNumber): UsdPurchaseDerivation {
  return { effectiveRate: ars.dividedBy(usd).toFixed(2, BigNumber.ROUND_HALF_UP) }
}

function deriveArsSpent(usd: BigNumber, rate: BigNumber): UsdPurchaseDerivation {
  return { arsSpent: usd.times(rate).toFixed(2, BigNumber.ROUND_HALF_UP) }
}

function deriveUsdAmount(ars: BigNumber, rate: BigNumber): UsdPurchaseDerivation {
  return { usdAmount: ars.dividedBy(rate).toFixed(2, BigNumber.ROUND_HALF_UP) }
}

function deriveTwoUsdPurchaseValues(values: ReturnType<typeof parseUsdPurchaseValues>): UsdPurchaseDerivation | null {
  const { usd, ars, rate } = values
  if (hasUsdPurchasePair(usd, ars)) return deriveUsdRate(usd.value!, ars.value!)
  if (hasUsdPurchasePair(usd, rate)) return deriveArsSpent(usd.value!, rate.value!)
  if (hasUsdPurchasePair(ars, rate)) return deriveUsdAmount(ars.value!, rate.value!)
  return null
}

function hasIncoherentUsdPurchase(ars: BigNumber, expectedArs: BigNumber): boolean {
  const roundedExpected = expectedArs.toFixed(2, BigNumber.ROUND_HALF_UP)
  const roundedActual = ars.toFixed(2, BigNumber.ROUND_HALF_UP)
  return roundedExpected !== roundedActual
}

function normalizeCompleteUsdPurchase(values: ReturnType<typeof parseUsdPurchaseValues>): UsdPurchaseDerivation {
  const { usd, ars, rate } = values
  const [usdValue, arsValue, rateValue] = requireCompleteUsdPurchaseValues(usd.value, ars.value, rate.value)
  const expectedArs = usdValue.times(rateValue)
  if (hasIncoherentUsdPurchase(arsValue, expectedArs)) {
    throw new Error('USD purchase values are incoherent')
  }
  return {
    usdAmount: usdValue.toFixed(2, BigNumber.ROUND_HALF_UP),
    arsSpent: arsValue.toFixed(2, BigNumber.ROUND_HALF_UP),
    effectiveRate: rateValue.toFixed(2, BigNumber.ROUND_HALF_UP),
  }
}

function requireCompleteUsdPurchaseValues(
  usd: BigNumber | null,
  ars: BigNumber | null,
  rate: BigNumber | null,
): [BigNumber, BigNumber, BigNumber] {
  if (!usd) throw new Error('USD purchase derivation requires at least two positive values')
  if (!ars) throw new Error('USD purchase derivation requires at least two positive values')
  if (!rate) throw new Error('USD purchase derivation requires at least two positive values')
  return [usd, ars, rate]
}

export function deriveUsdPurchase(input: UsdPurchaseInput): UsdPurchaseDerivation {
  const values = parseUsdPurchaseValues(input)
  validateUsdPurchaseValues(values)
  if (values.providedCount < 2) {
    throw new Error('USD purchase derivation requires at least two positive values')
  }
  if (values.providedCount === 2) {
    return deriveTwoUsdPurchaseValues(values) ?? {
      ...normalizeCompleteUsdPurchase(values),
    }
  }
  return normalizeCompleteUsdPurchase(values)
}

function parseDraftAmount(input: SavingDraftInput | SavingDraft): Money {
  const parsed = parseStringDraftAmount(input) ?? parseMoneyDraftAmount(input)
  if (parsed) return parsed
  throw new Error('Contribution amount must be positive')
}

function parseStringDraftAmount(input: SavingDraftInput | SavingDraft): Money | null {
  if (typeof input.amount !== 'string') return null
  const parsed = parseMoneyInput(input.amount, input.currency)
  return parsed && isPositiveMoney(parsed) ? parsed : null
}

function parseMoneyDraftAmount(input: SavingDraftInput | SavingDraft): Money | null {
  if (!isMoneyObject(input.amount)) return null
  if (input.amount.currency !== input.currency) return null
  return isPositiveMoney(input.amount) ? input.amount : null
}

function isMoneyObject(value: unknown): value is Money {
  if (typeof value !== 'object' || value === null) return false
  return 'amount' in value && 'currency' in value
}

function draftArsSpent(input: SavingDraftInput | SavingDraft): string {
  return typeof input.arsSpent === 'string' ? input.arsSpent : input.arsSpent!.amount
}

function deriveCompleteUsdDraft(input: SavingDraftInput | SavingDraft, amount: Money) {
  const arsSpent = draftArsSpent(input)
  const derivation = deriveUsdPurchase({ usdAmount: amount.amount, arsSpent, effectiveRate: input.effectiveRate })
  return { arsSpent: createMoney(derivation.arsSpent ?? arsSpent, 'ARS'), effectiveRate: derivation.effectiveRate ?? input.effectiveRate! }
}

function deriveArsSpentUsdDraft(input: SavingDraftInput | SavingDraft, amount: Money) {
  const arsSpent = draftArsSpent(input)
  const derivation = deriveUsdPurchase({ usdAmount: amount.amount, arsSpent })
  return { arsSpent: createMoney(arsSpent, 'ARS'), effectiveRate: derivation.effectiveRate! }
}

function deriveRateUsdDraft(input: SavingDraftInput | SavingDraft, amount: Money) {
  const derivation = deriveUsdPurchase({ usdAmount: amount.amount, effectiveRate: input.effectiveRate })
  return { arsSpent: createMoney(derivation.arsSpent!, 'ARS'), effectiveRate: input.effectiveRate! }
}

function deriveUsdDraftValues(input: SavingDraftInput | SavingDraft, amount: Money) {
  if (hasCompleteUsdDraft(input)) {
    return deriveCompleteUsdDraft(input, amount)
  }
  if (input.arsSpent) {
    return deriveArsSpentUsdDraft(input, amount)
  }
  if (input.effectiveRate) {
    return deriveRateUsdDraft(input, amount)
  }
  return { arsSpent: undefined, effectiveRate: undefined }
}

function hasCompleteUsdDraft(input: SavingDraftInput | SavingDraft): boolean {
  return !!input.arsSpent && !!input.effectiveRate
}

function validateSavingDraftInput(input: SavingDraftInput | SavingDraft): void {
  if (!input || typeof input !== 'object') throw new Error('Invalid saving draft input')
  validateDraftCurrency(input.currency)
}

function validateDraftCurrency(currency: string): void {
  if (currency !== 'ARS' && currency !== 'USD') throw new Error(`Invalid currency: ${currency}`)
}

export function parseSavingDraft(input: SavingDraftInput | SavingDraft): SavingDraft {
  validateSavingDraftInput(input)
  const amount = parseDraftAmount(input)
  if (input.currency === 'USD') {
    const usdValues = deriveUsdDraftValues(input, amount)
    return { ...(input.kind ? { kind: input.kind } : {}), currency: 'USD', amount, place: input.place, ...usdValues }
  }
  return { ...(input.kind ? { kind: input.kind } : {}), currency: 'ARS', amount, place: input.place }
}

type PercentageItem = {
  id: string
  name: string
  index: number
  basePctCents: BigNumber
  remainder: BigNumber
}

function parseGoalWeight(percentage: string | number): BigNumber {
  try {
    const parsed = new BigNumber(String(percentage).trim().replace(',', '.'))
    return isNonNegativeFiniteNumber(parsed) ? parsed : new BigNumber(0)
  } catch {
    return new BigNumber(0)
  }
}

function isNonNegativeFiniteNumber(value: BigNumber): boolean {
  return isFiniteNumber(value) && value.isGreaterThanOrEqualTo(0)
}

function getGoalWeights(goals: EligibleGoal[]) {
  const weights = goals.map(({ percentage }) => parseGoalWeight(percentage))
  const sum = weights.reduce((total, weight) => total.plus(weight), new BigNumber(0))
  return sum.isZero()
    ? { weights: goals.map(() => new BigNumber(1)), sum: new BigNumber(goals.length) }
    : { weights, sum }
}

function buildPercentageItems(goals: EligibleGoal[], weights: BigNumber[], sum: BigNumber): PercentageItem[] {
  return goals.map((goal, index) => {
    const exactPctCents = new BigNumber(10000).times(weights[index]).dividedBy(sum)
    const basePctCents = exactPctCents.integerValue(BigNumber.ROUND_DOWN)
    return { id: goal.id, name: goal.name, index, basePctCents, remainder: exactPctCents.minus(basePctCents) }
  })
}

function distributePercentageRemainder(items: PercentageItem[]): Map<number, BigNumber> {
  const totalBase = items.reduce((sum, item) => sum.plus(item.basePctCents), new BigNumber(0))
  const leftover = new BigNumber(10000).minus(totalBase).toNumber()
  const sorted = items
    .map((item, idx) => ({ idx, remainder: item.remainder, index: item.index }))
    .sort((a, b) => (b.remainder.comparedTo(a.remainder) || 0) || a.index - b.index)
  const result = new Map(items.map((item, idx) => [idx, item.basePctCents]))
  for (let i = 0; i < leftover; i++) {
    const targetIdx = sorted[i % sorted.length].idx
    result.set(targetIdx, result.get(targetIdx)!.plus(1))
  }
  return result
}

function normalizeEligibleGoalTargets(goals: EligibleGoal[]) {
  const { weights, sum } = getGoalWeights(goals)
  const items = buildPercentageItems(goals, weights, sum)
  const finalPercentages = distributePercentageRemainder(items)
  return items.map((item, index) => ({
    id: item.id,
    name: item.name,
    percentage: finalPercentages.get(index)!.dividedBy(100).toFixed(2),
  }))
}

function buildPreviewAllocations(draft: SavingDraft, goals: EligibleGoal[]): SavingAllocationPreview[] {
  const targets = normalizeEligibleGoalTargets(goals)
  const amounts = calculateAllocationAmounts(
    draft.amount,
    targets.map(({ id, percentage }) => ({ id, percentage })),
  )
  return targets.map((target) => {
    const allocated = amounts.find(({ id }) => id === target.id)!
    return {
      goalId: target.id,
      goalName: target.name,
      percentage: target.percentage,
      amount: allocated.amount,
    }
  })
}

function addInvestmentPreviewPositions(source: GoalsWorkspaceSource, allocations: SavingAllocationPreview[]) {
  const positions = [...(source.investmentPositions ?? [])]
  for (const allocation of allocations) {
    const index = positions.findIndex((position) => position.goalId === allocation.goalId)
    if (index < 0) continue
    const position = positions[index]
    positions[index] = {
      ...position,
      currentValue: new BigNumber(position.currentValue).plus(allocation.amount.amount).toFixed(2),
    }
  }
  return { ...source, investmentPositions: positions }
}

function addSavingPreviewPositions(source: GoalsWorkspaceSource, allocations: SavingAllocationPreview[]) {
  const positions = allocations.map((allocation) => ({
    id: `synthetic-${allocation.goalId}`,
    goalId: allocation.goalId,
    amount: allocation.amount.amount,
    currency: allocation.amount.currency,
  }))
  return { ...source, savingsPositions: [...(source.savingsPositions ?? []), ...positions] }
}

function buildPreviewWorkspaceSource(
  source: GoalsWorkspaceSource,
  allocations: SavingAllocationPreview[],
  kind: ContributionKind,
) {
  return kind === 'investment'
    ? addInvestmentPreviewPositions(source, allocations)
    : addSavingPreviewPositions(source, allocations)
}

function addWorkspaceProjectionsIfAvailable(input: BuildSavingPreviewInput, allocations: SavingAllocationPreview[]): void {
  if (input.workspaceSource && input.currentMonth) {
    addWorkspaceProjections(allocations, input.workspaceSource, input.currentMonth, input.kind ?? 'saving')
  }
}

function addWorkspaceProjections(
  allocations: SavingAllocationPreview[],
  source: GoalsWorkspaceSource,
  currentMonth: string,
  kind: ContributionKind,
): void {
  const before = buildGoalsWorkspace(source, currentMonth)
  const after = buildGoalsWorkspace(buildPreviewWorkspaceSource(source, allocations, kind), currentMonth)
  const beforeGoals = before.groups.flatMap((group) => group.goals)
  const afterGoals = after.groups.flatMap((group) => group.goals)
  for (const allocation of allocations) {
    const beforeGoal = beforeGoals.find((goal) => goal.id === allocation.goalId)
    const afterGoal = afterGoals.find((goal) => goal.id === allocation.goalId)
    if (beforeGoal) {
      allocation.progressBefore = beforeGoal.progressPercentage
      allocation.projectionBefore = beforeGoal.projection
    }
    if (afterGoal) {
      allocation.progressAfter = afterGoal.progressPercentage
      allocation.projectionAfter = afterGoal.projection
    }
  }
}

export function buildSavingPreview(input: BuildSavingPreviewInput): SavingPreviewResult {
  validateEligibleGoals(input.eligibleGoals)
  const draft = parseSavingDraft(input.draft)
  const allocations = buildPreviewAllocations(draft, input.eligibleGoals)
  addWorkspaceProjectionsIfAvailable(input, allocations)
  return { draft, allocations }
}

function validateEligibleGoals(goals: EligibleGoal[] | undefined): asserts goals is EligibleGoal[] {
  if (!goals?.length) throw new Error('No eligible goals')
}

export interface SerializeContributionStateInput {
  kind?: ContributionKind
  draft: SavingDraftInput | SavingDraft
  eligibleGoals: EligibleGoal[]
  currentMonth?: string
  workspaceSource?: GoalsWorkspaceSource
  monthlyTargetArs?: Money | null
  monthlyTargetUsd?: Money | null
  monthlyInvestmentTargetArs?: Money | null
  monthlyInvestmentTargetUsd?: Money | null
}

function getSerializedKind(input: SerializeContributionStateInput, draft: SavingDraft): ContributionKind {
  if (input.kind) return input.kind
  if (draft.kind) return draft.kind
  return getInputDraftKind(input.draft) ?? 'saving'
}

function getInputDraftKind(draft: SerializeContributionStateInput['draft']): ContributionKind | undefined {
  if (typeof draft !== 'object' || !('kind' in draft)) return undefined
  return draft.kind
}

function serializeEligibleGoals(goals: EligibleGoal[]) {
  return goals
    .map((goal) => ({
      id: goal.id,
      name: goal.name,
      percentage: new BigNumber(String(goal.percentage).replace(',', '.')).toFixed(2),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function serializeWorkspaceSource(source: GoalsWorkspaceSource) {
  return {
    profile: serializeGoalProfile(source.profile, true),
    ...serializeGoalCoreCollections(source),
    ...serializeGoalPlanCollections(source),
    ...serializeGoalFinancialSources(source),
    hasFinancialPlan: source.incomes !== undefined || source.expenses !== undefined,
  }
}

function serializeMoney(value: Money | null | undefined) {
  return value ? { amount: value.amount, currency: value.currency } : null
}

export function serializeContributionState(input: SerializeContributionStateInput): string {
  const normalizedDraft = parseSavingDraft(input.draft)
  const normalized = {
    kind: getSerializedKind(input, normalizedDraft),
    currentMonth: input.currentMonth ?? null,
    draft: {
      currency: normalizedDraft.currency,
      amount: normalizedDraft.amount.amount,
      arsSpent: normalizedDraft.arsSpent ? normalizedDraft.arsSpent.amount : null,
      effectiveRate: normalizedDraft.effectiveRate ?? null,
    },
    eligibleGoals: serializeEligibleGoals(input.eligibleGoals),
    workspaceSource: input.workspaceSource ? serializeWorkspaceSource(input.workspaceSource) : null,
    monthlyTargets: {
      savingArs: serializeMoney(input.monthlyTargetArs),
      savingUsd: serializeMoney(input.monthlyTargetUsd),
      investmentArs: serializeMoney(input.monthlyInvestmentTargetArs),
      investmentUsd: serializeMoney(input.monthlyInvestmentTargetUsd),
    },
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

type MonthlyTargetInput = {
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
}

function getCommitmentAmount(input: MonthlyTargetInput): string | null | undefined {
  return typeof input.monthlyCommitmentArs === 'object' && input.monthlyCommitmentArs
    ? input.monthlyCommitmentArs.amount
    : input.monthlyCommitmentArs
}

function getTargetContributionAmount(
  contribution: NonNullable<MonthlyTargetInput['existingContributions']>[number],
): BigNumber | null {
  const amount = getTargetContributionText(contribution)
  const parsed = new BigNumber(amount)
  return isPositiveFiniteNumber(parsed) ? parsed : null
}

function getTargetContributionText(
  contribution: NonNullable<MonthlyTargetInput['existingContributions']>[number],
): string {
  return typeof contribution.amount === 'object' && contribution.amount
    ? contribution.amount.amount
    : String(contribution.amount)
}

function isPositiveFiniteNumber(value: BigNumber): boolean {
  return value.isFinite() && value.isGreaterThan(0)
}

function addCurrentMonthContribution(
  totals: { ars: BigNumber; usd: BigNumber },
  contribution: NonNullable<MonthlyTargetInput['existingContributions']>[number],
  currentMonth: string,
): void {
  const month = getTargetContributionMonth(contribution.createdAt)
  if (month !== currentMonth) return
  const amount = getTargetContributionAmount(contribution)
  if (!amount) return
  const key = getContributionTotalKey(contribution.currency)
  if (key) totals[key] = totals[key].plus(amount)
}

function getTargetContributionMonth(createdAt: Date | string): string | null {
  return getContributionMonth(createdAt)
}

function getContributionTotalKey(currency: string): 'ars' | 'usd' | null {
  if (currency === 'ARS') return 'ars'
  if (currency === 'USD') return 'usd'
  return null
}

function sumCurrentMonthContributions(input: MonthlyTargetInput): { ars: BigNumber; usd: BigNumber } {
  const totals = { ars: new BigNumber(0), usd: new BigNumber(0) }
  if (!input.existingContributions || !input.currentMonth) return totals
  for (const contribution of input.existingContributions) {
    addCurrentMonthContribution(totals, contribution, input.currentMonth)
  }
  return totals
}

function selectTargetGoals(input: MonthlyTargetInput, currency: CurrencyCode) {
  const strategy = (input.kind ?? 'saving') === 'saving' ? 'save' : 'invest'
  return input.goals.filter((goal) => goal.currency === currency && goal.strategy === strategy)
}

function sumGoalPercentages(goals: MonthlyTargetInput['goals']): BigNumber {
  return goals.reduce((total, goal) => {
    const percentage = new BigNumber(String(goal.percentage).replace(',', '.'))
    return percentage.isFinite() && percentage.isGreaterThan(0) ? total.plus(percentage) : total
  }, new BigNumber(0))
}

function deriveArsTarget(commitment: BigNumber, goals: MonthlyTargetInput['goals'], contributed: BigNumber): Money | null {
  const totalPercentage = sumGoalPercentages(goals)
  if (!goals.length || !totalPercentage.isGreaterThan(0)) return null
  const target = commitment.multipliedBy(totalPercentage).dividedBy(100)
  const remaining = BigNumber.max(0, target.minus(contributed)).toFixed(2, BigNumber.ROUND_HALF_UP)
  return createMoney(remaining, 'ARS')
}

function deriveUsdTarget(commitment: BigNumber, goals: MonthlyTargetInput['goals'], contributed: BigNumber): Money | null {
  const planningRate = new BigNumber(PLANNING_ARS_PER_USD)
  const total = goals.reduce((amount, goal) => {
    const percentage = new BigNumber(String(goal.percentage).replace(',', '.'))
    if (!percentage.isFinite() || !percentage.isGreaterThan(0)) return amount
    return amount.plus(commitment.multipliedBy(percentage).dividedBy(100).dividedBy(planningRate))
  }, new BigNumber(0))
  if (!goals.length || !total.isGreaterThan(0)) return null
  const remaining = BigNumber.max(0, total.minus(contributed)).toFixed(2, BigNumber.ROUND_HALF_UP)
  return createMoney(remaining, 'USD')
}

export function deriveMonthlyContributionTargets(input: MonthlyTargetInput): {
  monthlyTargetArs: Money | null
  monthlyTargetUsd: Money | null
} {
  const commitmentStr = getCommitmentAmount(input)
  if (!commitmentStr) {
    return { monthlyTargetArs: null, monthlyTargetUsd: null }
  }
  const commitmentBn = new BigNumber(commitmentStr)
  if (!commitmentBn.isFinite() || commitmentBn.isLessThanOrEqualTo(0)) {
    return { monthlyTargetArs: null, monthlyTargetUsd: null }
  }
  const contributed = sumCurrentMonthContributions(input)
  return {
    monthlyTargetArs: deriveArsTarget(commitmentBn, selectTargetGoals(input, 'ARS'), contributed.ars),
    monthlyTargetUsd: deriveUsdTarget(commitmentBn, selectTargetGoals(input, 'USD'), contributed.usd),
  }
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

type ShortfallInput = {
  closedMonth: string
  plannedMonthlyContribution: string | null
  goals: Array<{ id: string; strategy: string; currency: CurrencyCode }>
  allocations: Array<{ goalId: string; percentage: string }>
  savingContributions: Array<{ amount: string; currency: string; createdAt: Date | string }>
  investmentContributions: Array<{ amount: string; currency: string; createdAt: Date | string }>
}

const SHORTFALL_CATEGORIES: Array<{
  kind: ContributionKind
  currency: CurrencyCode
  strategy: 'save' | 'invest'
}> = [
  { kind: 'saving', currency: 'ARS', strategy: 'save' },
  { kind: 'saving', currency: 'USD', strategy: 'save' },
  { kind: 'investment', currency: 'ARS', strategy: 'invest' },
  { kind: 'investment', currency: 'USD', strategy: 'invest' },
]

function buildAllocationMap(allocations: ShortfallInput['allocations']): Map<string, BigNumber> {
  const map = new Map<string, BigNumber>()
  for (const allocation of allocations) {
    const percentage = new BigNumber(String(allocation.percentage).replace(',', '.'))
    if (percentage.isFinite() && percentage.isGreaterThan(0)) map.set(allocation.goalId, percentage)
  }
  return map
}

function sumExpectedShortfallAmount(
  input: ShortfallInput,
  category: (typeof SHORTFALL_CATEGORIES)[number],
  commitment: BigNumber,
  allocationMap: Map<string, BigNumber>,
): BigNumber {
  return input.goals.reduce(
    (total, goal) => total.plus(expectedGoalShare(goal, category, commitment, allocationMap)),
    new BigNumber(0),
  )
}

function expectedGoalShare(
  goal: ShortfallInput['goals'][number],
  category: (typeof SHORTFALL_CATEGORIES)[number],
  commitment: BigNumber,
  allocationMap: Map<string, BigNumber>,
): BigNumber {
  if (!matchesShortfallCategory(goal, category)) return new BigNumber(0)
  const percentage = allocationMap.get(goal.id)
  if (!percentage) return new BigNumber(0)
  const share = commitment.multipliedBy(percentage).dividedBy(100)
  return category.currency === 'USD' ? share.dividedBy(PLANNING_ARS_PER_USD) : share
}

function matchesShortfallCategory(
  goal: ShortfallInput['goals'][number],
  category: (typeof SHORTFALL_CATEGORIES)[number],
): boolean {
  return goal.currency === category.currency && goal.strategy === category.strategy
}

function getContributionMonth(createdAt: Date | string): string | null {
  try {
    return (createdAt instanceof Date ? createdAt : new Date(createdAt)).toISOString().slice(0, 7)
  } catch {
    return null
  }
}

function sumActualShortfallAmount(
  contributions: ShortfallInput['savingContributions'],
  currency: CurrencyCode,
  closedMonth: string,
): BigNumber {
  return contributions.reduce(
    (total, contribution) => total.plus(actualContributionAmount(contribution, currency, closedMonth)),
    new BigNumber(0),
  )
}

function actualContributionAmount(
  contribution: ShortfallInput['savingContributions'][number],
  currency: CurrencyCode,
  closedMonth: string,
): BigNumber {
  if (!isContributionInClosedMonth(contribution, currency, closedMonth)) return new BigNumber(0)
  return parsePositiveContributionAmount(contribution.amount)
}

function isContributionInClosedMonth(
  contribution: ShortfallInput['savingContributions'][number],
  currency: CurrencyCode,
  closedMonth: string,
): boolean {
  return contribution.currency === currency && getContributionMonth(contribution.createdAt) === closedMonth
}

function parsePositiveContributionAmount(value: string): BigNumber {
  try {
    const amount = new BigNumber(value)
    return isPositiveFiniteNumber(amount) ? amount : new BigNumber(0)
  } catch {
    return new BigNumber(0)
  }
}

function deriveCategoryShortfall(
  input: ShortfallInput,
  category: (typeof SHORTFALL_CATEGORIES)[number],
  commitment: BigNumber,
  allocationMap: Map<string, BigNumber>,
): PreviousMonthShortfall | null {
  const expected = sumExpectedShortfallAmount(input, category, commitment, allocationMap)
  if (!expected.isGreaterThan(0)) return null
  const contributions = category.kind === 'saving' ? input.savingContributions : input.investmentContributions
  const actual = sumActualShortfallAmount(contributions, category.currency, input.closedMonth)
  const amount = expected.minus(actual).toFixed(2, BigNumber.ROUND_HALF_UP)
  return new BigNumber(amount).isGreaterThan(0)
    ? { kind: category.kind, currency: category.currency, amount: createMoney(amount, category.currency) }
    : null
}

export function derivePreviousMonthShortfalls(input: ShortfallInput): PreviousMonthShortfall[] {
  const commitmentBn = getValidShortfallCommitment(input)
  if (!commitmentBn) return []
  const allocationMap = buildAllocationMap(input.allocations)
  return SHORTFALL_CATEGORIES.flatMap((category) =>
    getCategoryShortfallList(input, category, commitmentBn, allocationMap),
  )
}

function getValidShortfallCommitment(input: ShortfallInput): BigNumber | null {
  if (!hasShortfallInputs(input)) return null
  const commitment = new BigNumber(input.plannedMonthlyContribution!)
  return commitment.isFinite() && commitment.isGreaterThan(0) ? commitment : null
}

function hasShortfallInputs(input: ShortfallInput): boolean {
  return Boolean(input.plannedMonthlyContribution) && input.allocations.length > 0
}

function getCategoryShortfallList(
  input: ShortfallInput,
  category: (typeof SHORTFALL_CATEGORIES)[number],
  commitment: BigNumber,
  allocationMap: Map<string, BigNumber>,
): PreviousMonthShortfall[] {
  const shortfall = deriveCategoryShortfall(input, category, commitment, allocationMap)
  return shortfall ? [shortfall] : []
}
