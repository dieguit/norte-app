import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  createMoney,
  addMoney,
  multiplyMoneyByFactor,
} from '../../lib/money'
import {
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  PROJECTION_HORIZON_MONTHS,
} from '../financial/financial'
import {
  type MonthlyFinancialPlan,
  type MonthlyFinancialSummary,
  getMonthlyFinancialSummary,
  getGoalContributionArs,
} from '../financial/monthly-plan'
import type { IncomesWorkspace } from '../financial/incomes'
import type { ExpensesWorkspace } from '../financial/expenses'

export type GoalPriority = 'high' | 'medium' | 'low'
export type GoalStatus = 'active' | 'paused' | 'completed'
export type GoalStrategy = 'save' | 'invest'
export type InvestmentAvailability = 'available_now' | 'available_from' | 'long_term'

export type GoalProjection =
  | { status: 'available'; completionMonth: string }
  | { status: 'target_unavailable' }
  | { status: 'no_future_allocation' }
  | { status: 'commitment_absent' }
  | { status: 'plan_paused' }
  | { status: 'investment_assumption_unavailable' }
  | { status: 'outside_horizon' }

export interface GoalFundingRow {
  percentage: string
  monthlyContribution?: Money
  allocatedBaseAmount?: Money
  allocatedDestinationAmount?: Money
  effectiveMonth: string
}

export type ContributionKind = 'saving' | 'investment'

export interface ContributionAllocationSummary {
  goalId: string
  goalName: string
  amount: string
  percentage: string
}

export interface ContributionSummary {
  id: string
  kind: ContributionKind
  userId?: string
  amount: string
  currency: CurrencyCode
  placeId?: string
  placeName?: string
  arsSpent?: string | null
  effectiveRate?: string | null
  createdAt: string
  allocations: ContributionAllocationSummary[]
}

export type SavingContributionSummary = ContributionSummary

export interface GoalCompletionWithdrawalSummary {
  id: string
  placeId: string
  placeName: string
  amount: Money
  createdAt: string
}

export interface GoalWorkspaceItem {
  id: string
  name: string
  type: string
  currency: CurrencyCode
  priority: GoalPriority
  strategy: GoalStrategy
  status: GoalStatus
  createdAt: string
  desiredDate?: string
  completedAt?: string
  targetAmount?: Money
  savingsValue: Money
  investmentValue: Money
  actualValue: Money
  progressPercentage?: string
  funding: GoalFundingRow[]
  projection: GoalProjection
  desiredDateDeltaMonths?: number
  annualReturnRate?: string
  availability?: InvestmentAvailability
  availableFrom?: string
  usesPlanningRate: boolean
  completionEligible: boolean
  completionWithdrawals?: GoalCompletionWithdrawalSummary[]
  contributions?: ContributionSummary[]
  savingContributions?: ContributionSummary[]
}

export interface GoalsFinancialSummary extends MonthlyFinancialSummary {
  dedicationPercentage: string
  contribution: Money
}

export interface GoalsWorkspace {
  financialSummary: GoalsFinancialSummary
  groups: Array<{ status: GoalStatus; goals: GoalWorkspaceItem[] }>
}

export type GoalsAppState =
  | { profile: 'missing' }
  | { profile: 'present'; workspace: GoalsWorkspace }

