import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  createMoney,
  addMoney,
  multiplyMoneyByFactor,
} from '../../lib/money'
import {
  type FundingMethod,
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  PROJECTION_HORIZON_MONTHS,
} from '../financial/financial'

export type GoalPriority = 'high' | 'medium' | 'low'
export type GoalStatus = 'active' | 'paused' | 'completed'
export type InvestmentAvailability = 'available_now' | 'available_from' | 'long_term'

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
}

export type GoalProjection =
  | { status: 'available'; completionMonth: string }
  | { status: 'target_unavailable' }
  | { status: 'no_future_allocation' }
  | { status: 'commitment_absent' }
  | { status: 'plan_paused' }
  | { status: 'investment_assumption_unavailable' }
  | { status: 'outside_horizon' }

export interface GoalFundingRow {
  channelId: string
  fundingMethod: FundingMethod
  destinationCurrency: CurrencyCode
  percentage: string
  commitmentStatus: 'active' | 'paused'
  monthlyCommitment?: Money
  allocatedBaseAmount?: Money
  allocatedDestinationAmount?: Money
  effectiveMonth: string
}

export interface GoalWorkspaceItem {
  id: string
  name: string
  type: string
  currency: CurrencyCode
  priority: GoalPriority
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
  saveEnabled: boolean
  investEnabled: boolean
}

export interface GoalsWorkspace {
  groups: Array<{ status: GoalStatus; goals: GoalWorkspaceItem[] }>
}

export type GoalsAppState =
  | { profile: 'missing' }
  | { profile: 'present'; workspace: GoalsWorkspace }