export interface GoalsWorkspaceSource {
  profile?: {
    userId: string
    baseCurrency: CurrencyCode
    expensesKnowledge: 'known' | 'unknown' | string
    plannedMonthlyContribution?: string | null
    goalDedicationPercentage?: string
    onboardingCompleted: boolean
  } | null
  goals: Array<{
    id: string
    userId?: string
    name: string
    type: string
    targetAmount?: string | null
    currency: CurrencyCode
    priority: GoalPriority
    strategy: GoalStrategy
    status: GoalStatus
    desiredDate?: string | null
    completedAt?: string | null
    emergencyFundMonths?: number | null
    createdAt: string
  }>
  savingsPositions: Array<{
    id: string
    goalId: string
    amount: string
    currency: CurrencyCode
    location?: string | null
  }>
  investmentPositions: Array<{
    id: string
    goalId: string
    currentValue: string
    currency: CurrencyCode
    annualReturnRate?: string | null
    availability?: InvestmentAvailability | null
    availableFrom?: string | null
  }>
  snapshots: Array<{
    id: string
    userId?: string
    effectiveMonth: string
  }>
  allocations: Array<{
    id: string
    snapshotId: string
    goalId: string
    percentage: string
  }>
  contributions?: ContributionSummary[]
  savingContributions?: SavingContributionSummary[]
  incomes?: IncomesWorkspace['incomes']
  expenses?: ExpensesWorkspace['expenses']
  completionWithdrawals?: Array<{
    id: string
    goalId: string
    placeId: string
    placeName: string
    amount: string
    currency: CurrencyCode
    createdAt: string
  }>
}

const PRIORITY_ORDER: Record<GoalPriority, number> = { high: 0, medium: 1, low: 2 }
const STATUS_GROUPS: GoalStatus[] = ['active', 'paused', 'completed']

export function isGoalCompletionEligible(
  goal: Pick<
    GoalWorkspaceItem,
    'status' | 'strategy' | 'type' | 'targetAmount' | 'savingsValue'
  >,
): boolean {
  if (!isActiveSavingGoal(goal)) return false
  if (!isCompletableGoalType(goal.type)) return false
  return hasReachedPositiveTarget(goal.targetAmount, goal.savingsValue)
}

function isActiveSavingGoal(goal: Pick<GoalWorkspaceItem, 'status' | 'strategy'>): boolean {
  return goal.status === 'active' && goal.strategy === 'save'
}

function isCompletableGoalType(type: string): boolean {
  return type === 'purchase' || type === 'other'
}

function hasReachedPositiveTarget(targetAmount: Money | undefined, savingsValue: Money): boolean {
  if (!targetAmount) return false
  if (!new BigNumber(targetAmount.amount).isGreaterThan(0)) return false
  return new BigNumber(savingsValue.amount).isGreaterThanOrEqualTo(targetAmount.amount)
}

export function groupGoals(goals: GoalWorkspaceItem[]): GoalsWorkspace['groups'] {
  return STATUS_GROUPS.map((status) => ({
    status,
    goals: goals
      .filter((goal) => goal.status === status)
      .sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        const createdDiff = a.createdAt.localeCompare(b.createdAt)
        if (createdDiff !== 0) return createdDiff
        return a.name.localeCompare(b.name, 'es-AR')
      }),
  }))
}