export interface GoalsWorkspaceSource {
  profile?: {
    userId: string
    baseCurrency: CurrencyCode
    approximateMonthlyIncome: string
    approximateMonthlyExpenses?: string | null
    expensesKnowledge: 'known' | 'unknown' | string
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
    status: GoalStatus
    desiredDate?: string | null
    completedAt?: string | null
    emergencyFundMonths?: number | null
    saveEnabled?: boolean
    investEnabled?: boolean
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
  channels: Array<{
    id: string
    userId?: string
    fundingMethod: FundingMethod
    destinationCurrency: CurrencyCode
  }>
  snapshots: Array<{
    id: string
    channelId: string
    monthlyCommitmentAmount?: string | null
    baseCurrency: CurrencyCode
    commitmentStatus: 'active' | 'paused'
    effectiveMonth: string
  }>
  allocations: Array<{
    id: string
    snapshotId: string
    goalId: string
    percentage: string
  }>
}

const PRIORITY_ORDER: Record<GoalPriority, number> = { high: 0, medium: 1, low: 2 }
const STATUS_GROUPS: GoalStatus[] = ['active', 'paused', 'completed']

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

function deriveGoalProjection(params: {
  status: GoalStatus
  targetAmount?: Money
  actualValue: Money
  savingsValue: Money
  investmentValue: Money
  annualReturnRate?: string
  funding: GoalFundingRow[]
  currentMonth: string
}): GoalProjection {
  const {
    status,
    targetAmount,
    actualValue,
    savingsValue,
    investmentValue,
    annualReturnRate,
    funding,
    currentMonth,
  } = params

  if (!targetAmount) {
    return { status: 'target_unavailable' }
  }

  // Short-circuit reached Goals to currentMonth
  if (new BigNumber(actualValue.amount).isGreaterThanOrEqualTo(targetAmount.amount)) {
    return { status: 'available', completionMonth: currentMonth.slice(0, 7) }
  }

  // Short-circuit inactive Goals to plan_paused
  if (status !== 'active') {
    return { status: 'plan_paused' }
  }

  // Active funding rows with allocated amount
  const activeFunding = funding.filter(
    (f) => f.commitmentStatus === 'active' && new BigNumber(f.percentage).isGreaterThan(0),
  )

  const positiveFunding = funding.filter((f) => new BigNumber(f.percentage).isGreaterThan(0))
  if (positiveFunding.length > 0 && positiveFunding.every((f) => f.commitmentStatus === 'paused')) {
    return { status: 'plan_paused' }
  }

  const hasCommitmentAbsent = activeFunding.some((f) => f.monthlyCommitment === undefined)
  if (hasCommitmentAbsent) {
    return { status: 'commitment_absent' }
  }

  const hasInvestFunding = activeFunding.some((f) => f.fundingMethod === 'invest')
  const hasInvestBalance = new BigNumber(investmentValue.amount).isGreaterThan(0)
  const needsInvestmentSimulation = hasInvestFunding || hasInvestBalance

  let monthlyRate: BigNumber | undefined
  if (needsInvestmentSimulation) {
    if (annualReturnRate === undefined || annualReturnRate === null || annualReturnRate.trim() === '') {
      return { status: 'investment_assumption_unavailable' }
    }
    const annualNum = Number(annualReturnRate)
    if (!Number.isFinite(annualNum) || annualNum <= -100) {
      return { status: 'investment_assumption_unavailable' }
    }
    const annualRate = annualNum / 100
    const compoundRate = Math.pow(1 + annualRate, 1 / 12) - 1
    if (!Number.isFinite(compoundRate)) {
      return { status: 'investment_assumption_unavailable' }
    }
    monthlyRate = new BigNumber(compoundRate)
  }

  // If no future allocation and no investment growth
  if (activeFunding.length === 0 && !hasInvestBalance) {
    return { status: 'no_future_allocation' }
  }

  // Bounded monthly simulation: 0..719
  let currentSavings = new BigNumber(savingsValue.amount)
  let currentInvestments = new BigNumber(investmentValue.amount)
  const targetBn = new BigNumber(targetAmount.amount)
  const baseMonth = currentMonth.slice(0, 7)

  for (let m = 0; m < PROJECTION_HORIZON_MONTHS; m++) {
    const projectedMonth = addMonthsToMonth(baseMonth, m)

    if (m > 0 && monthlyRate) {
      currentInvestments = currentInvestments.times(new BigNumber(1).plus(monthlyRate))
    }

    for (const row of activeFunding) {
      const rowEffective = row.effectiveMonth.slice(0, 7)
      if (rowEffective <= projectedMonth && row.allocatedDestinationAmount) {
        if (row.fundingMethod === 'save') {
          currentSavings = currentSavings.plus(row.allocatedDestinationAmount.amount)
        } else if (row.fundingMethod === 'invest') {
          currentInvestments = currentInvestments.plus(row.allocatedDestinationAmount.amount)
        }
      }
    }

    if (currentSavings.plus(currentInvestments).isGreaterThanOrEqualTo(targetBn)) {
      return { status: 'available', completionMonth: projectedMonth }
    }
  }

  return { status: 'outside_horizon' }
}

export function buildGoalsWorkspace(
  rows: GoalsWorkspaceSource,
  currentMonth: string,
): GoalsWorkspace {
  const goalItems: GoalWorkspaceItem[] = rows.goals.map((goal) => {
    // 1. Savings value
    const goalSavings = rows.savingsPositions.filter((pos) => pos.goalId === goal.id)
    for (const pos of goalSavings) {
      if (pos.currency !== goal.currency) {
        throw new Error(`Persisted savings position currency mismatch: ${pos.currency} vs ${goal.currency}`)
      }
    }
    const savingsValue = goalSavings.reduce(
      (acc, pos) => addMoney(acc, createMoney(pos.amount, pos.currency)),
      createMoney('0', goal.currency),
    )

    // 2. Investment value & assumptions
    const goalInvestments = rows.investmentPositions.filter((pos) => pos.goalId === goal.id)
    for (const pos of goalInvestments) {
      if (pos.currency !== goal.currency) {
        throw new Error(`Persisted investment position currency mismatch: ${pos.currency} vs ${goal.currency}`)
      }
    }
    const investmentPos = goalInvestments[0]
    const investmentValue = investmentPos
      ? createMoney(investmentPos.currentValue, investmentPos.currency)
      : createMoney('0', goal.currency)
    const annualReturnRate = investmentPos?.annualReturnRate ?? undefined
    const availability = investmentPos?.availability ?? undefined
    const availableFrom = investmentPos?.availableFrom ?? undefined

    // 3. Actual value
    const actualValue = addMoney(savingsValue, investmentValue)

    // 4. Target amount & Progress
    let usesPlanningRate = false
    let targetAmount = goal.targetAmount ? createMoney(goal.targetAmount, goal.currency) : undefined

    if (
      !targetAmount &&
      goal.type === 'emergency_fund' &&
      rows.profile?.expensesKnowledge === 'known' &&
      rows.profile?.approximateMonthlyExpenses
    ) {
      targetAmount = deriveEmergencyFundTarget(
        createMoney(rows.profile.approximateMonthlyExpenses, 'ARS'),
        goal.emergencyFundMonths ?? 6,
      )
      usesPlanningRate = true
    }

    let progressPercentage: string | undefined
    if (targetAmount) {
      const targetBn = new BigNumber(targetAmount.amount)
      if (targetBn.isGreaterThan(0)) {
        progressPercentage = new BigNumber(actualValue.amount)
          .dividedBy(targetBn)
          .times(100)
          .toFixed(2, BigNumber.ROUND_HALF_UP)
      }
    }

    // 5. Funding rows
    const goalAllocations = rows.allocations.filter((alloc) => alloc.goalId === goal.id)
    const funding: GoalFundingRow[] = []

    for (const alloc of goalAllocations) {
      const snapshot = rows.snapshots.find((s) => s.id === alloc.snapshotId)
      if (!snapshot) continue
      const channel = rows.channels.find((c) => c.id === snapshot.channelId)
      if (!channel) continue

      if (channel.destinationCurrency !== goal.currency) {
        throw new Error(
          `Channel destination currency mismatch: ${channel.destinationCurrency} vs ${goal.currency}`,
        )
      }

      let monthlyCommitment: Money | undefined
      let allocatedBaseAmount: Money | undefined
      let allocatedDestinationAmount: Money | undefined

      if (snapshot.monthlyCommitmentAmount !== null && snapshot.monthlyCommitmentAmount !== undefined) {
        monthlyCommitment = createMoney(snapshot.monthlyCommitmentAmount, snapshot.baseCurrency)
        const factor = new BigNumber(alloc.percentage).dividedBy(100).toString()
        allocatedBaseAmount = multiplyMoneyByFactor(monthlyCommitment, factor)
        allocatedDestinationAmount = convertCommitmentToDestination(
          allocatedBaseAmount,
          channel.destinationCurrency,
        )

        if (allocatedBaseAmount.currency !== allocatedDestinationAmount.currency) {
          usesPlanningRate = true
        }
      }

      funding.push({
        channelId: channel.id,
        fundingMethod: channel.fundingMethod,
        destinationCurrency: channel.destinationCurrency,
        percentage: alloc.percentage,
        commitmentStatus: snapshot.commitmentStatus as 'active' | 'paused',
        monthlyCommitment,
        allocatedBaseAmount,
        allocatedDestinationAmount,
        effectiveMonth: snapshot.effectiveMonth,
      })
    }

    // Enabled funding methods visibility
    const saveEnabled =
      goal.saveEnabled ?? (goalSavings.length > 0 || funding.some((f) => f.fundingMethod === 'save'))
    const investEnabled =
      goal.investEnabled ?? (goalInvestments.length > 0 || funding.some((f) => f.fundingMethod === 'invest'))

    const enabledMethods: FundingMethod[] = []
    if (saveEnabled) enabledMethods.push('save')
    if (investEnabled) enabledMethods.push('invest')

    for (const method of enabledMethods) {
      const hasMethodRow = funding.some((f) => f.fundingMethod === method)
      if (!hasMethodRow) {
        const compatibleChannels = rows.channels.filter(
          (c) => c.fundingMethod === method && c.destinationCurrency === goal.currency,
        )
        for (const channel of compatibleChannels) {
          if (!funding.some((f) => f.channelId === channel.id)) {
            const snapshot = rows.snapshots.find((s) => s.channelId === channel.id)
            funding.push({
              channelId: channel.id,
              fundingMethod: channel.fundingMethod,
              destinationCurrency: channel.destinationCurrency,
              percentage: '0',
              commitmentStatus: (snapshot?.commitmentStatus ?? 'active') as 'active' | 'paused',
              effectiveMonth: snapshot?.effectiveMonth ?? currentMonth,
            })
          }
        }
      }
    }

    // 6. Projection
    const projection = deriveGoalProjection({
      status: goal.status,
      targetAmount,
      actualValue,
      savingsValue,
      investmentValue,
      annualReturnRate,
      funding,
      currentMonth,
    })

    // 7. desiredDateDeltaMonths
    let desiredDateDeltaMonths: number | undefined
    if (goal.desiredDate && projection.status === 'available') {
      const [compYear, compMonth] = projection.completionMonth.split('-').map(Number)
      const [desiredYear, desiredMonth] = goal.desiredDate.slice(0, 7).split('-').map(Number)
      desiredDateDeltaMonths = compYear * 12 + compMonth - (desiredYear * 12 + desiredMonth)
    }

    return {
      id: goal.id,
      name: goal.name,
      type: goal.type,
      currency: goal.currency,
      priority: goal.priority,
      status: goal.status,
      createdAt: goal.createdAt,
      desiredDate: goal.desiredDate ?? undefined,
      completedAt: goal.completedAt ?? undefined,
      targetAmount,
      savingsValue,
      investmentValue,
      actualValue,
      progressPercentage,
      funding,
      projection,
      desiredDateDeltaMonths,
      annualReturnRate,
      availability,
      availableFrom,
      usesPlanningRate,
      saveEnabled,
      investEnabled,
    }
  })

  return {
    groups: groupGoals(goalItems),
  }
}