function addMonthsToMonth(monthStr: string, monthsToAdd: number): string {
  const [year, month] = monthStr.slice(0, 7).split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) + monthsToAdd
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`
}

function selectFundingForMonth(funding: GoalFundingRow[], month: string): GoalFundingRow | undefined {
  const eligible = funding.filter((row) => row.effectiveMonth.slice(0, 7) <= month.slice(0, 7))
  return eligible.reduce<GoalFundingRow | undefined>((selected, row) => {
    if (!selected) return row
    return selected.effectiveMonth.localeCompare(row.effectiveMonth) < 0 ? row : selected
  }, undefined)
}

type GoalProjectionParams = {
  status: GoalStatus
  strategy: GoalStrategy
  targetAmount?: Money
  actualValue: Money
  savingsValue: Money
  investmentValue: Money
  annualReturnRate?: string
  funding: GoalFundingRow[]
  currentMonth: string
  getMonthlyContribution?: (month: string) => Money
}

function hasPositiveFunding(funding: GoalFundingRow[], horizonHasPositive: boolean): boolean {
  return funding.some((row) => new BigNumber(row.percentage).isGreaterThan(0)) || horizonHasPositive
}

function isPositiveFundingRow(row: GoalFundingRow | undefined): boolean {
  if (!row) return false
  return new BigNumber(row.percentage).isGreaterThan(0)
}

function hasMissingCommitment(
  funding: GoalFundingRow[],
  horizonFunding: GoalFundingRow | undefined,
  horizonHasPositive: boolean,
): boolean {
  const missingFundingCommitment = funding.some(
    (row) => new BigNumber(row.percentage).isGreaterThan(0) && row.monthlyContribution === undefined,
  )
  if (missingFundingCommitment) return true
  return horizonHasPositive && horizonFunding?.monthlyContribution === undefined
}

function parseAnnualReturnRate(value: string | null | undefined): number | undefined {
  if (value == null) return undefined
  if (value.trim() === '') return undefined
  const annualRate = Number(value.replace(',', '.'))
  if ([!Number.isFinite(annualRate), annualRate <= -100].some(Boolean)) return undefined
  return annualRate
}

function getMonthlyInvestmentRate(value: string | null | undefined): BigNumber | undefined {
  const annualRate = parseAnnualReturnRate(value)
  if (annualRate === undefined) return undefined
  const compoundRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1
  return Number.isFinite(compoundRate) ? new BigNumber(compoundRate) : undefined
}

function growInvestmentBalance(
  balance: BigNumber,
  monthIndex: number,
  strategy: GoalStrategy,
  monthlyRate: BigNumber | undefined,
): BigNumber {
  if (strategy !== 'invest') return balance
  if (monthIndex === 0) return balance
  if (!monthlyRate) return balance
  return balance.times(new BigNumber(1).plus(monthlyRate))
}

function getProjectedDestinationAmount(
  params: Pick<GoalProjectionParams, 'funding' | 'currentMonth' | 'getMonthlyContribution' | 'targetAmount'> & {
    projectedMonth: string
  },
): Money | undefined {
  const monthFunding = selectFundingForMonth(params.funding, params.projectedMonth)
  if (!monthFunding) return undefined
  if (!new BigNumber(monthFunding.percentage).isGreaterThan(0)) return undefined
  if (!params.getMonthlyContribution) return monthFunding.allocatedDestinationAmount

  const monthContribution = params.getMonthlyContribution(params.projectedMonth)
  const allocatedBase = multiplyMoneyByFactor(
    monthContribution,
    new BigNumber(monthFunding.percentage).dividedBy(100).toString(),
  )
  return convertCommitmentToDestination(allocatedBase, params.targetAmount!.currency)
}

function addProjectedDestination(
  balances: { savings: BigNumber; investments: BigNumber },
  destination: Money | undefined,
  strategy: GoalStrategy,
): { savings: BigNumber; investments: BigNumber } {
  if (!isPositiveDestination(destination)) return balances
  if (strategy === 'save') {
    return { savings: balances.savings.plus(destination.amount), investments: balances.investments }
  }
  if (strategy === 'invest') {
    return { savings: balances.savings, investments: balances.investments.plus(destination.amount) }
  }
  return balances
}

function isPositiveDestination(destination: Money | undefined): destination is Money {
  if (!destination) return false
  return new BigNumber(destination.amount).isGreaterThan(0)
}

function simulateGoalCompletion(params: {
  strategy: GoalStrategy
  targetAmount: Money
  savingsValue: Money
  investmentValue: Money
  funding: GoalFundingRow[]
  currentMonth: string
  monthlyRate?: BigNumber
  getMonthlyContribution?: (month: string) => Money
}): string | undefined {
  let balances = {
    savings: new BigNumber(params.savingsValue.amount),
    investments: new BigNumber(params.investmentValue.amount),
  }
  const target = new BigNumber(params.targetAmount.amount)
  const baseMonth = params.currentMonth.slice(0, 7)

  for (let monthIndex = 0; monthIndex < PROJECTION_HORIZON_MONTHS; monthIndex++) {
    const projectedMonth = addMonthsToMonth(baseMonth, monthIndex)
    balances = {
      savings: balances.savings,
      investments: growInvestmentBalance(
        balances.investments,
        monthIndex,
        params.strategy,
        params.monthlyRate,
      ),
    }
    const destination = getProjectedDestinationAmount({ ...params, projectedMonth })
    balances = addProjectedDestination(balances, destination, params.strategy)

    if (balances.savings.plus(balances.investments).isGreaterThanOrEqualTo(target)) {
      return projectedMonth
    }
  }
  return undefined
}

function hasNoFutureAllocation(
  horizonHasPositive: boolean,
  hasInvestBalance: boolean,
  strategy: GoalStrategy,
): boolean {
  if (horizonHasPositive) return false
  if (hasInvestBalance && strategy === 'invest') return false
  return true
}

type ProjectionPlan = {
  targetAmount: Money
  horizonHasPositive: boolean
  hasInvestBalance: boolean
  monthlyRate?: BigNumber
}

type ProjectionPlanResult = ProjectionPlan | GoalProjection

function getInitialProjectionStatus(params: GoalProjectionParams): GoalProjection | undefined {
  if (!params.targetAmount) return { status: 'target_unavailable' }
  if (new BigNumber(params.actualValue.amount).isGreaterThanOrEqualTo(params.targetAmount.amount)) {
    return { status: 'available', completionMonth: params.currentMonth.slice(0, 7) }
  }
  if (params.status !== 'active') return { status: 'plan_paused' }
  return undefined
}

function getInvestmentProjectionPlan(params: {
  strategy: GoalStrategy
  funding: GoalFundingRow[]
  horizonHasPositive: boolean
  investmentValue: Money
  annualReturnRate?: string
}): Pick<ProjectionPlan, 'hasInvestBalance' | 'monthlyRate'> | GoalProjection {
  const hasInvestBalance = new BigNumber(params.investmentValue.amount).isGreaterThan(0)
  const hasPositiveAllocation = hasPositiveFunding(params.funding, params.horizonHasPositive)
  const needsSimulation = shouldSimulateInvestment(
    params.strategy,
    hasPositiveAllocation,
    hasInvestBalance,
  )
  if (!needsSimulation) return { hasInvestBalance }
  const monthlyRate = getMonthlyInvestmentRate(params.annualReturnRate)
  if (!monthlyRate) return { status: 'investment_assumption_unavailable' }
  return { hasInvestBalance, monthlyRate }
}

function shouldSimulateInvestment(
  strategy: GoalStrategy,
  hasPositiveAllocation: boolean,
  hasInvestBalance: boolean,
): boolean {
  if (strategy !== 'invest') return false
  if (hasPositiveAllocation) return true
  return hasInvestBalance
}

function getProjectionPlan(params: GoalProjectionParams): ProjectionPlanResult {
  const initialStatus = getInitialProjectionStatus(params)
  if (initialStatus) return initialStatus

  const targetAmount = params.targetAmount!
  const horizonFunding = selectFundingForMonth(
    params.funding,
    addMonthsToMonth(params.currentMonth, PROJECTION_HORIZON_MONTHS - 1),
  )
  const horizonHasPositive = isPositiveFundingRow(horizonFunding)
  if (hasMissingCommitment(params.funding, horizonFunding, horizonHasPositive)) {
    return { status: 'commitment_absent' }
  }
  const investmentPlan = getInvestmentProjectionPlan({ ...params, horizonHasPositive })
  if ('status' in investmentPlan) return investmentPlan
  return { targetAmount, horizonHasPositive, ...investmentPlan }
}

function getProjectionAfterSimulation(
  plan: ProjectionPlan,
  strategy: GoalStrategy,
): GoalProjection {
  if (hasNoFutureAllocation(plan.horizonHasPositive, plan.hasInvestBalance, strategy)) {
    return { status: 'no_future_allocation' }
  }
  return { status: 'outside_horizon' }
}

export function projectGoalCompletion(params: GoalProjectionParams): GoalProjection {
  const plan = getProjectionPlan(params)
  if ('status' in plan) return plan
  const completionMonth = simulateGoalCompletion({
    strategy: params.strategy,
    targetAmount: plan.targetAmount,
    savingsValue: params.savingsValue,
    investmentValue: params.investmentValue,
    funding: params.funding,
    currentMonth: params.currentMonth,
    monthlyRate: plan.monthlyRate,
    getMonthlyContribution: params.getMonthlyContribution,
  })
  if (completionMonth) {
    return { status: 'available', completionMonth }
  }
  return getProjectionAfterSimulation(plan, params.strategy)
}

type GoalSource = GoalsWorkspaceSource['goals'][number]
type SavingsPosition = GoalsWorkspaceSource['savingsPositions'][number]
type InvestmentPosition = GoalsWorkspaceSource['investmentPositions'][number]
type GoalAllocation = GoalsWorkspaceSource['allocations'][number]
type GoalSnapshot = GoalsWorkspaceSource['snapshots'][number]

interface GoalsFinancialContext {
  currentFinancials: MonthlyFinancialSummary
  currentContribution?: Money
  getMonthlyContribution?: (month: string) => Money
}

function arrayOrEmpty<T>(values: T[] | null | undefined): T[] {
  return values ?? []
}

function getDedicationPercentage(profile: GoalsWorkspaceSource['profile']): string {
  return profile?.goalDedicationPercentage ?? '90.00'
}

function toOptional<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined
}

function hasFinancialPlan(rows: GoalsWorkspaceSource): boolean {
  return rows.incomes !== undefined || rows.expenses !== undefined
}

function buildMonthlyPlan(rows: GoalsWorkspaceSource): MonthlyFinancialPlan {
  return {
    incomes: arrayOrEmpty(rows.incomes),
    expenses: arrayOrEmpty(rows.expenses),
  }
}

function buildPlannedContributionContext(
  monthlyPlan: MonthlyFinancialPlan,
  dedicationPercentage: string,
  currentMonth: string,
  currentFinancials: MonthlyFinancialSummary,
): GoalsFinancialContext {
  const getMonthlyContribution = (month: string): Money => {
    const financials = getMonthlyFinancialSummary(monthlyPlan, month)
    return getGoalContributionArs(financials.balance, dedicationPercentage)
  }
  return { currentFinancials, currentContribution: getMonthlyContribution(currentMonth), getMonthlyContribution }
}

function getLegacyContribution(
  profile: GoalsWorkspaceSource['profile'],
): Money | undefined {
  if (!profile) return undefined
  const plannedMonthlyContribution = profile.plannedMonthlyContribution
  if (plannedMonthlyContribution === null) return undefined
  if (plannedMonthlyContribution === undefined) return undefined
  return createMoney(plannedMonthlyContribution, getBaseCurrency(profile))
}

function getBaseCurrency(profile: NonNullable<GoalsWorkspaceSource['profile']>): CurrencyCode {
  return profile.baseCurrency ?? 'ARS'
}

function canDeriveEmergencyFund(profile: GoalsWorkspaceSource['profile']): boolean {
  if (!profile) return false
  return profile.expensesKnowledge === 'known'
}

function buildGoalsFinancialContext(
  rows: GoalsWorkspaceSource,
  currentMonth: string,
): GoalsFinancialContext {
  const dedicationPercentage = getDedicationPercentage(rows.profile)
  const monthlyPlan = buildMonthlyPlan(rows)
  const currentFinancials = getMonthlyFinancialSummary(monthlyPlan, currentMonth)
  if (hasFinancialPlan(rows)) {
    return buildPlannedContributionContext(
      monthlyPlan,
      dedicationPercentage,
      currentMonth,
      currentFinancials,
    )
  }

  const legacyContribution = getLegacyContribution(rows.profile)
  if (!legacyContribution) {
    return { currentFinancials }
  }

  return {
    currentFinancials,
    currentContribution: legacyContribution,
    getMonthlyContribution: () => legacyContribution,
  }
}

function buildFinancialSummary(
  context: GoalsFinancialContext,
  dedicationPercentage: string,
): GoalsFinancialSummary {
  return {
    ...context.currentFinancials,
    dedicationPercentage,
    contribution:
      context.currentContribution ??
      getGoalContributionArs(context.currentFinancials.balance, dedicationPercentage),
  }
}

function mapCompletionWithdrawals(
  withdrawals: GoalsWorkspaceSource['completionWithdrawals'] = [],
): Map<string, GoalCompletionWithdrawalSummary[]> {
  const byGoal = new Map<string, GoalCompletionWithdrawalSummary[]>()
  for (const withdrawal of withdrawals) {
    const summaries = byGoal.get(withdrawal.goalId) ?? []
    summaries.push({
      id: withdrawal.id,
      placeId: withdrawal.placeId,
      placeName: withdrawal.placeName,
      amount: createMoney(withdrawal.amount, withdrawal.currency),
      createdAt: withdrawal.createdAt,
    })
    byGoal.set(withdrawal.goalId, summaries)
  }
  return byGoal
}

function buildSavingsValue(goal: GoalSource, positions: SavingsPosition[]): Money {
  const goalPositions = positions.filter((position) => position.goalId === goal.id)
  for (const position of goalPositions) {
    if (position.currency !== goal.currency) {
      throw new Error(`Persisted savings position currency mismatch: ${position.currency} vs ${goal.currency}`)
    }
  }
  return goalPositions.reduce(
    (total, position) => addMoney(total, createMoney(position.amount, position.currency)),
    createMoney('0', goal.currency),
  )
}

interface GoalInvestmentDetails {
  value: Money
  annualReturnRate?: string
  availability?: InvestmentAvailability
  availableFrom?: string
}

function buildInvestmentDetails(goal: GoalSource, positions: InvestmentPosition[]): GoalInvestmentDetails {
  const goalPositions = positions.filter((position) => position.goalId === goal.id)
  validateInvestmentPositionCurrencies(goal, goalPositions)
  const position = goalPositions[0]
  return {
    value: buildInvestmentValue(goal, position),
    ...getInvestmentMetadata(position),
  }
}

function validateInvestmentPositionCurrencies(goal: GoalSource, positions: InvestmentPosition[]): void {
  for (const position of positions) {
    if (position.currency !== goal.currency) {
      throw new Error(`Persisted investment position currency mismatch: ${position.currency} vs ${goal.currency}`)
    }
  }
}

function buildInvestmentValue(goal: GoalSource, position: InvestmentPosition | undefined): Money {
  if (!position) return createMoney('0', goal.currency)
  return createMoney(position.currentValue, position.currency)
}

function getInvestmentMetadata(position: InvestmentPosition | undefined): Omit<GoalInvestmentDetails, 'value'> {
  if (!position) return {}
  return {
    annualReturnRate: toOptional(position.annualReturnRate),
    availability: toOptional(position.availability),
    availableFrom: toOptional(position.availableFrom),
  }
}

function getExplicitGoalTarget(goal: GoalSource): Money | undefined {
  if (!goal.targetAmount) return undefined
  return createMoney(goal.targetAmount, goal.currency)
}

function getEmergencyFundMonths(goal: GoalSource): number {
  return goal.emergencyFundMonths ?? 3
}

function buildGoalTarget(
  goal: GoalSource,
  currentFinancials: MonthlyFinancialSummary,
  canDeriveEmergencyFund: boolean,
): { targetAmount?: Money; usesPlanningRate: boolean } {
  const targetAmount = getExplicitGoalTarget(goal)
  if (targetAmount) return { targetAmount, usesPlanningRate: false }
  if (goal.type !== 'emergency_fund') return { targetAmount, usesPlanningRate: false }
  if (!canDeriveEmergencyFund) return { targetAmount, usesPlanningRate: false }
  return {
    targetAmount: deriveEmergencyFundTarget(
      currentFinancials.expenses,
      getEmergencyFundMonths(goal),
    ),
    usesPlanningRate: true,
  }
}

function calculateProgressPercentage(targetAmount: Money | undefined, actualValue: Money): string | undefined {
  if (!targetAmount) return undefined
  const target = new BigNumber(targetAmount.amount)
  if (!target.isGreaterThan(0)) return undefined
  return new BigNumber(actualValue.amount)
    .dividedBy(target)
    .times(100)
    .toFixed(2, BigNumber.ROUND_HALF_UP)
}

function buildFundingRow(
  allocation: GoalAllocation,
  snapshot: GoalSnapshot,
  goalCurrency: CurrencyCode,
  currentContribution: Money | undefined,
): { row: GoalFundingRow; usesPlanningRate: boolean } {
  let allocatedBaseAmount: Money | undefined
  let allocatedDestinationAmount: Money | undefined
  let usesPlanningRate = false
  if (currentContribution) {
    const factor = new BigNumber(allocation.percentage).dividedBy(100).toString()
    allocatedBaseAmount = multiplyMoneyByFactor(currentContribution, factor)
    allocatedDestinationAmount = convertCommitmentToDestination(allocatedBaseAmount, goalCurrency)
    usesPlanningRate = allocatedBaseAmount.currency !== allocatedDestinationAmount.currency
  }
  return {
    row: {
      percentage: allocation.percentage,
      monthlyContribution: currentContribution,
      allocatedBaseAmount,
      allocatedDestinationAmount,
      effectiveMonth: snapshot.effectiveMonth,
    },
    usesPlanningRate,
  }
}

function buildGoalFunding(
  goal: GoalSource,
  rows: GoalsWorkspaceSource,
  currentContribution: Money | undefined,
): { funding: GoalFundingRow[]; usesPlanningRate: boolean } {
  const funding: GoalFundingRow[] = []
  let usesPlanningRate = false
  const goalAllocations = arrayOrEmpty(rows.allocations).filter((allocation) => allocation.goalId === goal.id)
  for (const allocation of goalAllocations) {
    const snapshot = arrayOrEmpty(rows.snapshots).find((candidate) => candidate.id === allocation.snapshotId)
    if (!snapshot) continue
    const result = buildFundingRow(allocation, snapshot, goal.currency, currentContribution)
    if (result.usesPlanningRate) usesPlanningRate = true
    funding.push(result.row)
  }
  return { funding, usesPlanningRate }
}

function getGoalContributions(rows: GoalsWorkspaceSource, goalId: string): ContributionSummary[] {
  return (rows.contributions ?? rows.savingContributions ?? [])
    .filter((contribution) => contribution.allocations.some((allocation) => allocation.goalId === goalId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function getDesiredDateDeltaMonths(
  desiredDate: string | null | undefined,
  projection: GoalProjection,
): number | undefined {
  if (!desiredDate || projection.status !== 'available') return undefined
  const [completionYear, completionMonth] = projection.completionMonth.split('-').map(Number)
  const [desiredYear, desiredMonth] = desiredDate.slice(0, 7).split('-').map(Number)
  return completionYear * 12 + completionMonth - (desiredYear * 12 + desiredMonth)
}

function usesPlanningRate(
  targetUsesPlanningRate: boolean,
  fundingUsesPlanningRate: boolean,
): boolean {
  if (targetUsesPlanningRate) return true
  return fundingUsesPlanningRate
}

function buildGoalWorkspaceItem(input: {
  goal: GoalSource
  rows: GoalsWorkspaceSource
  currentFinancials: MonthlyFinancialSummary
  currentContribution?: Money
  getMonthlyContribution?: (month: string) => Money
  currentMonth: string
  completionWithdrawalsByGoal: Map<string, GoalCompletionWithdrawalSummary[]>
}): GoalWorkspaceItem {
  const { goal, rows, currentFinancials, currentContribution, getMonthlyContribution, currentMonth } = input
  const savingsValue = buildSavingsValue(goal, arrayOrEmpty(rows.savingsPositions))
  const investment = buildInvestmentDetails(goal, arrayOrEmpty(rows.investmentPositions))
  const actualValue = addMoney(savingsValue, investment.value)
  const target = buildGoalTarget(
    goal,
    currentFinancials,
    canDeriveEmergencyFund(rows.profile),
  )
  const progressPercentage = calculateProgressPercentage(target.targetAmount, actualValue)
  const funding = buildGoalFunding(goal, rows, currentContribution)
  const projection = projectGoalCompletion({
    status: goal.status,
    strategy: goal.strategy,
    targetAmount: target.targetAmount,
    actualValue,
    savingsValue,
    investmentValue: investment.value,
    annualReturnRate: investment.annualReturnRate,
    funding: funding.funding,
    currentMonth,
    getMonthlyContribution,
  })
  const contributions = getGoalContributions(rows, goal.id)
  return {
    id: goal.id, name: goal.name, type: goal.type, currency: goal.currency,
    priority: goal.priority, strategy: goal.strategy, status: goal.status, createdAt: goal.createdAt,
    desiredDate: toOptional(goal.desiredDate), completedAt: toOptional(goal.completedAt),
    targetAmount: target.targetAmount, savingsValue, investmentValue: investment.value, actualValue,
    progressPercentage, funding: funding.funding, projection,
    desiredDateDeltaMonths: getDesiredDateDeltaMonths(goal.desiredDate, projection),
    annualReturnRate: investment.annualReturnRate, availability: investment.availability,
    availableFrom: investment.availableFrom,
    usesPlanningRate: usesPlanningRate(target.usesPlanningRate, funding.usesPlanningRate),
    completionEligible: isGoalCompletionEligible({
      status: goal.status, strategy: goal.strategy, type: goal.type,
      targetAmount: target.targetAmount, savingsValue,
    }),
    completionWithdrawals: input.completionWithdrawalsByGoal.get(goal.id),
    contributions, savingContributions: contributions,
  }
}

export function buildGoalsWorkspace(
  rows: GoalsWorkspaceSource,
  currentMonth: string,
): GoalsWorkspace {
  const dedicationPercentage = getDedicationPercentage(rows.profile)
  const financialContext = buildGoalsFinancialContext(rows, currentMonth)
  const financialSummary = buildFinancialSummary(financialContext, dedicationPercentage)
  const completionWithdrawalsByGoal = mapCompletionWithdrawals(rows.completionWithdrawals)
  const goalItems = rows.goals.map((goal) => buildGoalWorkspaceItem({
    goal,
    rows,
    currentFinancials: financialContext.currentFinancials,
    currentContribution: financialContext.currentContribution,
    getMonthlyContribution: financialContext.getMonthlyContribution,
    currentMonth,
    completionWithdrawalsByGoal,
  }))

  return {
    financialSummary,
    groups: groupGoals(goalItems),
  }
}

export function buildCurrentGoalsPlanWorkspace(
  state: {
    source: GoalsWorkspaceSource
    pendingSnapshots: GoalsWorkspaceSource['snapshots']
    pendingAllocations: GoalsWorkspaceSource['allocations']
  },
  currentMonth: string,
): GoalsWorkspace {
  const pendingSnapshotIds = new Set(
    state.pendingSnapshots.map((snapshot) => snapshot.id),
  )

  return buildGoalsWorkspace(
    {
      ...state.source,
      snapshots: [
        ...(state.source.snapshots ?? []).filter(
          (snapshot) => !pendingSnapshotIds.has(snapshot.id),
        ),
        ...state.pendingSnapshots,
      ],
      allocations: [
        ...(state.source.allocations ?? []).filter(
          (allocation) => !pendingSnapshotIds.has(allocation.snapshotId),
        ),
        ...state.pendingAllocations.filter((allocation) =>
          pendingSnapshotIds.has(allocation.snapshotId),
        ),
      ],
    },
    currentMonth,
  )
}
